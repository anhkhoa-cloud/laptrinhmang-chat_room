package com.chatapp.controller;

import com.chatapp.model.User;
import com.chatapp.repository.UserRepository;
import com.chatapp.service.FileService;
import com.chatapp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {"http://localhost:3000","*"})
public class UserController {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private FileService fileService;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/online")
    public ResponseEntity<List<User>> getOnlineUsers() {
        List<User> onlineUsers = userRepository.findAll().stream()
            .filter(user -> user.getStatus() == User.UserStatus.ONLINE)
            .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(onlineUsers);
    }

    @GetMapping("/search")
    public ResponseEntity<List<User>> searchUsers(@RequestParam String keyword, Authentication authentication) {
        Long currentUserId = (Long) authentication.getPrincipal();
        List<User> users = userRepository.findAll().stream()
            .filter(user -> !user.getId().equals(currentUserId))
            .filter(user -> user.getUsername().toLowerCase().contains(keyword.toLowerCase()))
            .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @GetMapping("/profile")
    public ResponseEntity<User> getProfile(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userService.findById(userId);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            
            // Upload file
            com.chatapp.model.File uploadedFile = fileService.saveFile(file, userId);
            
            // Update user avatar URL
            String avatarUrl = "/api/files/download/" + uploadedFile.getId();
            User updatedUser = userService.updateAvatar(userId, avatarUrl);
            
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to upload avatar: " + e.getMessage());
        }
    }
}

