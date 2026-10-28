package com.example.sandinify.songs.api;

import com.example.sandinify.songs.Song;
import com.example.sandinify.songs.SongRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.argThat;

class SongUploadControllerTest {

    @Test
    void acceptsArtistNameDifferentFromUploaderUsername() throws Exception {
        S3StorageService storageService = mock(S3StorageService.class);
        SongRepository songRepository = mock(SongRepository.class);
        SongUploadController controller = new SongUploadController(storageService, songRepository);
        MockMultipartFile file = new MockMultipartFile(
                "file", "song.mp3", "audio/mpeg", new byte[]{1, 2, 3});
        String s3Url = "https://bucket.s3.amazonaws.com/song.mp3";
        when(storageService.uploadAudioFile(file)).thenReturn(s3Url);

        var response = controller.uploadSong(file, "Song title", "Stage name", "Rock", "Upbeat", "guitar, live");

        assertEquals(201, response.getStatusCode().value());
        verify(storageService).uploadAudioFile(file);
        verify(songRepository).save(argThat(song ->
                song.getTitle().equals("Song title")
                        && song.getArtistName().equals("Stage name")
                        && song.getS3Url().equals(s3Url)
                        && song.getGenre().equals("Rock")
                        && song.getMood().equals("Upbeat")
                        && song.getTags().equals("guitar, live")));
    }
}
