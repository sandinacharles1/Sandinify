import tempfile
import unittest
from pathlib import Path
from unittest.mock import ANY, Mock, call, patch

from main import (
    PROCESSING_QUEUE_KEY,
    QUEUE_KEY,
    Settings,
    build_master_playlist,
    content_type_for,
    get_source_bitrate_kbps,
    output_key,
    recover_in_flight_jobs,
    run_worker,
    select_tiers,
    transcode,
    upload_outputs,
)


class StopWorker(Exception):
    pass


class SingleJobRedis:
    def __init__(self):
        self.calls = []
        self.next_job = '{"song_id":42,"s3_key":"raw/42/original.wav"}'

    def brpoplpush(self, source, destination, timeout):
        self.calls.append(("consume", source, destination, timeout))
        if self.next_job is None:
            raise StopWorker()
        job = self.next_job
        self.next_job = None
        return job

    def lrem(self, key, count, value):
        self.calls.append(("ack", key, count, value))


class TranscodingOutputTest(unittest.TestCase):
    def test_recovers_in_flight_jobs_to_the_main_queue(self):
        redis_client = Mock()
        redis_client.execute_command.side_effect = ["unfinished-job", None]

        recover_in_flight_jobs(redis_client)

        self.assertEqual(
            [
                call("RPOPLPUSH", PROCESSING_QUEUE_KEY, QUEUE_KEY),
                call("RPOPLPUSH", PROCESSING_QUEUE_KEY, QUEUE_KEY),
            ],
            redis_client.execute_command.call_args_list,
        )

    def test_master_playlist_uses_relative_tier_playlists(self):
        playlist = build_master_playlist()

        self.assertIn("BANDWIDTH=96000", playlist)
        self.assertIn("BANDWIDTH=160000", playlist)
        self.assertIn("BANDWIDTH=320000", playlist)
        self.assertIn('CODECS="mp4a.40.34"', playlist)
        self.assertIn("96k/index.m3u8", playlist)
        self.assertIn("160k/index.m3u8", playlist)
        self.assertIn("320k/index.m3u8", playlist)
        self.assertNotIn("https://", playlist)

    def test_selects_only_tiers_at_or_below_source_bitrate(self):
        self.assertEqual(["96k"], [tier[0] for tier in select_tiers(128)])
        self.assertEqual(
            ["96k", "160k"], [tier[0] for tier in select_tiers(192)]
        )
        self.assertEqual(
            ["96k", "160k", "320k"],
            [tier[0] for tier in select_tiers(1411)],
        )
        self.assertEqual(["96k"], [tier[0] for tier in select_tiers(64)])

    def test_uses_stream_bitrate_or_format_bitrate_from_ffprobe(self):
        stream_result = Mock(
            returncode=0,
            stdout='{"streams":[{"codec_type":"audio","bit_rate":"192000"}],'
            '"format":{"bit_rate":"200000"}}',
            stderr="",
        )
        with patch("main.subprocess.run", return_value=stream_result):
            self.assertEqual(192, get_source_bitrate_kbps(Path("stream.mp3")))

        format_result = Mock(
            returncode=0,
            stdout='{"streams":[{"codec_type":"audio"}],'
            '"format":{"bit_rate":"1411200"}}',
            stderr="",
        )
        with patch("main.subprocess.run", return_value=format_result):
            self.assertEqual(1411, get_source_bitrate_kbps(Path("lossless.wav")))

    def test_transcode_omits_tiers_above_the_source_bitrate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "source.mp3"
            source.touch()
            output_dir = Path(temp_dir) / "processed"
            with (
                patch("main.get_source_bitrate_kbps", return_value=128),
                patch("main.subprocess.run", return_value=Mock(returncode=0, stderr="")) as run,
            ):
                transcode(source, output_dir)

            self.assertEqual(1, run.call_count)
            self.assertIn("-c:a", run.call_args.args[0])
            self.assertIn("libmp3lame", run.call_args.args[0])
            playlist = (output_dir / "master.m3u8").read_text(encoding="utf-8")
            self.assertIn("96k/index.m3u8", playlist)
            self.assertNotIn("160k/index.m3u8", playlist)
            self.assertNotIn("320k/index.m3u8", playlist)
            self.assertTrue((output_dir / "96k").is_dir())
            self.assertFalse((output_dir / "160k").exists())

    def test_output_keys_are_scoped_by_song_id(self):
        self.assertEqual(
            "processed/42/96k/chunk_000.ts",
            output_key(42, Path("96k/chunk_000.ts")),
        )

    def test_manifest_and_chunk_mime_types(self):
        self.assertEqual(
            "application/vnd.apple.mpegurl", content_type_for(Path("index.m3u8"))
        )
        self.assertEqual("video/mp2t", content_type_for(Path("chunk_000.ts")))

    def test_rejects_unexpected_output_types(self):
        with self.assertRaises(ValueError):
            content_type_for(Path("unexpected.bin"))

    def test_uploads_outputs_without_acl_for_bucket_owner_enforced_buckets(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            (output_dir / "master.m3u8").write_text("#EXTM3U", encoding="utf-8")
            s3_client = Mock()

            upload_outputs(s3_client, "bucket", 42, output_dir)

            s3_client.upload_file.assert_called_once_with(
                str(output_dir / "master.m3u8"),
                "bucket",
                "processed/42/master.m3u8",
                ExtraArgs={"ContentType": "application/vnd.apple.mpegurl"},
            )

    def test_consumes_into_processing_list_and_acks_after_success(self):
        redis_client = SingleJobRedis()
        settings = Settings(
            redis_url="redis://localhost",
            database_host="localhost",
            database_name="test",
            database_user="test",
            database_password="test",
            bucket_name="bucket",
            aws_region="us-east-1",
            public_base_url="https://bucket.s3.us-east-1.amazonaws.com",
        )

        with patch("main.process_job") as process_job:
            with self.assertRaises(StopWorker):
                run_worker(redis_client, object(), settings)

        process_job.assert_called_once_with(
            {"song_id": 42, "s3_key": "raw/42/original.wav"},
            settings,
            ANY,
        )
        self.assertEqual(
            ("consume", QUEUE_KEY, PROCESSING_QUEUE_KEY, 5), redis_client.calls[0]
        )
        self.assertEqual(
            (
                "ack",
                PROCESSING_QUEUE_KEY,
                1,
                '{"song_id":42,"s3_key":"raw/42/original.wav"}',
            ),
            redis_client.calls[1],
        )


if __name__ == "__main__":
    unittest.main()
