package com.example.sandinify;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final UserRepository userRepository;  //Functions to edit User.java database
    private final JwtService jwtService;  //Creates and verifies JWT tokens. Used for access tokens.
    private final RefreshTokenService refreshTokenService; //Creates and verifies refresh tokens. 
    private final PasswordService passwordService;
    
    //* Initalize the controller with the correct dependencies
    public AuthController(UserRepository userRepository,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService,
                          PasswordService passwordService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.passwordService = passwordService;
    } 

    //* Declare the request and response objects for the endpoints. These are simple records that hold the data we need. Record is what it sounds like, a record of data. It is immutable and has a constructor, getters, equals, hashCode, and toString methods automatically generated.
    public record AuthRequest(String username, String password) {}
    public record RefreshRequest(String refreshToken) {}
    public record MessageResponse(String message) {}
    public record LoginResponse(String message, String accessToken, String refreshToken) {}
    public record TokenResponse(String message, String accessToken) {}

    @PostMapping("/signup")
    public ResponseEntity<LoginResponse> signup(@RequestBody AuthRequest request) throws Exception {
        String username = request.username();
        String password = request.password();

        if (username == null || password == null || username.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(new LoginResponse("Username and password required", null, null));
        }
        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new LoginResponse("Username already taken", null, null));
        }

        User saved = userRepository.save(new User(username, passwordService.hash(password)));

        String accessToken = jwtService.createAccessToken(saved.getUsername());
        String refreshToken = refreshTokenService.create(saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new LoginResponse("Signup successful", accessToken, refreshToken));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody AuthRequest request) throws Exception {
        if (request.username() == null || request.password() == null) {
            return ResponseEntity.badRequest().body(new LoginResponse("Username and password required", null, null));
        }

        Optional<User> user = userRepository.findByUsername(request.username());

        if (user.isPresent() && passwordService.matches(request.password(), user.get().getPasswordHash())) {
            String accessToken = jwtService.createAccessToken(user.get().getUsername());
            String refreshToken = refreshTokenService.create(user.get().getId());
            return ResponseEntity.ok(new LoginResponse("Login successful", accessToken, refreshToken));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new LoginResponse("Invalid username or password", null, null));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestBody RefreshRequest request) throws Exception {
        Optional<RefreshToken> token = refreshTokenService.validate(request.refreshToken());
        if (token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new TokenResponse("Session expired", null));
        }

        Optional<User> user = userRepository.findById(token.get().getUserId());
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new TokenResponse("Session expired", null));
        }

        String accessToken = jwtService.createAccessToken(user.get().getUsername());
        return ResponseEntity.ok(new TokenResponse("Refreshed", accessToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(@RequestBody RefreshRequest request) {
        refreshTokenService.revoke(request.refreshToken());
        return ResponseEntity.ok(new MessageResponse("Logged out"));
    }

    // A protected endpoint to test with. The filter puts "username" on the request.
    @GetMapping("/me")
    public MessageResponse me(@RequestAttribute("username") String username) {
        return new MessageResponse("Hello " + username);
    }
}