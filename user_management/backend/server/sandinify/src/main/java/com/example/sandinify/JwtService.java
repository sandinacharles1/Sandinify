package com.example.sandinify;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class JwtService {

    private final byte[] secret;

    public JwtService(@Value("${jwt.secret}") String secret) {
        this.secret = secret.getBytes();
    }

    // Makes the signed token. Expires in 15 minutes.
    public String createAccessToken(String username) throws Exception {
        Date now = new Date();
        Date expires = new Date(now.getTime() + 15 * 60 * 1000);

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(username)
                .issueTime(now)
                .expirationTime(expires)
                .build();

        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(secret));
        return jwt.serialize();
    }

    // Checks the token. Returns the username if valid, or null if not.
    public String verify(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!jwt.verify(new MACVerifier(secret))) return null;

            Date exp = jwt.getJWTClaimsSet().getExpirationTime();
            if (exp == null || exp.before(new Date())) return null;

            return jwt.getJWTClaimsSet().getSubject();
        } catch (Exception e) {
            return null;
        }
    }
}