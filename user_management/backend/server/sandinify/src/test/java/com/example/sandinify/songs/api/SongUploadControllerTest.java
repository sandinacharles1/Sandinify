package com.example.sandinify.songs.api;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SongUploadControllerTest {

    @Test
    void acceptsArtistNameDifferentFromUploaderUsername() throws Exception {
        S3StorageService storageService = mock(S3StorageService.class);
        SongUploadController controller = new SongUploadController(storageService);
        MockMultipartFile file = new MockMultipartFile(
                "file", "song.mp3", "audio/mpeg", new byte[]{1, 2, 3});
        when(storageService.uploadAudioFile(file)).thenReturn("https://bucket.s3.amazonaws.com/song.mp3");

        var response = controller.uploadSong(file, "Song title", "Stage name");

        assertEquals(201, response.getStatusCode().value());
        verify(storageService).uploadAudioFile(file);
    }
}
