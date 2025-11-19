package com.chatapp.dto;

import com.chatapp.model.FriendRequest;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestDto {
    private Long id;
    private Long requesterId;
    private String requesterUsername;
    private Long addresseeId;
    private String addresseeUsername;
    private FriendRequest.FriendRequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
