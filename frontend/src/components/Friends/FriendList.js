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
if (status.requestStatus === 'PENDING') {
      // Check if request was sent by current user (user is in sent requests)
      // For now, show cancel button if pending
      return (
        <button onClick={() => cancelFriendRequest(user.id)} className="btn-secondary">
          Hủy lời mời
        </button>
      );
    }

    if (status.requestStatus === 'ACCEPTED') {
      return <span className="status-badge">Đã là bạn bè</span>;
    }

    return (
      <button onClick={() => sendFriendRequest(user.id)} className="btn-primary">
        Kết bạn
      </button>
    );
  };

  const getUserStatus = (userObj) => {
    return userObj.status === 'ONLINE' ? '🟢' : '⚪';
  };

  return (
    <div className="friends-container">
      <div className="friends-header">
        <button onClick={() => navigate('/rooms')} className="btn-back">
          ← Về phòng
        </button>
        <h2>Bạn bè</h2>
        <button onClick={() => setShowFriendRequests(!showFriendRequests)} className="btn-secondary">
          {showFriendRequests ? 'Ẩn' : 'Hiện'} lời mời kết bạn
        </button>
      </div>

      {showFriendRequests && <FriendRequests onUpdate={fetchFriends} />}

      <div className="friends-content">
        <div className="search-section">
          <h3>Người dùng</h3>
          <div className="search-box">
            <input
              type="text"
              placeholder="Nhập tên..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
            />
            <button onClick={searchUsers} className="btn-primary">Tìm kiếm</button>
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>Kết quả tìm kiếm</h4>
              {searchResults.map((user) => (
                <div key={user.id} className="user-card">
                  <div className="user-info">
                    <span className="user-status">{getUserStatus(user)}</span>
                    <span className="user-name">{user.username}</span>
                  </div>
                  {getStatusButton(user)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="friends-section">
          <h3>Bạn bè của tôi ({friends.length})</h3>
          {friends.length === 0 ? (
            <p>Chưa có bạn bè. Hãy tìm kiếm để kết bạn!</p>
          ) : (
            <div className="friends-list">
              {friends.map((friend) => (
                <div key={friend.userId} className="friend-card">
                  <div className="user-info">
                    <span className="user-status">{friend.status === 'ONLINE' ? '🟢' : '⚪'}</span>
                    <span className="user-name">{friend.username}</span>
                  </div>
                  <div className="friend-actions">
                    <button
                      onClick={() => navigate(`/direct-messages?userId=${friend.userId}`)}
                      className="btn-primary"
                    >
                      Nhắn tin
                    </button>
                    <button onClick={() => unfriend(friend.userId)} className="btn-danger">
                      Hủy kết bạn
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsList;

