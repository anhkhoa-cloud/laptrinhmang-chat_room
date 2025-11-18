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

return (
    <div className="friend-requests-container">
      <div className="requests-section">
        <h3>Pending Requests ({pendingRequests.length})</h3>
        {pendingRequests.length === 0 ? (
          <p>No pending friend requests</p>
        ) : (
          <div className="requests-list">
            {pendingRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="user-info">
                  <span className="user-name">{request.requesterUsername}</span>
                  <span className="request-time">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="request-actions">
                  <button
                    onClick={() => acceptRequest(request.requesterId)}
                    className="btn-primary"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectRequest(request.requesterId)}
                    className="btn-danger"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="requests-section">
        <h3>Sent Requests ({sentRequests.length})</h3>
        {sentRequests.length === 0 ? (
          <p>No sent friend requests</p>
        ) : (
          <div className="requests-list">
            {sentRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="user-info">
                  <span className="user-name">{request.addresseeUsername}</span>
                  <span className="request-time">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="request-actions">
                  <button
                    onClick={() => cancelRequest(request.addresseeId)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendRequests;




  
