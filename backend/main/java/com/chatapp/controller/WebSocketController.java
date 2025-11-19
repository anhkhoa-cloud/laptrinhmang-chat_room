package com.chatapp.controller;

import com.chatapp.dto.DirectMessageDto;
import com.chatapp.dto.FileDto;
import com.chatapp.dto.MessageDto;
import com.chatapp.model.DirectMessage;
import com.chatapp.model.Message;
import com.chatapp.repository.UserRepository;
import com.chatapp.service.DirectMessageService;
import com.chatapp.service.FileService;
import com.chatapp.service.MessageService;
import com.chatapp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Controller
public class WebSocketController {
    @Autowired
    private MessageService messageService;

    @Autowired
    private DirectMessageService directMessageService;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileService fileService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private Long getUserIdFromPrincipal(Principal principal) {
        if (principal == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                Object principalObj = auth.getPrincipal();
                if (principalObj instanceof String) {
                    try {
                        return Long.parseLong((String) principalObj);
                    } catch (NumberFormatException e) {
                        return null;
                    }
                } else if (principalObj instanceof Long) {
                    return (Long) principalObj;
                }
            }
            return null;
        }
        // Principal name is userId as string
        try {
            return Long.parseLong(principal.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload Map<String, Object> payload, Principal principal) {
        Long userId = getUserIdFromPrincipal(principal);
        if (userId == null) {
            return;
        }
        Long roomId = Long.parseLong(payload.get("roomId").toString());
        String content = payload.get("content").toString();
        Long fileId = payload.get("fileId") != null ? Long.parseLong(payload.get("fileId").toString()) : null;

        Message message = fileId != null 
            ? messageService.saveMessage(userId, roomId, content, fileId)
            : messageService.saveMessage(userId, roomId, content);
        
        MessageDto messageDto = new MessageDto();
        messageDto.setId(message.getId());
        messageDto.setContent(message.getContent());
        messageDto.setSenderId(message.getSenderId());
        messageDto.setRoomId(message.getRoomId());
        messageDto.setTimestamp(message.getTimestamp());
        userRepository.findById(message.getSenderId())
            .ifPresent(user -> {
                messageDto.setSenderUsername(user.getUsername());
                messageDto.setSenderAvatarUrl(user.getAvatarUrl());
            });
        
        // Add file info if exists
        if (message.getFileId() != null) {
            try {
                com.chatapp.model.File file = fileService.getFile(message.getFileId());
                FileDto fileDto = new FileDto();
                fileDto.setId(file.getId());
                fileDto.setOriginalName(file.getOriginalName());
                fileDto.setFileSize(file.getFileSize());
                fileDto.setMimeType(file.getMimeType());
                fileDto.setDownloadUrl("/api/files/download/" + file.getId());
                messageDto.setFile(fileDto);
            } catch (Exception e) {
                System.out.println("Error loading file info: " + e.getMessage());
            }
        }

        // Send to specific room topic
        messagingTemplate.convertAndSend("/topic/room/" + roomId, messageDto);
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload Map<String, Object> payload, Principal principal) {
        Long userId = getUserIdFromPrincipal(principal);
        if (userId == null) {
            return;
        }
        Long roomId = Long.parseLong(payload.get("roomId").toString());
        String username = userRepository.findById(userId)
            .map(user -> user.getUsername())
            .orElse("Unknown");

        Map<String, Object> typingInfo = new HashMap<>();
        typingInfo.put("userId", userId);
        typingInfo.put("username", username);
        typingInfo.put("isTyping", payload.get("isTyping"));

        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/typing", typingInfo);
    }

    @MessageMapping("/direct.sendMessage")
    public void sendDirectMessage(@Payload Map<String, Object> payload, Principal principal) {
        Long senderId = getUserIdFromPrincipal(principal);
        if (senderId == null) {
            System.out.println("ERROR: Could not get senderId from principal");
            return;
        }
        
        System.out.println("Received direct message request from sender: " + senderId);
        System.out.println("Principal name: " + (principal != null ? principal.getName() : "null"));
        
        Long receiverId = Long.parseLong(payload.get("receiverId").toString());
        String content = payload.get("content").toString();
        Long fileId = payload.get("fileId") != null ? Long.parseLong(payload.get("fileId").toString()) : null;
        
        System.out.println("Sending message from " + senderId + " to " + receiverId + ": " + content);

        DirectMessage message = fileId != null
            ? directMessageService.saveDirectMessage(senderId, receiverId, content, fileId)
            : directMessageService.saveDirectMessage(senderId, receiverId, content);

        DirectMessageDto messageDto = new DirectMessageDto();
        messageDto.setId(message.getId());
        messageDto.setContent(message.getContent());
        messageDto.setSenderId(message.getSenderId());
        messageDto.setReceiverId(message.getReceiverId());
        messageDto.setTimestamp(message.getTimestamp());
        userRepository.findById(message.getSenderId())
            .ifPresent(user -> {
                messageDto.setSenderUsername(user.getUsername());
                messageDto.setSenderAvatarUrl(user.getAvatarUrl());
            });
        userRepository.findById(message.getReceiverId())
            .ifPresent(user -> {
                messageDto.setReceiverUsername(user.getUsername());
                messageDto.setReceiverAvatarUrl(user.getAvatarUrl());
            });
        
        // Add file info if exists
        if (message.getFileId() != null) {
            try {
                com.chatapp.model.File file = fileService.getFile(message.getFileId());
                FileDto fileDto = new FileDto();
                fileDto.setId(file.getId());
                fileDto.setOriginalName(file.getOriginalName());
                fileDto.setFileSize(file.getFileSize());
                fileDto.setMimeType(file.getMimeType());
                fileDto.setDownloadUrl("/api/files/download/" + file.getId());
                messageDto.setFile(fileDto);
            } catch (Exception e) {
                System.out.println("Error loading file info: " + e.getMessage());
            }
        }

        // Send to receiver (Spring automatically routes to /user/{receiverId}/queue/messages)
        System.out.println("Sending to receiver " + receiverId + " via /user/" + receiverId + "/queue/messages");
        messagingTemplate.convertAndSendToUser(receiverId.toString(), "/queue/messages", messageDto);
        
        // Also send back to sender for real-time update (Spring automatically routes to /user/{senderId}/queue/messages)
        System.out.println("Sending to sender " + senderId + " via /user/" + senderId + "/queue/messages");
        messagingTemplate.convertAndSendToUser(senderId.toString(), "/queue/messages", messageDto);
        
        System.out.println("✅ Successfully sent direct message from user " + senderId + " to user " + receiverId + " via WebSocket");
    }
