package com.example.sandinify;

import org.springframework.stereotype.Service;

import io.opentelemetry.instrumentation.annotations.WithSpan;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository repo;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repo) {
        this.repo = repo;
    }
    // Makes a random token, saves only its HASH, returns the raw token for the client.
    @WithSpan ("RefreshTokenService.create")
    public String create(Long userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        repo.save(new RefreshToken(userId, hash(raw), Instant.now().plus(7, ChronoUnit.DAYS)));
        return raw;
    }

    // Hash what the client sent, find the row, make sure it's still usable.
    @WithSpan ("RefreshTokenService.validate")
    public Optional<RefreshToken> validate(String raw) {
        if (raw == null) return Optional.empty();
        return repo.findByTokenHash(hash(raw))
                .filter(t -> !t.isRevoked() && t.getExpiresAt().isAfter(Instant.now()));
    }

    // Logout: mark the row revoked.
    public void revoke(String raw) {
        if (raw == null) return;
        repo.findByTokenHash(hash(raw)).ifPresent(t -> {
            t.setRevoked(true);
            repo.save(t);
        });
    }

    @WithSpan ("RefreshTokenService.hash")
    private String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}