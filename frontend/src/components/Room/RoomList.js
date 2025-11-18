import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import './Room.css';

const RoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
    fetchMyRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await apiClient.get('/api/rooms');
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms', error);
    }
  };

  const fetchMyRooms = async () => {
    try {
      const response = await apiClient.get('/api/rooms/my-rooms');
      setMyRooms(response.data);
    } catch (error) {
      console.error('Error fetching my rooms', error);
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/rooms', { name: newRoomName });
      setNewRoomName('');
      setShowCreateForm(false);
      fetchRooms();
      fetchMyRooms();
    } catch (error) {
      alert('Error creating room: ' + (error.response?.data || error.message));
    }
  };

  const joinRoom = async (roomId) => {
    try {
      await apiClient.post(`/api/rooms/${roomId}/join`);
      fetchMyRooms();
      navigate(`/room/${roomId}`);
    } catch (error) {
      alert('Error joining room: ' + (error.response?.data || error.message));
    }
  };

  const leaveRoom = async (roomId) => {
    try {
      await apiClient.post(`/api/rooms/${roomId}/leave`);
      fetchMyRooms();
      fetchRooms();
    } catch (error) {
      alert('Error leaving room: ' + (error.response?.data || error.message));
    }
  };

  const lockRoom = async (roomId) => {
    try {
      await apiClient.post(`/api/rooms/${roomId}/lock`);
      fetchRooms();
      fetchMyRooms();
    } catch (error) {
      alert('Error locking room: ' + (error.response?.data || error.message));
    }
  };

  const unlockRoom = async (roomId) => {
    try {
      await apiClient.post(`/api/rooms/${roomId}/unlock`);
      fetchRooms();
      fetchMyRooms();
    } catch (error) {
      alert('Error unlocking room: ' + (error.response?.data || error.message));
    }
  };

  const isMember = (roomId) => {
    return myRooms.some(room => room.id === roomId);
  };

  const isCreator = (room) => {
    return room.createdById === user.id;
  };

  return (
    <div className="room-list-container">
      <div className="room-list-header">
        <h1>Chat Rooms</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/profile')} className="btn-secondary">
            Hồ sơ
          </button>
          <button onClick={() => navigate('/friends')} className="btn-secondary">
            Bạn bè
          </button>
          <button onClick={() => navigate('/direct-messages')} className="btn-secondary">
            Tin nhắn
          </button>
          <button onClick={logout} className="btn-logout">
            Đăng xuất ({user.username})
          </button>
        </div>
      </div>

      <div className="room-list-content">
        <div className="room-section">
          <div className="section-header">
            <h2>My Rooms</h2>
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary">
              {showCreateForm ? 'Cancel' : 'Create Room'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={createRoom} className="create-room-form">
              <input
                type="text"
                placeholder="Room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary">Create</button>
            </form>
          )}

          <div className="rooms-grid">
            {myRooms.map(room => (
              <div key={room.id} className="room-card">
                <div className="room-card-header">
                  <h3>{room.name}</h3>
                  {room.isLocked && <span className="locked-badge">🔒 Locked</span>}
                </div>
                <p className="room-info">
                  Created by: {room.createdByUsername || 'Unknown'} | 
                  Members: {room.memberCount || 0}
                </p>
                <div className="room-actions">
                  <button onClick={() => navigate(`/room/${room.id}`)} className="btn-primary">
                    Enter Room
                  </button>
                  <button onClick={() => leaveRoom(room.id)} className="btn-danger">
                    Leave
                  </button>
                  {isCreator(room) && (
                    <>
                      {room.isLocked ? (
                        <button onClick={() => unlockRoom(room.id)} className="btn-secondary">
                          Unlock
                        </button>
                      ) : (
                        <button onClick={() => lockRoom(room.id)} className="btn-secondary">
                          Lock
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
