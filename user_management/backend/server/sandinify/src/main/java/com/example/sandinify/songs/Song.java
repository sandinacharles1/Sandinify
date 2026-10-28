package com.example.sandinify.songs;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    @Column(name = "s3_url", nullable = false, unique = true, length = 2048)
    private String s3Url;

    @Column(length = 100)
    private String genre;

    @Column(length = 100)
    private String mood;

    @Column(columnDefinition = "text")
    private String tags;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Song() {}

    public Song(String title, String artistName, String s3Url, String genre, String mood, String tags) {
        this.title = title;
        this.artistName = artistName;
        this.s3Url = s3Url;
        this.genre = genre;
        this.mood = mood;
        this.tags = tags;
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
    public String getS3Url() { return s3Url; }
    public String getGenre() { return genre; }
    public String getMood() { return mood; }
    public String getTags() { return tags; }
    public Instant getCreatedAt() { return createdAt; }
}
