$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repositoryRoot 'backend\.env'
$manifest = Join-Path $PSScriptRoot 'kind-workloads.yaml'
$namespace = 'sandinify'
$dbSecretName = 'sandinify-db-secrets'
$appSecretName = 'sandinify-app-secrets'
$workerImage = 'sandinify-transcoding-worker:kind'
$currentContext = & kubectl config current-context
if ($LASTEXITCODE -ne 0 -or $currentContext -notmatch '^kind-(?<cluster>.+)$') {
    throw 'The current kubectl context must target a Kind cluster.'
}
$kindClusterName = $matches['cluster']

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Required environment file not found: $envFile"
}

$dbKeys = @('DB_PASSWORD')
$appKeys = @(
    'JWT_SECRET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_BUCKET_NAME'
)
$requiredKeys = $dbKeys + $appKeys
$dbEnvLines = [System.Collections.Generic.List[string]]::new()
$appEnvLines = [System.Collections.Generic.List[string]]::new()
$foundKeys = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
)

foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=') {
        $key = $matches[1]
        if ($key -in $dbKeys) {
            $dbEnvLines.Add($line)
            [void]$foundKeys.Add($key)
        } elseif ($key -in $appKeys) {
            $appEnvLines.Add($line)
            [void]$foundKeys.Add($key)
        }
    }
}

$missingKeys = $requiredKeys | Where-Object { -not $foundKeys.Contains($_) }
if ($missingKeys) {
    throw "The environment file is missing required keys: $($missingKeys -join ', ')"
}

$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) (
    'sandinify-k8s-' + [guid]::NewGuid().ToString('N')
)
$null = New-Item -ItemType Directory -Path $tempDirectory
try {
    $currentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $directoryAcl = Get-Acl -LiteralPath $tempDirectory
    $directoryAcl.SetAccessRuleProtection($true, $false)
    $privateRule = [System.Security.AccessControl.FileSystemAccessRule]::new(
        $currentSid,
        [System.Security.AccessControl.FileSystemRights]::FullControl,
        [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit',
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow
    )
    $directoryAcl.SetAccessRule($privateRule)
    Set-Acl -LiteralPath $tempDirectory -AclObject $directoryAcl

    $encoding = [System.Text.UTF8Encoding]::new($false)
    $dbEnvFile = Join-Path $tempDirectory 'db.env'
    $appEnvFile = Join-Path $tempDirectory 'app.env'
    [System.IO.File]::WriteAllLines($dbEnvFile, $dbEnvLines, $encoding)
    [System.IO.File]::WriteAllLines($appEnvFile, $appEnvLines, $encoding)

    $namespaceManifest = & kubectl create namespace $namespace --dry-run=client -o yaml
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to prepare the Kubernetes namespace.'
    }
    $namespaceManifest | & kubectl apply -f -
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to create the Kubernetes namespace.'
    }

    $secretDefinitions = @(
        @{ Name = $dbSecretName; EnvFile = $dbEnvFile },
        @{ Name = $appSecretName; EnvFile = $appEnvFile }
    )
    foreach ($secretDefinition in $secretDefinitions) {
        $secretManifest = & kubectl create secret generic $secretDefinition.Name `
            --namespace $namespace `
            "--from-env-file=$($secretDefinition.EnvFile)" `
            --dry-run=client `
            -o yaml
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to prepare Secret '$($secretDefinition.Name)'."
        }
        $secretManifest | & kubectl apply -f -
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create or update Secret '$($secretDefinition.Name)'."
        }
    }

    $workerContext = Join-Path $repositoryRoot 'backend\transcoding_worker'
    & docker build -t $workerImage $workerContext
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to build the transcoding worker image.'
    }

    & kind load docker-image $workerImage "--name=$kindClusterName"
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to load the transcoding worker image into Kind.'
    }

    & kubectl apply -f $manifest
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to apply the Kubernetes workload manifest.'
    }

    & kubectl rollout status deployment/postgres -n $namespace --timeout=180s
    if ($LASTEXITCODE -ne 0) {
        throw 'Postgres did not become ready.'
    }

    $passwordBase64 = & kubectl get secret $dbSecretName -n $namespace `
        -o 'jsonpath={.data.DB_PASSWORD}'
    if ($LASTEXITCODE -ne 0 -or -not $passwordBase64) {
        throw 'Failed to retrieve the database password from its Kubernetes Secret.'
    }
    $password = [System.Text.Encoding]::UTF8.GetString(
        [Convert]::FromBase64String($passwordBase64)
    )
    $quotedPassword = $password.Replace("'", "''")
    $sql = "ALTER ROLE postgres WITH PASSWORD '$quotedPassword';"
    $sql | & kubectl exec -i -n $namespace deployment/postgres -- `
        psql -X -h /var/run/postgresql -U postgres -d postgres -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to synchronize the Postgres role password over its local socket.'
    }

    & kubectl rollout status deployment/redis -n $namespace --timeout=180s
    if ($LASTEXITCODE -ne 0) {
        throw 'Redis did not become ready.'
    }

    & kubectl rollout restart deployment/transcoding-worker -n $namespace
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to restart the transcoding worker with the current image.'
    }
    & kubectl rollout status deployment/transcoding-worker -n $namespace --timeout=240s
    if ($LASTEXITCODE -ne 0) {
        throw 'The transcoding worker deployment did not become ready.'
    }

    & kubectl rollout status deployment/jaeger -n $namespace --timeout=180s
    if ($LASTEXITCODE -ne 0) {
        throw 'Jaeger did not become ready.'
    }

    & kubectl rollout restart deployment/sandinify -n $namespace
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to restart the app with the updated Secret.'
    }
    & kubectl rollout status deployment/sandinify -n $namespace --timeout=240s
    if ($LASTEXITCODE -ne 0) {
        throw 'The app deployment did not become ready.'
    }

    & kubectl get pods,services -n $namespace
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to verify the deployed Kubernetes resources.'
    }

    & kubectl delete secret sandinify-secrets -n $namespace --ignore-not-found
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to remove the obsolete combined Secret.'
    }
} finally {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force
}
