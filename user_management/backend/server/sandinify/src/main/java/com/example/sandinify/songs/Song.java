package com.example.sandinify.songs;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "songs")
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "artist_name", nullable = false, length = 200)
    private String artistName;

    // S3 object key (e.g. "songs/<uuid>.mp3"), not a URL. Replaces s3_url.
    @Column(name = "s3_key", nullable = false, unique = true, length = 1024)
    private String s3Key;

    // ---- Processing state ----
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SongStatus status;

    // ---- Filled in ONLY by the worker (Java never writes these) ----
    @Column(length = 100)
    private String genre;

    @Column(length = 100)
    private String mood;

    @Column(columnDefinition = "text")
    private String tags;                   // comma-separated, e.g. "bass-heavy, slow, ambient"

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Song() {}

    public Song(String title, String artistName, String s3Key) {
        this.title = title;
        this.artistName = artistName;
        this.s3Key = s3Key;
        this.status = SongStatus.PENDING;  // every new song starts here
    }

    @PrePersist
    void setCreatedAt() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getArtistName() { return artistName; }
    public String getS3Key() { return s3Key; }
    public SongStatus getStatus() { return status; }
    public String getGenre() { return genre; }
    public String getMood() { return mood; }
    public String getTags() { return tags; }
    public String getFailureReason() { return failureReason; }
    public Instant getCreatedAt() { return createdAt; }
}