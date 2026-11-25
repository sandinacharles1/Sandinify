package com.example.sandinify.songs.api;

import com.example.sandinify.songs.Song;
import com.example.sandinify.songs.SongRepository;
import com.example.sandinify.songs.SongStatus;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

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
        String s3Key = "raw/42/original.mp3";

        when(songRepository.saveAndFlush(any(Song.class))).thenAnswer(invocation -> {
            Song savedSong = invocation.getArgument(0);
            ReflectionTestUtils.setField(savedSong, "id", 42L);
            return savedSong;
        });
        when(storageService.uploadAudioFile(file, 42L)).thenReturn(s3Key);
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = controller.uploadSong(
                file, "Song title", "Stage name", "Indie", "Dreamy", "guitar, mellow", "A gentle song.");

        assertEquals(201, response.getStatusCode().value());
        assertEquals(42L, response.getBody().songId());
        assertEquals("PENDING", response.getBody().status());

        var order = inOrder(storageService, songRepository, analysisQueue);
        order.verify(songRepository).saveAndFlush(argThat(song ->
                song.getTitle().equals("Song title")
                        && song.getArtistName().equals("Stage name")
                        && song.getGenre().equals("Indie")
                        && song.getMood().equals("Dreamy")
                        && song.getTags().equals("guitar, mellow")
                        && song.getDescription().equals("A gentle song.")
                        && song.getStatus() == SongStatus.PENDING));
        order.verify(storageService).uploadAudioFile(file, 42L);
        order.verify(songRepository).save(argThat(song ->
                song.getS3Key().equals(s3Key)));
        order.verify(analysisQueue).publish(42L, s3Key);
    }

    @Test
    void reportsQueueFailureInsteadOfReturningQueuedSuccess() throws Exception {
        S3StorageService storageService = mock(S3StorageService.class);
        SongRepository songRepository = mock(SongRepository.class);
        AnalysisQueue analysisQueue = mock(AnalysisQueue.class);
        SongUploadController controller =
                new SongUploadController(storageService, songRepository, analysisQueue);
        MockMultipartFile file = new MockMultipartFile(
                "file", "song.mp3", "audio/mpeg", new byte[]{1, 2, 3});
        Song song = new Song("Song title", "Stage name", "pending/42");
        ReflectionTestUtils.setField(song, "id", 42L);
        when(songRepository.saveAndFlush(any(Song.class))).thenReturn(song);
        when(storageService.uploadAudioFile(file, 42L)).thenReturn("raw/42/original.mp3");
        when(songRepository.save(any(Song.class))).thenReturn(song);
        doThrow(new RuntimeException("Redis unavailable"))
                .when(analysisQueue).publish(42L, "raw/42/original.mp3");

        var response = controller.uploadSong(
                file, "Song title", "Stage name", null, null, null, null);

        assertEquals(503, response.getStatusCode().value());
        assertEquals("PENDING", response.getBody().status());
        assertEquals(
                "Song uploaded, but transcoding could not be queued.",
                response.getBody().message());
    }

    @Test
    void listsSongsWithManualMetadataWithoutExposingStorageKeys() {
        S3StorageService storageService = mock(S3StorageService.class);
        SongRepository songRepository = mock(SongRepository.class);
        AnalysisQueue analysisQueue = mock(AnalysisQueue.class);
        SongUploadController controller =
                new SongUploadController(storageService, songRepository, analysisQueue);
        Song song = new Song("Song title", "Stage name", "private/raw/key.mp3");
        song.setGenre("Indie");
        song.setMood("Dreamy");
        song.setTags("guitar, mellow");
        song.setDescription("A gentle song.");
        when(songRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(song));

        var songs = controller.getSongs();

        assertEquals(1, songs.size());
        assertEquals("Song title", songs.get(0).title());
        assertEquals("Stage name", songs.get(0).artistName());
        assertEquals("Indie", songs.get(0).genre());
        assertEquals("Dreamy", songs.get(0).mood());
        assertEquals("guitar, mellow", songs.get(0).tags());
        assertEquals("A gentle song.", songs.get(0).description());
        assertNull(songs.get(0).manifestUrl());
    }

    @Test
    void exposesManifestUrlForReadySongs() {
        S3StorageService storageService = mock(S3StorageService.class);
        SongRepository songRepository = mock(SongRepository.class);
        AnalysisQueue analysisQueue = mock(AnalysisQueue.class);
        SongUploadController controller =
                new SongUploadController(storageService, songRepository, analysisQueue);
        Song song = new Song("Song title", "Stage name", "private/raw/key.mp3");
        ReflectionTestUtils.setField(song, "status", SongStatus.READY);
        ReflectionTestUtils.setField(song, "id", 42L);
        song.setManifestUrl("https://cdn.example.com/processed/42/master.m3u8");
        when(songRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(song));

        var songs = controller.getSongs();

        assertEquals("/api/songs/42/hls/master.m3u8",
                songs.get(0).manifestUrl());
    }

    @Test
    void streamsAnAllowedProcessedAssetFromS3() throws Exception {
        S3StorageService storageService = mock(S3StorageService.class);
        SongUploadController controller =
                new SongUploadController(storageService, mock(SongRepository.class), mock(AnalysisQueue.class));
        byte[] content = "#EXTM3U".getBytes();
        when(storageService.getProcessedObject("processed/42/96k/index.m3u8"))
                .thenReturn(new ResponseInputStream<>(
                        GetObjectResponse.builder().contentLength((long) content.length).build(),
                        new ByteArrayInputStream(content)));

        var response = controller.streamProcessedAsset(42L, "/96k/index.m3u8");
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ((StreamingResponseBody) response.getBody()).writeTo(output);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("application/vnd.apple.mpegurl", response.getHeaders().getContentType().toString());
        assertArrayEquals(content, output.toByteArray());
        verify(storageService).getProcessedObject("processed/42/96k/index.m3u8");
    }

    @Test
    void rejectsPathsOutsideTheProcessedHlsLayout() {
        S3StorageService storageService = mock(S3StorageService.class);
        SongUploadController controller =
                new SongUploadController(storageService, mock(SongRepository.class), mock(AnalysisQueue.class));

        var response = controller.streamProcessedAsset(42L, "/../../raw/42/original.mp3");

        assertEquals(400, response.getStatusCode().value());
        verifyNoInteractions(storageService);
    }
}
