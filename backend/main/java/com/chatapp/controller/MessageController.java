package com.chatapp.controller;

import com.chatapp.dto.FileDto;
import com.chatapp.dto.MessageDto;
import com.chatapp.model.Message;
import com.chatapp.repository.UserRepository;
import com.chatapp.service.FileService;
import com.chatapp.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = {"http://localhost:3000","*"})
public class MessageController {
    @Autowired
    private MessageService messageService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileService fileService;

    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<MessageDto>> getRoomMessages(@PathVariable Long roomId) {
        List<Message> messages = messageService.getRoomMessages(roomId);
        List<MessageDto> messageDtos = messages.stream().map(message -> {
            MessageDto dto = new MessageDto();
            dto.setId(message.getId());
            dto.setContent(message.getContent());
            dto.setSenderId(message.getSenderId());
            dto.setRoomId(message.getRoomId());
            dto.setTimestamp(message.getTimestamp());
            if (message.getSenderId() != null) {
                userRepository.findById(message.getSenderId())
                    .ifPresent(user -> {
                        dto.setSenderUsername(user.getUsername());
                        dto.setSenderAvatarUrl(user.getAvatarUrl());
                    });
            } else {
                dto.setSenderUsername("Deleted User");
            }
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
                    dto.setFile(fileDto);
                } catch (Exception e) {
                    // File not found, skip
                }
            }
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(messageDtos);
    }

    @GetMapping("/room/{roomId}/search")
    public ResponseEntity<List<MessageDto>> searchMessages(@PathVariable Long roomId, @RequestParam String keyword) {
        List<Message> messages = messageService.searchMessages(roomId, keyword);
        List<MessageDto> messageDtos = messages.stream().map(message -> {
            MessageDto dto = new MessageDto();
            dto.setId(message.getId());
            dto.setContent(message.getContent());
            dto.setSenderId(message.getSenderId());
            dto.setRoomId(message.getRoomId());
            dto.setTimestamp(message.getTimestamp());
            if (message.getSenderId() != null) {
                userRepository.findById(message.getSenderId())
                    .ifPresent(user -> {
                        dto.setSenderUsername(user.getUsername());
                        dto.setSenderAvatarUrl(user.getAvatarUrl());
                    });
            } else {
                dto.setSenderUsername("Deleted User");
            }
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
                    dto.setFile(fileDto);
                } catch (Exception e) {
                    // File not found, skip
                }
            }
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(messageDtos);
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long messageId, Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            messageService.deleteMessage(messageId, userId);
            return ResponseEntity.ok("Message deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}


