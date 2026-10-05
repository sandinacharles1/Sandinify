package com.example.sandinify; //we eare in the JAVA folder, so we need to specify the package name. This is necessary for the Java compiler to know where to find the classes and interfaces that are used in this file.

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SandinifyApplication {

	public static void main(String[] args) {
		SpringApplication.run(SandinifyApplication.class, args);
	}

}
