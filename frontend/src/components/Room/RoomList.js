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
