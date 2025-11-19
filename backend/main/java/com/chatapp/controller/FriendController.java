package com.chatapp.controller;

import com.chatapp.dto.FriendDto;
import com.chatapp.dto.FriendRequestDto;
import com.chatapp.model.Friend;
import com.chatapp.model.FriendRequest;
import com.chatapp.model.User;
import com.chatapp.repository.UserRepository;
import com.chatapp.service.FriendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/friends")
@CrossOrigin(origins = {"http://localhost:3000","*"})
public class FriendController {
    @Autowired
    private FriendService friendService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/request/{userId}")
    public ResponseEntity<?> sendFriendRequest(@PathVariable Long userId, Authentication authentication) {
        try {
            Long requesterId = (Long) authentication.getPrincipal();
            FriendRequest request = friendService.sendFriendRequest(requesterId, userId);
            
            FriendRequestDto dto = convertToDto(request);
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/accept/{requesterId}")
    public ResponseEntity<?> acceptFriendRequest(@PathVariable Long requesterId, Authentication authentication) {
        try {
            Long addresseeId = (Long) authentication.getPrincipal();
            FriendRequest request = friendService.acceptFriendRequest(addresseeId, requesterId);
            
            FriendRequestDto dto = convertToDto(request);
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/reject/{requesterId}")
    public ResponseEntity<?> rejectFriendRequest(@PathVariable Long requesterId, Authentication authentication) {
        try {
            Long addresseeId = (Long) authentication.getPrincipal();
            friendService.rejectFriendRequest(addresseeId, requesterId);
            return ResponseEntity.ok("Friend request rejected");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/request/{addresseeId}")
    public ResponseEntity<?> cancelFriendRequest(@PathVariable Long addresseeId, Authentication authentication) {
        try {
            Long requesterId = (Long) authentication.getPrincipal();
            friendService.cancelFriendRequest(requesterId, addresseeId);
            return ResponseEntity.ok("Friend request cancelled");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/unfriend/{userId}")
    public ResponseEntity<?> unfriend(@PathVariable Long userId, Authentication authentication) {
        try {
            Long currentUserId = (Long) authentication.getPrincipal();
            friendService.unfriend(currentUserId, userId);
            return ResponseEntity.ok("Unfriended successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/list")
    public ResponseEntity<List<FriendDto>> getFriends(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        List<Long> friendIds = friendService.getFriendIds(userId);
        
        List<FriendDto> friends = friendIds.stream().map(friendId -> {
            User friend = userRepository.findById(friendId).orElse(null);
            if (friend == null) return null;
            
            FriendDto dto = new FriendDto();
            dto.setUserId(friend.getId());
            dto.setUsername(friend.getUsername());
            dto.setStatus(friend.getStatus().toString());
            dto.setAvatarUrl(friend.getAvatarUrl());
            
            // Get friendship creation date
            Friend friendship = friendService.getFriendship(userId, friendId);
            if (friendship != null) {
                dto.setFriendshipCreatedAt(friendship.getCreatedAt());
            }
            
            return dto;
        }).filter(f -> f != null).collect(Collectors.toList());
        
        return ResponseEntity.ok(friends);
    }

    @GetMapping("/requests/pending")
    public ResponseEntity<List<FriendRequestDto>> getPendingRequests(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        List<FriendRequest> requests = friendService.getPendingRequests(userId);
        
        List<FriendRequestDto> dtos = requests.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/requests/sent")
    public ResponseEntity<List<FriendRequestDto>> getSentRequests(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        List<FriendRequest> requests = friendService.getSentRequests(userId);
        
        List<FriendRequestDto> dtos = requests.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/check/{userId}")
    public ResponseEntity<?> checkFriendship(@PathVariable Long userId, Authentication authentication) {
        Long currentUserId = (Long) authentication.getPrincipal();
        boolean areFriends = friendService.areFriends(currentUserId, userId);
        
        FriendRequest.FriendRequestStatus requestStatus = friendService.getFriendRequestStatus(currentUserId, userId);
        if (requestStatus == null) {
            requestStatus = friendService.getFriendRequestStatus(userId, currentUserId);
        }
        
        String statusStr = requestStatus != null ? requestStatus.toString() : "NONE";
        Map<String, Object> response = new HashMap<>();
        response.put("areFriends", areFriends);
        response.put("requestStatus", statusStr);
        return ResponseEntity.ok(response);
    }

    private FriendRequestDto convertToDto(FriendRequest request) {
        FriendRequestDto dto = new FriendRequestDto();
        dto.setId(request.getId());
        dto.setRequesterId(request.getRequesterId());
        dto.setAddresseeId(request.getAddresseeId());
        dto.setStatus(request.getStatus());
        dto.setCreatedAt(request.getCreatedAt());
        dto.setUpdatedAt(request.getUpdatedAt());
        
        userRepository.findById(request.getRequesterId())
            .ifPresent(user -> dto.setRequesterUsername(user.getUsername()));
        userRepository.findById(request.getAddresseeId())
            .ifPresent(user -> dto.setAddresseeUsername(user.getUsername()));
        
        return dto;
    }
}

