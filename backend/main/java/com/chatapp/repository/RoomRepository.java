package com.chatapp.repository;

import com.chatapp.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByIsLockedFalse();
    
    @Query("SELECT r FROM Room r WHERE r.id IN " +
           "(SELECT rm.roomId FROM RoomMember rm WHERE rm.userId = :userId)")
    List<Room> findRoomsByUserId(@Param("userId") Long userId);
}


