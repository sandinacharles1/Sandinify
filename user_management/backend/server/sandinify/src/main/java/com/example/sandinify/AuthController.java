package com.example.sandinify;

import org.springframework.web.bind.annotation.*; //necessary to use annotations like @RestController, @RequestMapping, @CrossOrigin, @PostMapping, and @RequestBody
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder; //necessary to use the Argon2PasswordEncoder class for password hashing

@RestController //necessary to make this class a REST controller, which can handle HTTP requests and return responses
@RequestMapping("/api") //necessary becasue the frontend is sending requests to /api/signup and /api/login
@CrossOrigin(origins = "http://localhost:5173") //necessary to allow cross-origin requests from the frontend running on localhost:5173
public class AuthController {

    private final Argon2PasswordEncoder encoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();

    public record AuthRequest(String username, String password) {}
    public record MessageResponse(String message) {}

    @PostMapping("/signup") //the @RequestBody gets turned intot a AuthRequest object, which is the usrname and password
    public MessageResponse signup(@RequestBody AuthRequest request) {
        String username = request.username();
        String password = request.password();
        String hash = encoder.encode(password);

        System.out.println("Signup request for: " + username);
        return new MessageResponse("Signup received for " + username); // what it returns to the user. In the future, it will be a page and a token
    }

    @PostMapping("/login")
    public MessageResponse login(@RequestBody AuthRequest request) {
        String username = request.username();
        String password = request.password();
        String hash = encoder.encode(password);

        System.out.println("Login request for: " + username);
        return new MessageResponse("Login received for " + username);
    }
} 