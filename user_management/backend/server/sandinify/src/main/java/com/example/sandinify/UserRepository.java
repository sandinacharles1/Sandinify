package com.example.sandinify; //package

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> { //uses our User class and the primary key is a Long. This is necessary to use the JpaRepository interface, which provides CRUD operations for the User entity.
    boolean existsByUsername(String username); // check if the username isnt already taken
    Optional<User> findByUsername(String username); //if user isnt found. prevents error by having <optional>. Returns the row so you can then use regular functions
}