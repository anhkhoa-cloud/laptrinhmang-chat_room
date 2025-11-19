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
@MessageMapping("/user.status")
    public void updateUserStatus(@Payload Map<String, Object> payload, Principal principal) {
        Long userId = getUserIdFromPrincipal(principal);
        if (userId == null) {
            return;
        }
        String status = payload.get("status").toString();
        
        userService.updateUserStatus(userId, 
            status.equals("ONLINE") ? 
                com.chatapp.model.User.UserStatus.ONLINE : 
                com.chatapp.model.User.UserStatus.OFFLINE);

        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("userId", userId);
        statusUpdate.put("status", status);

        messagingTemplate.convertAndSend("/topic/userStatus", statusUpdate);
    }

    // WebRTC Call Signaling
    @MessageMapping("/call.initiate")
    public void initiateCall(@Payload Map<String, Object> payload, Principal principal) {
        Long callerId = getUserIdFromPrincipal(principal);
        if (callerId == null) {
            return;
        }
        
        Long receiverId = Long.parseLong(payload.get("receiverId").toString());
        String callType = payload.get("callType").toString(); // "voice" or "video"
        
        System.out.println("📞 Call initiated from " + callerId + " to " + receiverId + " (type: " + callType + ")");
        
        Map<String, Object> callOffer = new HashMap<>();
        callOffer.put("type", "call-offer");
        callOffer.put("callerId", callerId);
        callOffer.put("callType", callType);
        callOffer.put("callerUsername", userRepository.findById(callerId)
            .map(user -> user.getUsername())
            .orElse("Unknown"));
        
        // Send call offer to receiver
        messagingTemplate.convertAndSendToUser(receiverId.toString(), "/queue/call", callOffer);
    }

    @MessageMapping("/call.accept")
    public void acceptCall(@Payload Map<String, Object> payload, Principal principal) {
        Long receiverId = getUserIdFromPrincipal(principal);
        if (receiverId == null) {
            return;
        }
        
        Long callerId = Long.parseLong(payload.get("callerId").toString());
        
        System.out.println("✅ Call accepted by " + receiverId + " from " + callerId);
        
        Map<String, Object> callAccept = new HashMap<>();
        callAccept.put("type", "call-accepted");
        callAccept.put("receiverId", receiverId);
        callAccept.put("receiverUsername", userRepository.findById(receiverId)
            .map(user -> user.getUsername())
            .orElse("Unknown"));
        
        // Send acceptance to caller
        messagingTemplate.convertAndSendToUser(callerId.toString(), "/queue/call", callAccept);
    }

    @MessageMapping("/call.reject")
    public void rejectCall(@Payload Map<String, Object> payload, Principal principal) {
        Long receiverId = getUserIdFromPrincipal(principal);
        if (receiverId == null) {
            return;
        }
        
        Long callerId = Long.parseLong(payload.get("callerId").toString());
        
        System.out.println("❌ Call rejected by " + receiverId + " from " + callerId);
        
        Map<String, Object> callReject = new HashMap<>();
        callReject.put("type", "call-rejected");
        callReject.put("receiverId", receiverId);
        
        // Send rejection to caller
        messagingTemplate.convertAndSendToUser(callerId.toString(), "/queue/call", callReject);
    }

    @MessageMapping("/call.end")
    public void endCall(@Payload Map<String, Object> payload, Principal principal) {
        Long userId = getUserIdFromPrincipal(principal);
        if (userId == null) {
            return;
        }
        
        Long otherUserId = Long.parseLong(payload.get("otherUserId").toString());
        
        System.out.println("📴 Call ended by " + userId);
        
        Map<String, Object> callEnd = new HashMap<>();
        callEnd.put("type", "call-ended");
        callEnd.put("endedBy", userId);
        
        // Send end call signal to other user
        messagingTemplate.convertAndSendToUser(otherUserId.toString(), "/queue/call", callEnd);
    }

    @MessageMapping("/call.offer")
    public void handleCallOffer(@Payload Map<String, Object> payload, Principal principal) {
        Long fromUserId = getUserIdFromPrincipal(principal);
        if (fromUserId == null) {
            return;
        }
        
        Long toUserId = Long.parseLong(payload.get("toUserId").toString());
        String offer = payload.get("offer").toString();
        
        Map<String, Object> offerMessage = new HashMap<>();
        offerMessage.put("type", "webrtc-offer");
        offerMessage.put("fromUserId", fromUserId);
        offerMessage.put("offer", offer);
        
        messagingTemplate.convertAndSendToUser(toUserId.toString(), "/queue/call", offerMessage);
    }

    @MessageMapping("/call.answer")
    public void handleCallAnswer(@Payload Map<String, Object> payload, Principal principal) {
        Long fromUserId = getUserIdFromPrincipal(principal);
        if (fromUserId == null) {
            return;
        }
        
        Long toUserId = Long.parseLong(payload.get("toUserId").toString());
        String answer = payload.get("answer").toString();
        
        Map<String, Object> answerMessage = new HashMap<>();
        answerMessage.put("type", "webrtc-answer");
        answerMessage.put("fromUserId", fromUserId);
        answerMessage.put("answer", answer);
        
        messagingTemplate.convertAndSendToUser(toUserId.toString(), "/queue/call", answerMessage);
    }

    @MessageMapping("/call.ice-candidate")
    public void handleIceCandidate(@Payload Map<String, Object> payload, Principal principal) {
        Long fromUserId = getUserIdFromPrincipal(principal);
        if (fromUserId == null) {
            return;
        }
        
        Long toUserId = Long.parseLong(payload.get("toUserId").toString());
        Map<String, Object> candidate = (Map<String, Object>) payload.get("candidate");
        
        Map<String, Object> candidateMessage = new HashMap<>();
        candidateMessage.put("type", "webrtc-ice-candidate");
        candidateMessage.put("fromUserId", fromUserId);
        candidateMessage.put("candidate", candidate);
        
        messagingTemplate.convertAndSendToUser(toUserId.toString(), "/queue/call", candidateMessage);
    }
}

