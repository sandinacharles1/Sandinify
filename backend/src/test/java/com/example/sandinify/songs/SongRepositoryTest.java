package com.example.sandinify.songs;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class SongRepositoryTest {

    @Autowired
    private SongRepository songRepository;

    @Test
    void savesSongAndReadsItBackFromDatabase() {
        Song song = new Song("Song title", "Stage name", "songs/abc.mp3");
        song.setGenre("Indie");
        song.setMood("Dreamy");
        song.setTags("guitar, mellow");
        song.setDescription("A gentle acoustic song.");
        song.setManifestUrl("https://cdn.example.com/processed/42/master.m3u8");
        song = songRepository.saveAndFlush(song);

        Song storedSong = songRepository.findById(song.getId()).orElseThrow();

        assertEquals(song.getId(), storedSong.getId());
        assertEquals("Song title", storedSong.getTitle());
        assertEquals("Stage name", storedSong.getArtistName());
        assertEquals("songs/abc.mp3", storedSong.getS3Key());
        assertEquals("Indie", storedSong.getGenre());
        assertEquals("Dreamy", storedSong.getMood());
        assertEquals("guitar, mellow", storedSong.getTags());
        assertEquals("A gentle acoustic song.", storedSong.getDescription());
        assertEquals("https://cdn.example.com/processed/42/master.m3u8", storedSong.getManifestUrl());
        assertEquals(SongStatus.PENDING, storedSong.getStatus());
        assertNotNull(storedSong.getCreatedAt());
    }
}
