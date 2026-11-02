package com.example.sandinify.songs.api;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnalysisQueueTest {

    @Test
    void publishesSongIdAndStorageKeyToAnalysisRedisList() throws Exception {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ListOperations<String, String> listOperations = mock(ListOperations.class);
        ObjectMapper mapper = new ObjectMapper();
        when(redis.opsForList()).thenReturn(listOperations);

        new AnalysisQueue(redis, mapper).publish(42L, "songs/abc.mp3");

        var jobCaptor = forClass(String.class);
        verify(listOperations).leftPush(eq(AnalysisQueue.QUEUE_KEY), jobCaptor.capture());
        var job = mapper.readTree(jobCaptor.getValue());
        assertEquals(42L, job.get("song_id").asLong());
        assertEquals("songs/abc.mp3", job.get("s3_key").asString());
    }
}
