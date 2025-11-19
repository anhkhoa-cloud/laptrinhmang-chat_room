package com.chatapp.repository;

import com.chatapp.model.DirectMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {
    @Query("SELECT dm FROM DirectMessage dm WHERE " +
           "(dm.senderId = :userId1 AND dm.receiverId = :userId2) OR " +
           "(dm.senderId = :userId2 AND dm.receiverId = :userId1) " +
           "ORDER BY dm.timestamp ASC")
    List<DirectMessage> findConversation(@Param("userId1") Long userId1, @Param("userId2") Long userId2);
    
    @Query("SELECT dm FROM DirectMessage dm WHERE " +
           "dm.senderId = :userId OR dm.receiverId = :userId " +
           "ORDER BY dm.timestamp DESC")
    List<DirectMessage> findMessagesByUser(@Param("userId") Long userId);
}


