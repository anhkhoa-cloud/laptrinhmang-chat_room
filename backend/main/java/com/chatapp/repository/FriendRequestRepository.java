package com.chatapp.repository;

import com.chatapp.model.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    Optional<FriendRequest> findByRequesterIdAndAddresseeId(Long requesterId, Long addresseeId);
    
    List<FriendRequest> findByAddresseeIdAndStatus(Long addresseeId, FriendRequest.FriendRequestStatus status);
    
    List<FriendRequest> findByRequesterIdAndStatus(Long requesterId, FriendRequest.FriendRequestStatus status);
    
    @Query("SELECT fr FROM FriendRequest fr WHERE " +
           "(fr.requesterId = :userId OR fr.addresseeId = :userId) AND " +
           "fr.status = :status")
    List<FriendRequest> findFriendRequestsByUserAndStatus(@Param("userId") Long userId, 
                                                           @Param("status") FriendRequest.FriendRequestStatus status);
    
    boolean existsByRequesterIdAndAddresseeId(Long requesterId, Long addresseeId);
    
    boolean existsByRequesterIdAndAddresseeIdAndStatus(Long requesterId, Long addresseeId, 
                                                        FriendRequest.FriendRequestStatus status);
}


