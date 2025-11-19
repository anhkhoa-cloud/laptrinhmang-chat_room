package com.chatapp.controller;

import com.chatapp.dto.RoomDto;
import com.chatapp.model.Room;
import com.chatapp.repository.RoomMemberRepository;
import com.chatapp.repository.UserRepository;
import com.chatapp.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = {"http://localhost:3000","*"})
public class RoomController {
    @Autowired
    private RoomService roomService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomMemberRepository roomMemberRepository;

    @GetMapping
    public ResponseEntity<List<RoomDto>> getAllRooms(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        List<Room> rooms = roomService.getAllRooms();
        List<RoomDto> roomDtos = rooms.stream().map(room -> {
            RoomDto dto = new RoomDto();
            dto.setId(room.getId());
            dto.setName(room.getName());
            dto.setCreatedById(room.getCreatedById());
            dto.setIsLocked(room.getIsLocked());
            dto.setCreatedAt(room.getCreatedAt());
            if (room.getCreatedById() != null) {
                userRepository.findById(room.getCreatedById())
                    .ifPresent(user -> dto.setCreatedByUsername(user.getUsername()));
            }
            dto.setMemberCount(roomMemberRepository.countByRoomId(room.getId()));
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(roomDtos);
    }

    @GetMapping("/my-rooms")
    public ResponseEntity<List<RoomDto>> getMyRooms(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        List<Room> rooms = roomService.getUserRooms(userId);
        List<RoomDto> roomDtos = rooms.stream().map(room -> {
            RoomDto dto = new RoomDto();
            dto.setId(room.getId());
            dto.setName(room.getName());
            dto.setCreatedById(room.getCreatedById());
            dto.setIsLocked(room.getIsLocked());
            dto.setCreatedAt(room.getCreatedAt());
            if (room.getCreatedById() != null) {
                userRepository.findById(room.getCreatedById())
                    .ifPresent(user -> dto.setCreatedByUsername(user.getUsername()));
            }
            dto.setMemberCount(roomMemberRepository.countByRoomId(room.getId()));
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(roomDtos);
    }

    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody RoomDto roomDto, Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            Room room = roomService.createRoom(roomDto.getName(), userId);
            RoomDto dto = new RoomDto();
            dto.setId(room.getId());
            dto.setName(room.getName());
            dto.setCreatedById(room.getCreatedById());
            dto.setIsLocked(room.getIsLocked());
            dto.setCreatedAt(room.getCreatedAt());
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<?> joinRoom(@PathVariable Long roomId, Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            roomService.joinRoom(roomId, userId);
            return ResponseEntity.ok("Joined room successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{roomId}/leave")
    public ResponseEntity<?> leaveRoom(@PathVariable Long roomId, Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            roomService.leaveRoom(roomId, userId);
            return ResponseEntity.ok("Left room successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{roomId}/lock")
    public ResponseEntity<?> lockRoom(@PathVariable Long roomId, Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            roomService.lockRoom(roomId, userId);
            return ResponseEntity.ok("Room locked successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{roomId}/unlock")
    public ResponseEntity<?> unlockRoom(@PathVariable Long roomId, Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            roomService.unlockRoom(roomId, userId);
            return ResponseEntity.ok("Room unlocked successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}


