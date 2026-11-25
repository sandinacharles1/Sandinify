# Transcoding worker

The worker consumes `queue:song-analysis` from Redis. The Java producer adds jobs
with `LPUSH`; the worker uses `BRPOPLPUSH`, so the oldest queued job is handled
first and stays in a processing list until its database update completes.
Unfinished jobs are returned to the queue when the worker restarts.
Run one worker instance with this list-based recovery strategy; multiple
instances could reclaim each other's in-flight jobs.

For each job, the worker probes the original bitrate with `ffprobe`, then
creates MP3 HLS variants at or below that bitrate from the 96, 160, and 320
kbps ladder. It keeps a 96 kbps variant for sources below the ladder. Outputs
use 4-second MPEG-TS segments under `processed/<song_id>/`, and the master
playlist only references generated variants. The worker stores the root
`master.m3u8` URL and marks the song `READY`. Failed jobs are marked `FAILED`
with a failure reason.

Docker Compose and Kubernetes supply Redis, PostgreSQL, and S3 settings. The
worker uploads generated objects without ACLs, which supports buckets using
bucket-owner-enforced object ownership. Keep the bucket private: the application
serves playlists and segments through its authenticated HLS proxy, so browser
playback does not require public reads or S3 CORS configuration.
