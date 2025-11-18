import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import apiClient from '../../utils/apiClient';
import { SOCKJS_ENDPOINT, toAbsoluteUrl } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import './ChatRoom.css';

const ChatRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [room, setRoom] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const stompClientRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchRoomInfo();
    fetchMessages();
    connectWebSocket();

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRoomInfo = async () => {
    try {
      const response = await apiClient.get('/api/rooms');
      const roomData = response.data.find(r => r.id === parseInt(roomId));
      setRoom(roomData);
    } catch (error) {
      console.error('Error fetching room info', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await apiClient.get(`/api/messages/room/${roomId}`);
      setMessages(response.data.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages', error);
    }
  };

  const connectWebSocket = () => {
    const socket = new SockJS(SOCKJS_ENDPOINT);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
