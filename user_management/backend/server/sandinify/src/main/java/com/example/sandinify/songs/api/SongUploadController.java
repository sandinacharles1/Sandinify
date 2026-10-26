package com.example.sandinify.songs.api;
import com.example.sandinify.songs.api.S3StorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Entry point for song-data API requests.
 *
 * This is a planning scaffold: only request validation is implemented so far.
 * Database persistence, object storage, and song analysis are TODO stages below.
 */
@RestController
@RequestMapping("/api/songs")
@CrossOrigin(origins = "http://localhost:5173")
public class SongUploadController {
    private final S3StorageService s3StorageService;

    // Inject S3StorageService via constructor dependency injection
    public SongUploadController(S3StorageService s3StorageService) {
        this.s3StorageService = s3StorageService;
    }

    public record UploadResponse(String message, String fileUrl) {}

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadResponse> uploadSong(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam("username") String username) {

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

        try {
            String fileUrl = s3StorageService.uploadAudioFile(file);
            // TODO: AUDIO ANALYSIS TO GET GENRE, MOOD, AND TAGS
            // TODO: DATABASE STAGE - Save title, username, and fileUrl to PostgreSQL via a SongRepository: songRepository.save(new Song(name, username, fileUrl));
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new UploadResponse("Song uploaded successfully to AWS S3!", fileUrl));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new UploadResponse("Failed to upload song to storage: " + e.getMessage(), null));
        }
    }

    /*
     ! DATABASE STAGE (planned)
     *
     * Add a service method conceptually like:
     *
     * private Song saveSongToDatabase(
     *         String name,
     *         String username,
     *         String objectStorageKey) {
     *     // TODO: create a Song entity and save it with songRepository.save(song).
     * }
     *
     * Possible database-stage HTTP results from the endpoint:
     * - 201 Created: the object was stored and its song row was saved.
     * - 400 Bad Request: required song details are missing or invalid.
     * - 401 Unauthorized: the request has no valid login token (handled by JwtAuthFilter).
     * - 403 Forbidden: the submitted username does not match the signed-in user.
     * - 409 Conflict: an application rule prevents saving a duplicate song.
     * - 500 Internal Server Error: PostgreSQL could not save the row.
     *
     * JPA means Jakarta Persistence API. Hibernate is the JPA implementation
     * already used by this project. A future entity could look like:
     *
     * // import jakarta.persistence.Column;
     * // import jakarta.persistence.Entity;
     * // import jakarta.persistence.GeneratedValue;
     * // import jakarta.persistence.GenerationType;
     * // import jakarta.persistence.Id;
     * // import jakarta.persistence.Table;
     *
     * @Entity
     * @Table(name = "songs")
     * class Song {
     *     @Id
     *     @GeneratedValue(strategy = GenerationType.IDENTITY)
     *     private Long id;
     *
     *     @Column(nullable = false)
     *     private String name;
     *
     *     @Column(nullable = false)
     *     private String username;
     *
     *     @Column(name = "object_storage_key", nullable = false)
     *     private String objectStorageKey;
     *
     *     private Integer durationSeconds;
     *     private String genre;
     *     private String mood;
     *     private String tags;
     * }
     *
     * A Spring Data JPA repository can be declared as:
     *
     * // import org.springframework.data.jpa.repository.JpaRepository;
     *
     * interface SongRepository extends JpaRepository<Song, Long> {}
     *
     * The entity describes the table mapping in Java, but this project uses
     * spring.jpa.hibernate.ddl-auto=validate. That setting only checks the
     * schema; it does not create the table. Add a database migration before
     * enabling repository persistence.
     */

    /*
     ! OBJECT-STORAGE STAGE (planned)
     *
     * Add a service method conceptually like:
     *
     * private String uploadSongToObjectStorage(MultipartFile file) {
     *     // TODO: upload the file using the selected provider's SDK.
     *     // Return the provider's object key, not the audio bytes or a public URL.
     * }
     *
     * Possible object-storage-stage HTTP results from the endpoint:
     * - 413 Payload Too Large: the song exceeds the configured size limit.
     * - 415 Unsupported Media Type: the file is not an accepted audio format.
     * - 502 Bad Gateway: the storage provider returned an unexpected failure.
     * - 503 Service Unavailable: storage is not configured or temporarily unavailable.
     * - 201 Created: storage and database stages both succeeded.
     */

    /*
     ! FUTURE AUDIO-ANALYSIS STAGE 
     *
     * The genre, mood, and tags analyzer may be written in Python. Java cannot
     * directly import a .py module as a normal Java class. A common approach is
     * to run the analyzer as a separate service/worker and call it over HTTP or
     * enqueue an analysis job after the song has been stored.
     *
     * TODO: integrate the Python analyzer and save its genre, mood, and tag
     * results to the song row. Keep analysis failure separate from upload
     * success if analysis is asynchronous.
     */
}
