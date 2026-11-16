$ErrorActionPreference = 'Stop'

$namespace = 'nginx-ingress'
$version = 'v5.7.1'
$baseUrl = "https://raw.githubusercontent.com/nginx/kubernetes-ingress/$version"
$manifests = @(
    'deploy/crds.yaml',
    'deployments/common/ns-and-sa.yaml',
    'deployments/rbac/rbac.yaml',
    'deployments/common/nginx-config.yaml',
    'deployments/common/ingress-class.yaml',
    'deployments/deployment/nginx-ingress.yaml',
    'deployments/service/nodeport.yaml'
)

foreach ($manifest in $manifests) {
    & kubectl apply -f "$baseUrl/$manifest"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to apply the pinned NGINX Ingress manifest: $manifest"
    }
}

$kindNodePatch = '[{"op":"add","path":"/spec/template/spec/nodeSelector","value":{"ingress-ready":"true"}},{"op":"add","path":"/spec/template/spec/containers/0/ports/0/hostPort","value":80}]'
$patchFile = Join-Path ([System.IO.Path]::GetTempPath()) (
    'nginx-kind-patch-' + [guid]::NewGuid().ToString('N') + '.json'
)
[System.IO.File]::WriteAllText(
    $patchFile,
    $kindNodePatch,
    [System.Text.UTF8Encoding]::new($false)
)

try {
    & kubectl patch deployment nginx-ingress `
        --namespace $namespace `
        --type json `
        --patch-file $patchFile
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to configure NGINX Ingress for the kind node port mapping.'
    }
} finally {
    Remove-Item -LiteralPath $patchFile -Force
}

& kubectl rollout status deployment/nginx-ingress `
    --namespace $namespace `
    --timeout=240s
if ($LASTEXITCODE -ne 0) {
    throw 'NGINX Ingress did not become ready.'
}

& kubectl get pods,services -n $namespace
if ($LASTEXITCODE -ne 0) {
    throw 'Failed to verify NGINX Ingress resources.'
}
