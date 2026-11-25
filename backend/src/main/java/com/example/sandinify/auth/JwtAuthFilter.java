package com.example.sandinify.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
@Order(2)
public class JwtAuthFilter extends OncePerRequestFilter {

    // These endpoints need no access token.
    private static final Set<String> PUBLIC_PATHS =
            Set.of("/api/signup", "/api/login", "/api/refresh", "/api/logout");

    private final JwtService jwtService;
    private final String corsAllowedOrigin;

    public JwtAuthFilter(JwtService jwtService,
                         @Value("${app.cors.allowed-origin}") String corsAllowedOrigin) {
        this.jwtService = jwtService;
        this.corsAllowedOrigin = corsAllowedOrigin;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String path = request.getRequestURI();

        if ("OPTIONS".equals(request.getMethod())
                || !path.startsWith("/api/")
                || PUBLIC_PATHS.contains(path)) {
            chain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");
        String username = null;
        if (header != null && header.startsWith("Bearer ")) {
            username = jwtService.verify(header.substring(7));
        }

        if (username == null) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.setHeader("Access-Control-Allow-Origin", corsAllowedOrigin);
            response.getWriter().write("{\"message\":\"Invalid or expired token\"}");
            return;
        }

        request.setAttribute("username", username);
        chain.doFilter(request, response);
    }
}