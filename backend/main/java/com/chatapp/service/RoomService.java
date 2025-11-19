package com.chatapp.service;

import com.chatapp.model.Room;
import com.chatapp.model.RoomMember;
import com.chatapp.repository.RoomMemberRepository;
import com.chatapp.repository.RoomRepository;
import com.chatapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RoomService {
    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomMemberRepository roomMemberRepository;

    @Autowired
    private UserRepository userRepository;

    public Room createRoom(String name, Long createdById) {
        Room room = new Room();
        room.setName(name);
        room.setCreatedById(createdById);
        room.setIsLocked(false);
        Room savedRoom = roomRepository.save(room);
        
        // Add creator as member
        joinRoom(savedRoom.getId(), createdById);
        
        return savedRoom;
    }

    @Transactional
    public void joinRoom(Long roomId, Long userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));
        
        if (room.getIsLocked()) {
            throw new RuntimeException("Room is locked");
        }
        
        if (!roomMemberRepository.existsByUserIdAndRoomId(userId, roomId)) {
            RoomMember member = new RoomMember();
            member.setUserId(userId);
            member.setRoomId(roomId);
            roomMemberRepository.save(member);
        }
    }

    @Transactional
    public void leaveRoom(Long roomId, Long userId) {
        roomMemberRepository.deleteByUserIdAndRoomId(userId, roomId);
    }

    public List<Room> getAllRooms() {
        return roomRepository.findByIsLockedFalse();
    }

    public List<Room> getUserRooms(Long userId) {
        return roomRepository.findRoomsByUserId(userId);
    }

    public Room getRoomById(Long roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));
    }

    @Transactional
    public void lockRoom(Long roomId, Long userId) {
        Room room = getRoomById(roomId);
        if (!room.getCreatedById().equals(userId)) {
            throw new RuntimeException("Only room creator can lock the room");
        }
        room.setIsLocked(true);
        roomRepository.save(room);
    }

    @Transactional
    public void unlockRoom(Long roomId, Long userId) {
        Room room = getRoomById(roomId);
        if (!room.getCreatedById().equals(userId)) {
            throw new RuntimeException("Only room creator can unlock the room");
        }
        room.setIsLocked(false);
        roomRepository.save(room);
    }

    public List<Long> getRoomMemberIds(Long roomId) {
        return roomMemberRepository.findByRoomId(roomId).stream()
                .map(RoomMember::getUserId)
                .collect(Collectors.toList());
    }
}



