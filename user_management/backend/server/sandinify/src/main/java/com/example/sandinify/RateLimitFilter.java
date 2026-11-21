package com.example.sandinify;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.filter.OncePerRequestFilter;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;

import java.io.IOException;
import org.springframework.core.annotation.Order;
@Component
@Order(1)  
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Tracer TRACER = GlobalOpenTelemetry.getTracer("com.example.sandinify");
    private final RateLimiterService limiter;
    private final int capacity;
    private final double refill;
    private final String corsAllowedOrigin;

    public RateLimitFilter(RateLimiterService limiter,
                           @Value("${ratelimit.capacity:100}") int capacity,
                           @Value("${ratelimit.refill:0.5}") double refill,
                           @Value("${app.cors.allowed-origin}") String corsAllowedOrigin) {
        this.limiter = limiter;
        this.capacity = capacity;
        this.refill = refill;
        this.corsAllowedOrigin = corsAllowedOrigin;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        Span requestSpan = TRACER.spanBuilder("request.pipeline")
                .setSpanKind(SpanKind.INTERNAL)
                .startSpan();
        requestSpan.setAttribute("http.request.method", request.getMethod());
        requestSpan.setAttribute("url.path", request.getRequestURI());

        try (Scope scope = requestSpan.makeCurrent()) {
            try {
                if ("OPTIONS".equals(request.getMethod())) {
                    chain.doFilter(request, response);
                    return;
                }

                try {
                    String address = request.getRemoteAddr();
                    boolean allowed = limiter.tryTake("ip:" + address, capacity, refill);
                    Span.current().setAttribute("app.rate_limit.decision", allowed ? "allowed" : "rejected");

                    if (!allowed) {
                        response.setStatus(429);
                        response.setContentType("application/json");
                        response.setHeader("Access-Control-Allow-Origin", corsAllowedOrigin);
                        response.getWriter().write("{\"message\":\"Too many requests. Slow down.\"}");
                        return;
                    }
                } catch (Exception e) {
                    Span.current().setAttribute("app.rate_limit.decision", "unavailable");
                    System.out.println("Rate limiter unavailable, letting request through");
                }

                chain.doFilter(request, response);
            } catch (IOException | ServletException | RuntimeException e) {
                requestSpan.recordException(e);
                requestSpan.setStatus(StatusCode.ERROR);
                throw e;
            } finally {
                requestSpan.setAttribute("http.response.status_code", response.getStatus());
                if (response.getStatus() >= HttpServletResponse.SC_INTERNAL_SERVER_ERROR) {
                    requestSpan.setStatus(StatusCode.ERROR);
                }
            }
        } finally {
            requestSpan.end();
        }
    }
}