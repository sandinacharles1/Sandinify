package com.example.sandinify.songs.api;

import com.example.sandinify.songs.Song;
import com.example.sandinify.songs.SongRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/songs")
@CrossOrigin(origins = "http://localhost:5173")
public class SongUploadController {
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

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadResponse> uploadSong(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam("username") String username) {

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

        try {
            String s3Key = s3StorageService.uploadAudioFile(file);                      // Step 1: upload to S3, get key
            Song song = songRepository.save(new Song(name, username, s3Key));           // Step 2: insert row, status PENDING

            try {
                analysisQueue.publish(song.getId(), s3Key);                             // Step 3: publish job
            } catch (Exception e) {
                // Row is already saved as PENDING. A recovery job can re-enqueue it later.
                System.out.println("Could not enqueue song " + song.getId() + ": " + e.getMessage());
            }

            return ResponseEntity.status(HttpStatus.CREATED)                            // Step 4: 201 Created
                    .body(new UploadResponse("Song uploaded. Analysis queued.",
                            song.getId(), song.getStatus().name()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new UploadResponse("Failed to upload song: " + e.getMessage(), null, null));
        }
    }
}