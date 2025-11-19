package com.chatapp.repository;

import com.chatapp.model.RoomMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {
    Optional<RoomMember> findByUserIdAndRoomId(Long userId, Long roomId);
    List<RoomMember> findByRoomId(Long roomId);
    List<RoomMember> findByUserId(Long userId);
    void deleteByUserIdAndRoomId(Long userId, Long roomId);
    boolean existsByUserIdAndRoomId(Long userId, Long roomId);
    
    @Query("SELECT COUNT(rm) FROM RoomMember rm WHERE rm.roomId = :roomId")
    Long countByRoomId(@Param("roomId") Long roomId);
}


