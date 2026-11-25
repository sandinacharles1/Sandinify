import json
import logging
import os
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path


QUEUE_KEY = "queue:song-analysis"
PROCESSING_QUEUE_KEY = "queue:song-analysis:processing"
DEAD_LETTER_QUEUE_KEY = "queue:song-analysis:dead"
Tier = tuple[str, str, int]
TIERS: tuple[Tier, ...] = (
    ("96k", "96k", 96000),
    ("160k", "160k", 160000),
    ("320k", "320k", 320000),
)

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("transcoding-worker")


@dataclass(frozen=True)
class Settings:
    redis_url: str
    database_host: str
    database_name: str
    database_user: str
    database_password: str
    bucket_name: str
    aws_region: str
    public_base_url: str


def build_master_playlist(tiers: tuple[Tier, ...] = TIERS) -> str:
    lines = ["#EXTM3U", "#EXT-X-VERSION:3"]
    for folder, _, bandwidth in tiers:
        lines.extend(
            [
                f"#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},CODECS=\"mp4a.40.34\"",
                f"{folder}/index.m3u8",
            ]
        )
    return "\n".join(lines) + "\n"


def get_source_bitrate_kbps(source: Path) -> int:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,bit_rate:format=bit_rate",
            "-of",
            "json",
            str(source),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr[-1000:]}")

    try:
        info = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError("ffprobe returned invalid metadata.") from error

    audio_stream = next(
        (
            stream
            for stream in info.get("streams", [])
            if stream.get("codec_type") == "audio"
        ),
        None,
    )
    if audio_stream is None:
        raise ValueError("The uploaded file does not contain an audio stream.")

    format_info = info.get("format") or {}
    raw_bps = audio_stream.get("bit_rate") or format_info.get("bit_rate")
    try:
        bitrate_kbps = int(raw_bps) // 1000
    except (TypeError, ValueError):
        bitrate_kbps = int(TIERS[-1][1].removesuffix("k"))
        logger.warning(
            "Could not determine source bitrate for %s; using the highest tier",
            source.name,
        )
    return bitrate_kbps


def select_tiers(source_bitrate_kbps: int) -> tuple[Tier, ...]:
    eligible_tiers = tuple(
        tier
        for tier in TIERS
        if int(tier[1].removesuffix("k")) <= source_bitrate_kbps
    )
    return eligible_tiers or (TIERS[0],)


def content_type_for(path: Path) -> str:
    if path.suffix == ".m3u8":
        return "application/vnd.apple.mpegurl"
    if path.suffix == ".ts":
        return "video/mp2t"
    raise ValueError(f"Unsupported transcoded output file: {path.name}")


def output_key(song_id: int, relative_path: Path) -> str:
    return f"processed/{song_id}/{relative_path.as_posix()}"


def database_connection(settings: Settings):
    import psycopg

    return psycopg.connect(
        host=settings.database_host,
        dbname=settings.database_name,
        user=settings.database_user,
        password=settings.database_password,
    )


def set_processing(settings: Settings, song_id: int) -> bool:
    with database_connection(settings) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT status FROM songs WHERE id = %s", (song_id,))
            row = cursor.fetchone()
            if row is None:
                raise ValueError(f"Song {song_id} does not exist")
            if row[0] == "READY":
                return False
            cursor.execute(
                """
                UPDATE songs
                SET status = 'PROCESSING', manifest_url = NULL, failure_reason = NULL
                WHERE id = %s
                """,
                (song_id,),
            )
    return True


def set_ready(settings: Settings, song_id: int, manifest_url: str) -> None:
    with database_connection(settings) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE songs
                SET status = 'READY', manifest_url = %s, failure_reason = NULL
                WHERE id = %s
                """,
                (manifest_url, song_id),
            )
            if cursor.rowcount != 1:
                raise ValueError(f"Could not mark song {song_id} READY")


def set_failed(settings: Settings, song_id: int, error: Exception) -> None:
    with database_connection(settings) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE songs
                SET status = 'FAILED', failure_reason = %s
                WHERE id = %s
                """,
                (str(error)[:500], song_id),
            )
            if cursor.rowcount != 1:
                raise ValueError(f"Could not mark song {song_id} FAILED")


def transcode(source: Path, output_dir: Path) -> None:
    source_bitrate_kbps = get_source_bitrate_kbps(source)
    tiers = select_tiers(source_bitrate_kbps)
    logger.info(
        "Source bitrate is approximately %s kbps; generating %s",
        source_bitrate_kbps,
        ", ".join(tier[0] for tier in tiers),
    )
    for folder, bitrate, _ in tiers:
        tier_dir = output_dir / folder
        tier_dir.mkdir(parents=True, exist_ok=True)
        command = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-vn",
            "-c:a",
            "libmp3lame",
            "-b:a",
            bitrate,
            "-ar",
            "44100",
            "-f",
            "hls",
            "-hls_time",
            "4",
            "-hls_list_size",
            "0",
            "-hls_playlist_type",
            "vod",
            "-hls_segment_type",
            "mpegts",
            "-hls_flags",
            "independent_segments",
            "-hls_segment_filename",
            str(tier_dir / "chunk_%03d.ts"),
            str(tier_dir / "index.m3u8"),
        ]
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            raise RuntimeError(
                f"FFmpeg failed for {folder}: {result.stderr[-1000:]}"
            )

    (output_dir / "master.m3u8").write_text(
        build_master_playlist(tiers), encoding="utf-8"
    )


def upload_outputs(s3_client, bucket_name: str, song_id: int, output_dir: Path) -> None:
    for path in sorted(output_dir.rglob("*")):
        if not path.is_file():
            continue
        relative_path = path.relative_to(output_dir)
        s3_client.upload_file(
            str(path),
            bucket_name,
            output_key(song_id, relative_path),
            ExtraArgs={
                "ContentType": content_type_for(path),
            },
        )


def manifest_url(settings: Settings, song_id: int) -> str:
    return f"{settings.public_base_url.rstrip('/')}/processed/{song_id}/master.m3u8"


def process_job(job: dict, settings: Settings, s3_client) -> None:
    song_id = job.get("song_id")
    source_key = job.get("s3_key")
    if not isinstance(song_id, int) or song_id <= 0 or not isinstance(source_key, str):
        raise ValueError("Queue job must contain a positive song_id and s3_key")

    if not set_processing(settings, song_id):
        logger.info("Song %s is already READY; skipping duplicate job", song_id)
        return

    try:
        with tempfile.TemporaryDirectory(prefix=f"song-{song_id}-") as temp_dir:
            work_dir = Path(temp_dir)
            source = work_dir / "original"
            output_dir = work_dir / "processed"
            output_dir.mkdir()
            s3_client.download_file(settings.bucket_name, source_key, str(source))
            transcode(source, output_dir)
            upload_outputs(s3_client, settings.bucket_name, song_id, output_dir)
        set_ready(settings, song_id, manifest_url(settings, song_id))
        logger.info("Song %s transcoding completed", song_id)
    except Exception as error:
        set_failed(settings, song_id, error)
        logger.exception("Song %s transcoding failed", song_id)


def load_settings() -> Settings:
    bucket_name = os.environ["AWS_BUCKET_NAME"]
    aws_region = os.environ["AWS_REGION"]
    public_base_url = os.getenv("S3_PUBLIC_BASE_URL")
    if not public_base_url:
        public_base_url = f"https://{bucket_name}.s3.{aws_region}.amazonaws.com"
    return Settings(
        redis_url=os.getenv("REDIS_URL", "redis://redis:6379/0"),
        database_host=os.getenv("DATABASE_HOST", "postgres"),
        database_name=os.getenv("DATABASE_NAME", "sandinify"),
        database_user=os.getenv("DATABASE_USER", "postgres"),
        database_password=os.environ["DATABASE_PASSWORD"],
        bucket_name=bucket_name,
        aws_region=aws_region,
        public_base_url=public_base_url,
    )


def run_worker(redis_client, s3_client, settings: Settings) -> None:
    while True:
        raw_job = redis_client.brpoplpush(QUEUE_KEY, PROCESSING_QUEUE_KEY, timeout=5)
        if raw_job is None:
            continue
        try:
            job = json.loads(raw_job)
            if not isinstance(job, dict):
                raise TypeError("Queue job must be a JSON object")
            song_id = job.get("song_id")
            source_key = job.get("s3_key")
            if (
                type(song_id) is not int
                or song_id <= 0
                or not isinstance(source_key, str)
                or not source_key.strip()
            ):
                raise ValueError("Queue job must contain a positive song_id and s3_key")
        except (json.JSONDecodeError, TypeError, ValueError) as error:
            logger.error("Discarding invalid queue job: %s", error)
            redis_client.lpush(DEAD_LETTER_QUEUE_KEY, raw_job)
            redis_client.lrem(PROCESSING_QUEUE_KEY, 1, raw_job)
            continue
        try:
            process_job(job, settings, s3_client)
        except ValueError as error:
            logger.error("Moving unprocessable job to dead-letter queue: %s", error)
            redis_client.lpush(DEAD_LETTER_QUEUE_KEY, raw_job)
            redis_client.lrem(PROCESSING_QUEUE_KEY, 1, raw_job)
            continue
        except Exception:
            logger.exception("Could not process queue job")
            continue
        redis_client.lrem(PROCESSING_QUEUE_KEY, 1, raw_job)


def recover_in_flight_jobs(redis_client) -> None:
    while redis_client.execute_command(
        "RPOPLPUSH", PROCESSING_QUEUE_KEY, QUEUE_KEY
    ):
        logger.warning("Requeued an unfinished transcoding job")


def main() -> None:
    import boto3
    import redis

    settings = load_settings()
    redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    s3_client = boto3.client("s3", region_name=settings.aws_region)
    recover_in_flight_jobs(redis_client)
    run_worker(redis_client, s3_client, settings)


if __name__ == "__main__":
    main()
