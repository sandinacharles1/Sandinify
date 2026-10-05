package com.example.sandinify;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RateLimiterService {

    // The math written in LUA is token bucket. We talk to lua by using redis.execute. we use lua because it is faster and atomic, atomic means if multiple queries are sent at the same time, they will be executed in order and not interfere with each other. This is important because we want to make sure that racec conditions dont happem
    private static final String LUA = """
        local t = redis.call('TIME')
        local now = t[1] * 1000 + math.floor(t[2] / 1000)
        local capacity = tonumber(ARGV[1])
        local rate = tonumber(ARGV[2])

        local data = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
        local tokens = tonumber(data[1])
        local ts = tonumber(data[2])
        if tokens == nil then
            tokens = capacity
            ts = now
        end

        tokens = math.min(capacity, tokens + (now - ts) / 1000 * rate)

        local allowed = 0
        if tokens >= 1 then
            tokens = tokens - 1
            allowed = 1
        end

        redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
        redis.call('EXPIRE', KEYS[1], math.ceil(capacity / rate) + 10)
        return allowed
        """;

    private static final DefaultRedisScript<Long> SCRIPT =
            new DefaultRedisScript<>(LUA, Long.class);

    private final StringRedisTemplate redis;

    public RateLimiterService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public boolean tryTake(String key, int capacity, double refillPerSecond) {
        Long result = redis.execute(
                SCRIPT,
                List.of("bucket:" + key),
                String.valueOf(capacity),
                String.valueOf(refillPerSecond));
        return result != null && result == 1;
    }
}