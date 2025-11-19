package com.chatapp.service;

import com.chatapp.model.DirectMessage;
import com.chatapp.repository.DirectMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DirectMessageService {
    @Autowired
    private DirectMessageRepository directMessageRepository;

    @Autowired
    private FriendService friendService;

    public DirectMessage saveDirectMessage(Long senderId, Long receiverId, String content) {
        // Check if users are friends
        if (!friendService.areFriends(senderId, receiverId)) {
            throw new RuntimeException("You can only send messages to friends");
        }
        
        DirectMessage message = new DirectMessage();
        message.setSenderId(senderId);
        message.setReceiverId(receiverId);
        message.setContent(content);
        return directMessageRepository.save(message);
    }

    public DirectMessage saveDirectMessage(Long senderId, Long receiverId, String content, Long fileId) {
        // Check if users are friends
        if (!friendService.areFriends(senderId, receiverId)) {
            throw new RuntimeException("You can only send messages to friends");
        }
        
        DirectMessage message = new DirectMessage();
        message.setSenderId(senderId);
        message.setReceiverId(receiverId);
        message.setContent(content);
        message.setFileId(fileId);
        return directMessageRepository.save(message);
    }

    public List<DirectMessage> getConversation(Long userId1, Long userId2) {
        // Check if users are friends
        if (!friendService.areFriends(userId1, userId2)) {
            throw new RuntimeException("You can only view messages with friends");
        }
        return directMessageRepository.findConversation(userId1, userId2);
    }

    public boolean areFriends(Long userId1, Long userId2) {
        return friendService.areFriends(userId1, userId2);
    }

    public List<DirectMessage> getUserMessages(Long userId) {
        return directMessageRepository.findMessagesByUser(userId);
    }
}


