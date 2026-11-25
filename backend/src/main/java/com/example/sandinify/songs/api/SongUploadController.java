package com.example.sandinify.songs.api;

import com.example.sandinify.songs.Song;
import com.example.sandinify.songs.SongRepository;
import com.example.sandinify.songs.SongStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@CrossOrigin(origins = "${app.cors.allowed-origin}")
public class SongUploadController {
    private static final Logger logger = LoggerFactory.getLogger(SongUploadController.class);
    private static final Pattern PROCESSED_ASSET_PATH = Pattern.compile(
            "(?:master\\.m3u8|(?:96k|160k|320k)/(?:index\\.m3u8|chunk_\\d+\\.ts))");

    private final S3StorageService s3StorageService;
    private final SongRepository songRepository;
    private final AnalysisQueue analysisQueue;

    public SongUploadController(S3StorageService s3StorageService,
                                SongRepository songRepository,
                                AnalysisQueue analysisQueue) {
        this.s3StorageService = s3StorageService;
        this.songRepository = songRepository;
        this.analysisQueue = analysisQueue;
    }

    public record UploadResponse(String message, Long songId, String status) {}
    public record SongResponse(
            Long id,
            String title,
            String artistName,
            String genre,
            String mood,
            String tags,
            String description,
            String status,
            String manifestUrl,
            Instant createdAt) {}

    @GetMapping("/api/songs")
    public List<SongResponse> getSongs() {
        return songRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(song -> new SongResponse(
                        song.getId(),
                        song.getTitle(),
                        song.getArtistName(),
                        song.getGenre(),
                        song.getMood(),
                        song.getTags(),
                        song.getDescription(),
                        song.getStatus().name(),
                        song.getStatus() == SongStatus.READY
                                && song.getManifestUrl() != null
                                ? "/api/songs/" + song.getId() + "/hls/master.m3u8"
                                : null,
                        song.getCreatedAt()))
                .toList();
    }

    @GetMapping("/api/songs/{songId}/hls/{*assetPath}")
    public ResponseEntity<StreamingResponseBody> streamProcessedAsset(
            @PathVariable Long songId,
            @PathVariable String assetPath) {
        String relativePath = assetPath.startsWith("/")
                ? assetPath.substring(1)
                : assetPath;
        if (songId <= 0 || !PROCESSED_ASSET_PATH.matcher(relativePath).matches()) {
            return ResponseEntity.badRequest().build();
        }

        String key = "processed/" + songId + "/" + relativePath;
        try {
            ResponseInputStream<GetObjectResponse> object =
                    s3StorageService.getProcessedObject(key);
            long contentLength = object.response().contentLength();
            MediaType contentType = relativePath.endsWith(".m3u8")
                    ? MediaType.parseMediaType("application/vnd.apple.mpegurl")
                    : MediaType.parseMediaType("video/mp2t");
            StreamingResponseBody body = outputStream -> {
                try (object) {
                    object.transferTo(outputStream);
                }
            };
            return ResponseEntity.ok()
                    .contentType(contentType)
                    .contentLength(contentLength)
                    .body(body);
        } catch (S3Exception error) {
            if (error.statusCode() == HttpStatus.NOT_FOUND.value()) {
                return ResponseEntity.notFound().build();
            }
            logger.error("Could not read processed audio object {}", key, error);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    @PostMapping(
            path = {"/api/songs/upload", "/api/v1/tracks"},
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadResponse> uploadSong(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam("username") String username,
            @RequestParam(value = "genre", required = false) String genre,
            @RequestParam(value = "mood", required = false) String mood,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "description", required = false) String description) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Choose a song file.", null, null));
        }
        if (name.isBlank() || name.length() > 200) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Song name is required and must be 200 characters or fewer.", null, null));
        }
        if (username.isBlank() || username.length() > 200) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Artist name is required and must be 200 characters or fewer.", null, null));
        }
        if (genre != null && genre.length() > 100) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Genre must be 100 characters or fewer.", null, null));
        }
        if (mood != null && mood.length() > 100) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Mood must be 100 characters or fewer.", null, null));
        }

        try {
            Song song = new Song(name, username, "pending/" + UUID.randomUUID());
            song.setGenre(normalizeOptionalText(genre));
            song.setMood(normalizeOptionalText(mood));
            song.setTags(normalizeOptionalText(tags));
            song.setDescription(normalizeOptionalText(description));
            song = songRepository.saveAndFlush(song);
            String s3Key;
            try {
                s3Key = s3StorageService.uploadAudioFile(file, song.getId());
            } catch (Exception e) {
                songRepository.delete(song);
                throw e;
            }
            song.setS3Key(s3Key);
            songRepository.save(song);

            try {
                analysisQueue.publish(song.getId(), s3Key);
            } catch (Exception e) {
                logger.error("Could not enqueue song {}", song.getId(), e);
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(new UploadResponse(
                                "Song uploaded, but transcoding could not be queued.",
                                song.getId(),
                                song.getStatus().name()));
            }

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new UploadResponse("Song uploaded. Transcoding queued.",
                            song.getId(), song.getStatus().name()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new UploadResponse("Failed to upload song: " + e.getMessage(), null, null));
        }
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}