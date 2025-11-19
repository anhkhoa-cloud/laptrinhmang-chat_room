package com.chatapp.repository;

import com.chatapp.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByRoomIdOrderByTimestampDesc(Long roomId);
    
    @Query("SELECT m FROM Message m WHERE m.roomId = :roomId AND m.timestamp >= :since ORDER BY m.timestamp ASC")
    List<Message> findMessagesSince(@Param("roomId") Long roomId, @Param("since") LocalDateTime since);
    
    @Query("SELECT m FROM Message m WHERE m.roomId = :roomId AND m.content LIKE %:keyword% ORDER BY m.timestamp DESC")
    List<Message> searchMessages(@Param("roomId") Long roomId, @Param("keyword") String keyword);
}


