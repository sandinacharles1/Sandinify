package com.example.sandinify;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import org.springframework.core.annotation.Order;
@Component
@Order(1)  
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiterService limiter;
    private final int capacity;
    private final double refill;

    public RateLimitFilter(RateLimiterService limiter, @Value("${ratelimit.capacity:100}") int capacity, @Value("${ratelimit.refill:0.5}") double refill) {
        this.limiter = limiter;
        this.capacity = capacity;
        this.refill = refill;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        if ("OPTIONS".equals(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        try {
            String address = request.getRemoteAddr();
            boolean allowed = limiter.tryTake("ip:" + address, capacity, refill);

            if (!allowed) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
                response.getWriter().write("{\"message\":\"Too many requests. Slow down.\"}");
                return;
            }
        } catch (Exception e) {
            System.out.println("Rate limiter unavailable, letting request through");
        }

        chain.doFilter(request, response);
    }
}