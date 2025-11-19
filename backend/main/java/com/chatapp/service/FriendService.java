package com.chatapp.service;

import com.chatapp.model.Friend;
import com.chatapp.model.FriendRequest;
import com.chatapp.repository.FriendRepository;
import com.chatapp.repository.FriendRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FriendService {
    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Autowired
    private FriendRepository friendRepository;

    public FriendRequest sendFriendRequest(Long requesterId, Long addresseeId) {
        if (requesterId.equals(addresseeId)) {
            throw new RuntimeException("Cannot send friend request to yourself");
        }

        // Check if already friends
        if (friendRepository.areFriends(requesterId, addresseeId)) {
            throw new RuntimeException("Already friends");
        }

        // Check if request already exists
        Optional<FriendRequest> existingRequest = friendRequestRepository
            .findByRequesterIdAndAddresseeId(requesterId, addresseeId);
        
        if (existingRequest.isPresent()) {
            FriendRequest request = existingRequest.get();
            if (request.getStatus() == FriendRequest.FriendRequestStatus.PENDING) {
                throw new RuntimeException("Friend request already pending");
            } else if (request.getStatus() == FriendRequest.FriendRequestStatus.ACCEPTED) {
                throw new RuntimeException("Already friends");
            } else {
                // If rejected, create new request
                request.setStatus(FriendRequest.FriendRequestStatus.PENDING);
                return friendRequestRepository.save(request);
            }
        }

        // Check if reverse request exists
        Optional<FriendRequest> reverseRequest = friendRequestRepository
            .findByRequesterIdAndAddresseeId(addresseeId, requesterId);
        
        if (reverseRequest.isPresent() && 
            reverseRequest.get().getStatus() == FriendRequest.FriendRequestStatus.PENDING) {
            // Auto-accept if reverse request exists
            return acceptFriendRequest(addresseeId, requesterId);
        }

        // Create new request
        FriendRequest request = new FriendRequest();
        request.setRequesterId(requesterId);
        request.setAddresseeId(addresseeId);
        request.setStatus(FriendRequest.FriendRequestStatus.PENDING);
        return friendRequestRepository.save(request);
    }

    @Transactional
    public FriendRequest acceptFriendRequest(Long addresseeId, Long requesterId) {
        FriendRequest request = friendRequestRepository
            .findByRequesterIdAndAddresseeId(requesterId, addresseeId)
            .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (request.getStatus() != FriendRequest.FriendRequestStatus.PENDING) {
            throw new RuntimeException("Friend request is not pending");
        }

        request.setStatus(FriendRequest.FriendRequestStatus.ACCEPTED);
        friendRequestRepository.save(request);

        // Create friendship (ensure user1Id < user2Id)
        Long user1Id = Math.min(requesterId, addresseeId);
        Long user2Id = Math.max(requesterId, addresseeId);

        Friend friendship = new Friend();
        friendship.setUser1Id(user1Id);
        friendship.setUser2Id(user2Id);
        friendRepository.save(friendship);

        return request;
    }

    @Transactional
    public void rejectFriendRequest(Long addresseeId, Long requesterId) {
        FriendRequest request = friendRequestRepository
            .findByRequesterIdAndAddresseeId(requesterId, addresseeId)
            .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (request.getStatus() != FriendRequest.FriendRequestStatus.PENDING) {
            throw new RuntimeException("Friend request is not pending");
        }

        request.setStatus(FriendRequest.FriendRequestStatus.REJECTED);
        friendRequestRepository.save(request);
    }

    @Transactional
    public void cancelFriendRequest(Long requesterId, Long addresseeId) {
        FriendRequest request = friendRequestRepository
            .findByRequesterIdAndAddresseeId(requesterId, addresseeId)
            .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (request.getStatus() != FriendRequest.FriendRequestStatus.PENDING) {
            throw new RuntimeException("Cannot cancel non-pending friend request");
        }

        friendRequestRepository.delete(request);
    }

    @Transactional
    public void unfriend(Long userId1, Long userId2) {
        Friend friendship = friendRepository.findFriendship(userId1, userId2)
            .orElseThrow(() -> new RuntimeException("Not friends"));

        friendRepository.deleteById(friendship.getId());

        // Update friend request status if exists
        friendRequestRepository.findByRequesterIdAndAddresseeId(userId1, userId2)
            .ifPresent(request -> {
                request.setStatus(FriendRequest.FriendRequestStatus.REJECTED);
                friendRequestRepository.save(request);
            });
        
        friendRequestRepository.findByRequesterIdAndAddresseeId(userId2, userId1)
            .ifPresent(request -> {
                request.setStatus(FriendRequest.FriendRequestStatus.REJECTED);
                friendRequestRepository.save(request);
            });
    }

    public List<Long> getFriendIds(Long userId) {
        List<Friend> friendships = friendRepository.findFriendsByUserId(userId);
        return friendships.stream()
            .map(f -> f.getUser1Id().equals(userId) ? f.getUser2Id() : f.getUser1Id())
            .collect(Collectors.toList());
    }

    public List<FriendRequest> getPendingRequests(Long userId) {
        return friendRequestRepository.findByAddresseeIdAndStatus(
            userId, FriendRequest.FriendRequestStatus.PENDING);
    }

    public List<FriendRequest> getSentRequests(Long userId) {
        return friendRequestRepository.findByRequesterIdAndStatus(
            userId, FriendRequest.FriendRequestStatus.PENDING);
    }

    public boolean areFriends(Long userId1, Long userId2) {
        return friendRepository.areFriends(userId1, userId2);
    }

    public FriendRequest.FriendRequestStatus getFriendRequestStatus(Long requesterId, Long addresseeId) {
        return friendRequestRepository.findByRequesterIdAndAddresseeId(requesterId, addresseeId)
            .map(FriendRequest::getStatus)
            .orElse(null);
    }

    public Friend getFriendship(Long userId1, Long userId2) {
        return friendRepository.findFriendship(userId1, userId2).orElse(null);
    }
}


