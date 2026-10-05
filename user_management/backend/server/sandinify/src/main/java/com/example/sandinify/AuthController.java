package com.example.sandinify;

import org.springframework.web.bind.annotation.*; //necessary to use annotations like @RestController, @RequestMapping, @CrossOrigin, @PostMapping, and @RequestBody
import java.util.Optional;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder; //necessary to use the Argon2PasswordEncoder class for password hashing

@RestController //necessary to make this class a REST controller, which can handle HTTP requests and return responses
@RequestMapping("/api") //necessary becasue the frontend is sending requests to /api/signup and /api/login
@CrossOrigin(origins = "http://localhost:5173") //necessary to allow cross-origin requests from the frontend running on localhost:5173
public class AuthController {
    
    //private final, no class can inherit 
    private final Argon2PasswordEncoder encoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    private final UserRepository userRepository;
    // Spring sees this constructor and hands in the repository automatically
    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    

    public record AuthRequest(String username, String password) {}
    public record MessageResponse(String message) {}

    @PostMapping("/signup") //the @RequestBody gets turned intot a AuthRequest object, which is the usrname and password
    public MessageResponse signup(@RequestBody AuthRequest request) {
        String username = request.username();
        String password = request.password();
        String hash = encoder.encode(password);
        
        if (userRepository.existsByUsername(username)) {
            return new MessageResponse("Username already taken");
        }
        userRepository.save(new User(username, hash));

        System.out.println("Signup request for: " + username);
        return new MessageResponse("Signup successful for " + username); // what it returns to the user. In the future, it will be a page and a token
    }

    @PostMapping("/login")
    public MessageResponse login(@RequestBody AuthRequest request) {
        String username = request.username();
        String password = request.password();
        String hash = encoder.encode(password);

        Optional<User> user = userRepository.findByUsername(username);
        
        if (user.isPresent() && encoder.matches(password, user.get().getPasswordHash())) {
            return new MessageResponse("Login successful for " + username);
        }
        return new MessageResponse("Invalid username or password");
    }
} 
