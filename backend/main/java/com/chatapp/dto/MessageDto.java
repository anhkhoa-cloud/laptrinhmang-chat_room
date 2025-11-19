package com.chatapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {
    private Long id;
    private String content;
    private Long senderId;
    private String senderUsername;
    private String senderAvatarUrl;
    private Long roomId;
    private LocalDateTime timestamp;
    private FileDto file;
}


