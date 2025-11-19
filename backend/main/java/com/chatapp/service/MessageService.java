package com.chatapp.service;

import com.chatapp.model.Message;
import com.chatapp.repository.MessageRepository;
import com.chatapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MessageService {
    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    public Message saveMessage(Long senderId, Long roomId, String content) {
        Message message = new Message();
        message.setSenderId(senderId);
        message.setRoomId(roomId);
        message.setContent(content);
        return messageRepository.save(message);
    }

    public Message saveMessage(Long senderId, Long roomId, String content, Long fileId) {
        Message message = new Message();
        message.setSenderId(senderId);
        message.setRoomId(roomId);
        message.setContent(content);
        message.setFileId(fileId);
        return messageRepository.save(message);
    }

    public List<Message> getRoomMessages(Long roomId) {
        return messageRepository.findByRoomIdOrderByTimestampDesc(roomId);
    }

    public List<Message> searchMessages(Long roomId, String keyword) {
        return messageRepository.searchMessages(roomId, keyword);
    }

    @Transactional
    public void deleteMessage(Long messageId, Long userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        
        if (!message.getSenderId().equals(userId)) {
            throw new RuntimeException("You can only delete your own messages");
        }
        
        messageRepository.delete(message);
    }
}



