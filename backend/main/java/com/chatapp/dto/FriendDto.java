package com.chatapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendDto {
    private Long userId;
    private String username;
    private String status;
    private String avatarUrl;
    private LocalDateTime friendshipCreatedAt;
}


