// songs/api/AnalysisQueue.java
package com.example.sandinify.songs.api;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

@Service
public class AnalysisQueue {

    public static final String QUEUE_KEY = "queue:song-analysis";

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;

    public AnalysisQueue(StringRedisTemplate redis, ObjectMapper mapper) {
        this.redis = redis;
        this.mapper = mapper;
    }

    public void publish(Long songId, String s3Key) {
        String job = mapper.writeValueAsString(Map.of("song_id", songId, "s3_key", s3Key));
        redis.opsForList().leftPush(QUEUE_KEY, job);   // LPUSH
    }
}