package com.example.sandinify.songs;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@DataJpaTest
class SongRepositoryTest {

    @Autowired
    private SongRepository songRepository;

    @Test
    void savesSongAndReadsItBackFromDatabase() {
        Song song = songRepository.saveAndFlush(
                new Song("Song title", "Stage name", "songs/abc.mp3"));

        Song storedSong = songRepository.findById(song.getId()).orElseThrow();

        assertEquals(song.getId(), storedSong.getId());
        assertEquals("Song title", storedSong.getTitle());
        assertEquals("Stage name", storedSong.getArtistName());
        assertEquals("songs/abc.mp3", storedSong.getS3Key());
        assertEquals(SongStatus.PENDING, storedSong.getStatus());
        assertNotNull(storedSong.getCreatedAt());
    }
}
