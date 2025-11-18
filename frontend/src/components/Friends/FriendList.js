import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import FriendRequests from './FriendRequests';
import './Friends.css';

const FriendsList = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendshipStatus, setFriendshipStatus] = useState({});
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const response = await apiClient.get('/api/friends/list');
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends', error);
    }
  };

  const searchUsers = async () => {
    if (searchKeyword.trim()) {
      try {
        const response = await apiClient.get(
          `/api/users/search?keyword=${encodeURIComponent(searchKeyword)}`
        );
        setSearchResults(response.data);
        // Check friendship status for each user
        const statusPromises = response.data.map(async (user) => {
          try {
            const statusResponse = await apiClient.get(
              `/api/friends/check/${user.id}`
            );
            return { userId: user.id, status: statusResponse.data };
          } catch (error) {
            return { userId: user.id, status: { areFriends: false, requestStatus: 'NONE' } };
          }
        });
        const statuses = await Promise.all(statusPromises);
        const statusMap = {};
        statuses.forEach(({ userId, status }) => {
          statusMap[userId] = status;
        });
        setFriendshipStatus(statusMap);
      } catch (error) {
        console.error('Error searching users', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await apiClient.post(`/api/friends/request/${userId}`);
      alert('Đã gửi lời mời kết bạn!');
      searchUsers(); // Refresh status
    } catch (error) {
      alert('Error: ' + (error.response?.data || error.message));
    }
  };

  const cancelFriendRequest = async (userId) => {
    try {
      await apiClient.delete(`/api/friends/request/${userId}`);
      alert('Đã hủy lời mời kết bạn!');
      searchUsers(); // Refresh status
    } catch (error) {
      alert('Error: ' + (error.response?.data || error.message));
    }
  };

  const unfriend = async (userId) => {
    if (window.confirm('Bạn có chắc muốn hủy kết bạn người này?')) {
      try {
        await apiClient.delete(`/api/friends/unfriend/${userId}`);
        alert('Đã hủy kết bạn');
        fetchFriends();
        searchUsers();
      } catch (error) {
        alert('Error: ' + (error.response?.data || error.message));
      }
    }
  };

  const getStatusButton = (user) => {
    const status = friendshipStatus[user.id];
    if (!status) return null;

    if (status.areFriends) {
      return (
        <div className="friend-actions">
          <button onClick={() => navigate(`/direct-messages?userId=${user.id}`)} className="btn-primary">
            Nhắn tin
          </button>
          <button onClick={() => unfriend(user.id)} className="btn-danger">
            Hủy kết bạn
          </button>
        </div>
      );
    }
