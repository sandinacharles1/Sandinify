package com.example.sandinify;
import jakarta.persistence.*; //import * (everything) from jakarta persistence. we have it in our pom.xml dependencies, so we can use it. This is necessary to use the annoattions

@Entity //marks class to a databse table
@Table(name = "users")
public class User {

    @Id //Each field is a column, no need to be redundant and use @column, but it shows this is a primary key
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    public User() {} //default constructor is necessary for JPA to create instances of the entity class. Hibernate uses java reflection.

    public User(String username, String passwordHash) {
        this.username = username;
        this.passwordHash = passwordHash;
    }

    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
}