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

    public SongUploadController(S3StorageService s3StorageService, SongRepository songRepository) {
        this.s3StorageService = s3StorageService;
        this.songRepository = songRepository;
    }

    public record UploadResponse(String message, String fileUrl) {}

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadResponse> uploadSong(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam("username") String username,
            @RequestParam(value = "genre", required = false) String genre,
            @RequestParam(value = "mood", required = false) String mood,
            @RequestParam(value = "tags", required = false) String tags) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Choose a song file.", null));
        }
        if (name.isBlank() || name.length() > 200) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Song name is required and must be 200 characters or fewer.", null));
        }
        if (username.isBlank() || username.length() > 200) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Artist name is required and must be 200 characters or fewer.", null));
        }
        if (genre != null && genre.length() > 100) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Genre must be 100 characters or fewer.", null));
        }
        if (mood != null && mood.length() > 100) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Mood must be 100 characters or fewer.", null));
        }
        if (tags != null && tags.length() > 5000) {
            return ResponseEntity.badRequest()
                    .body(new UploadResponse("Tags must be 5000 characters or fewer.", null));
        }

        try {
            String fileUrl = s3StorageService.uploadAudioFile(file);
            songRepository.save(new Song(name, username, fileUrl, genre, mood, tags));
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new UploadResponse("Song uploaded and metadata saved successfully!", fileUrl));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new UploadResponse("Failed to upload song or save its metadata: " + e.getMessage(), null));
        }
    }
}
