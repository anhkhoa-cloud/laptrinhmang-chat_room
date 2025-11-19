package com.chatapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoomDto {
    private Long id;
    private String name;
    private Long createdById;
    private String createdByUsername;
    private Boolean isLocked;
    private LocalDateTime createdAt;
    private Long memberCount;
}


