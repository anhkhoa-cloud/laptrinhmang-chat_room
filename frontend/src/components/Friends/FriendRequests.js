import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';
import './Friends.css';

const FriendRequests = ({ onUpdate }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  useEffect(() => {
    fetchFriendRequests();
  }, []);

  const fetchFriendRequests = async () => {
    try {
      const [pendingResponse, sentResponse] = await Promise.all([
        apiClient.get('/api/friends/requests/pending'),
        apiClient.get('/api/friends/requests/sent')
      ]);
      setPendingRequests(pendingResponse.data);
      setSentRequests(sentResponse.data);
    } catch (error) {
      console.error('Error fetching friend requests', error);
    }
  };

  const acceptRequest = async (requesterId) => {
    try {
      await apiClient.post(`/api/friends/accept/${requesterId}`);
      alert('Friend request accepted!');
      fetchFriendRequests();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('Error: ' + (error.response?.data || error.message));
    }
  };

  const rejectRequest = async (requesterId) => {
    try {
      await apiClient.post(`/api/friends/reject/${requesterId}`);
      alert('Friend request rejected!');
      fetchFriendRequests();
    } catch (error) {
      alert('Error: ' + (error.response?.data || error.message));
    }
  };

  const cancelRequest = async (addresseeId) => {
    try {
      await apiClient.delete(`/api/friends/request/${addresseeId}`);
      alert('Friend request cancelled!');
      fetchFriendRequests();
    } catch (error) {
      alert('Error: ' + (error.response?.data || error.message));
    }
  };
