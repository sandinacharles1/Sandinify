package com.example.sandinify;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Service;

import io.opentelemetry.instrumentation.annotations.WithSpan;

@Service 
public class PasswordService {
    private final Argon2PasswordEncoder encoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    
    @WithSpan("argon2.hash")
    public String hash(String password) { return encoder.encode(password); }

    @WithSpan("argon2.verify")
    public boolean matches(String password, String storedHash) { return encoder.matches(password, storedHash); }
}

