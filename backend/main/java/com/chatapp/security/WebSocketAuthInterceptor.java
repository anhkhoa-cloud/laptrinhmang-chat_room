package com.chatapp.security;

import com.chatapp.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            System.out.println("🔌 WebSocket CONNECT request received");
            List<String> authHeaders = accessor.getNativeHeader("Authorization");
            
            if (authHeaders != null && !authHeaders.isEmpty()) {
                String authHeader = authHeaders.get(0);
                System.out.println("   - Authorization header found: " + (authHeader != null ? "Yes" : "No"));
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);
                    try {
                        String username = jwtUtil.extractUsername(token);
                        Long userId = jwtUtil.extractUserId(token);
                        System.out.println("   - Extracted userId: " + userId + ", username: " + username);
                        
                        if (jwtUtil.validateToken(token, username)) {
                            // Use userId as string for principal name so Spring can route messages correctly
                            // Spring WebSocket uses principal.getName() for user destination routing
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                userId.toString(), null, Collections.singletonList(new SimpleGrantedAuthority("USER")));
                            accessor.setUser(auth);
                            System.out.println("✅ WebSocket authenticated user: " + userId + " (username: " + username + ")");
                            System.out.println("   - Principal name set to: " + auth.getName());
                        } else {
                            System.out.println("❌ Token validation failed for user: " + username);
                        }
                    } catch (Exception e) {
                        System.out.println("❌ Error authenticating WebSocket connection: " + e.getMessage());
                        e.printStackTrace();
                    }
                } else {
                    System.out.println("❌ Authorization header does not start with 'Bearer '");
                }
            } else {
                System.out.println("❌ No Authorization header found in WebSocket CONNECT request");
            }
        }
        
        return message;
    }
}

