package com.example.sandinify.songs.api;

import com.example.sandinify.songs.Song;
import com.example.sandinify.songs.SongRepository;
import com.example.sandinify.songs.SongStatus;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SongUploadControllerTest {

    @Test
    void acceptsArtistNameDifferentFromUploaderUsername() throws Exception {
        S3StorageService storageService = mock(S3StorageService.class);
        SongRepository songRepository = mock(SongRepository.class);
        AnalysisQueue analysisQueue = mock(AnalysisQueue.class);
        SongUploadController controller =
                new SongUploadController(storageService, songRepository, analysisQueue);

        MockMultipartFile file = new MockMultipartFile(
                "file", "song.mp3", "audio/mpeg", new byte[]{1, 2, 3});
        String s3Key = "songs/abc.mp3";
        when(storageService.uploadAudioFile(file)).thenReturn(s3Key);

        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> {
            Song savedSong = invocation.getArgument(0);
            ReflectionTestUtils.setField(savedSong, "id", 42L);
            return savedSong;
        });

        var response = controller.uploadSong(file, "Song title", "Stage name");

        assertEquals(201, response.getStatusCode().value());
        assertEquals(42L, response.getBody().songId());
        assertEquals("PENDING", response.getBody().status());

        var order = inOrder(storageService, songRepository, analysisQueue);
        order.verify(storageService).uploadAudioFile(file);
        order.verify(songRepository).save(argThat(song ->
                song.getTitle().equals("Song title")
                        && song.getArtistName().equals("Stage name")
                        && song.getS3Key().equals(s3Key)
                        && song.getStatus() == SongStatus.PENDING));
        order.verify(analysisQueue).publish(42L, s3Key);
    }
}
