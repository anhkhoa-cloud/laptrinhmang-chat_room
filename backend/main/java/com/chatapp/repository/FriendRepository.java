package com.chatapp.repository;

import com.chatapp.model.Friend;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRepository extends JpaRepository<Friend, Long> {
    @Query("SELECT f FROM Friend f WHERE " +
           "(f.user1Id = :userId OR f.user2Id = :userId)")
    List<Friend> findFriendsByUserId(@Param("userId") Long userId);
    
    @Query("SELECT f FROM Friend f WHERE " +
           "(f.user1Id = :user1Id AND f.user2Id = :user2Id) OR " +
           "(f.user1Id = :user2Id AND f.user2Id = :user1Id)")
    Optional<Friend> findFriendship(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);
    
    boolean existsByUser1IdAndUser2Id(Long user1Id, Long user2Id);
    
    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM Friend f WHERE " +
           "(f.user1Id = :user1Id AND f.user2Id = :user2Id) OR " +
           "(f.user1Id = :user2Id AND f.user2Id = :user1Id)")
    boolean areFriends(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);
    
    @Query("DELETE FROM Friend f WHERE " +
           "(f.user1Id = :user1Id AND f.user2Id = :user2Id) OR " +
           "(f.user1Id = :user2Id AND f.user2Id = :user1Id)")
    void deleteFriendship(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);
}


