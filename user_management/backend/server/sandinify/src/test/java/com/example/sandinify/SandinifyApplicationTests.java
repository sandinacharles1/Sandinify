package com.example.sandinify;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean; // Use @MockBean if Spring Boot < 3.4
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "jwt.secret=test-only-sandinify-jwt-secret-32-bytes")
@AutoConfigureMockMvc
@Transactional
class SandinifyApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        when(rateLimiterService.tryTake(anyString(), anyInt(), anyDouble())).thenReturn(true);
    }

    @Test
    @DisplayName("1. Sign up a new user -> 201 Created with tokens")
    void test1_signupSuccess() throws Exception {
        String jsonBody = "{\"username\":\"testuser\",\"password\":\"securePassword123\"}";

        mockMvc.perform(post("/api/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Signup successful"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }

    @Test
    @DisplayName("2. Sign up the same name again -> 409 Conflict")
    void test2_signupDuplicate() throws Exception {
        String jsonBody = "{\"username\":\"duplicateuser\",\"password\":\"pass123\"}";
        // First signup
        mockMvc.perform(post("/api/signup").contentType(MediaType.APPLICATION_JSON).content(jsonBody));

        // Second signup
        mockMvc.perform(post("/api/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonBody))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Username already taken"));
    }

    @Test
    @DisplayName("3. Sign up with blank fields -> 400 Bad Request")
    void test3_signupBlankFields() throws Exception {
        String jsonBody = "{\"username\":\"   \",\"password\":\"\"}";

        mockMvc.perform(post("/api/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username and password required"));
    }

    @Test
    @DisplayName("4. Log in with right password -> 200 OK with tokens")
    void test4_loginSuccess() throws Exception {
        // Setup user
        mockMvc.perform(post("/api/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"loginuser\",\"password\":\"mypassword\"}"));

        mockMvc.perform(post("/api/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"loginuser\",\"password\":\"mypassword\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }

    @Test
    @DisplayName("5. Log in with wrong password -> 401 Unauthorized")
    void test5_loginWrongPassword() throws Exception {
        mockMvc.perform(post("/api/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"wrongpassuser\",\"password\":\"correctpass\"}"));

        mockMvc.perform(post("/api/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"wrongpassuser\",\"password\":\"badpass\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("6. Log in with non-existent name -> 401 Unauthorized")
    void test6_loginNonExistent() throws Exception {
        mockMvc.perform(post("/api/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"ghostuser\",\"password\":\"anypass\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("7. /me with valid access token -> 200 OK")
    void test7_meWithValidToken() throws Exception {
        MvcResult signupResult = mockMvc.perform(post("/api/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"meuser\",\"password\":\"pass123\"}"))
                .andReturn();

        String responseString = signupResult.getResponse().getContentAsString();
        String accessToken = objectMapper.readTree(responseString).get("accessToken").asText();

        mockMvc.perform(get("/api/me")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Hello meuser"));
    }

    @Test
    @DisplayName("8. /me with no token -> 401 Unauthorized")
    void test8_meNoToken() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    @DisplayName("9. /me with a tampered token -> 401 Unauthorized")
    void test9_meTamperedToken() throws Exception {
        mockMvc.perform(get("/api/me")
                .header("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    @DisplayName("10. Refresh with real refresh token -> 200 OK + new access token")
    void test10_refreshSuccess() throws Exception {
        MvcResult signupResult = mockMvc.perform(post("/api/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"refreshuser\",\"password\":\"pass123\"}"))
                .andReturn();

        String refreshToken = objectMapper.readTree(signupResult.getResponse().getContentAsString()).get("refreshToken").asText();

        mockMvc.perform(post("/api/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Refreshed"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("11. Refresh with fake token -> 401 Unauthorized")
    void test11_refreshFakeToken() throws Exception {
        mockMvc.perform(post("/api/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"nonexistentfaketoken\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Session expired"));
    }

    @Test
    @DisplayName("12. Log out, then refresh with same token -> 200 OK then 401")
    void test12_logoutThenRefresh() throws Exception {
        MvcResult signupResult = mockMvc.perform(post("/api/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"logoutuser\",\"password\":\"pass123\"}"))
                .andReturn();

        String refreshToken = objectMapper.readTree(signupResult.getResponse().getContentAsString()).get("refreshToken").asText();

        // Step A: Logout successfully
        mockMvc.perform(post("/api/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Logged out"));

        // Step B: Attempt refresh with revoked token -> Session expired
        mockMvc.perform(post("/api/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Session expired"));
    }
}