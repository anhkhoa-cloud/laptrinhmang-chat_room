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
      onConnect: () => {
        console.log('Connected to WebSocket');
        
        // Subscribe to room messages
        stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
          const newMessage = JSON.parse(message.body);
          setMessages(prev => [...prev, newMessage]);
        });

        // Subscribe to typing indicators
        stompClient.subscribe(`/topic/room/${roomId}/typing`, (message) => {
          const typingInfo = JSON.parse(message.body);
          if (typingInfo.isTyping) {
            setTypingUsers(prev => {
              if (!prev.includes(typingInfo.username)) {
                return [...prev, typingInfo.username];
              }
              return prev;
            });
          } else {
            setTypingUsers(prev => prev.filter(u => u !== typingInfo.username));
          }
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error', frame);
      }
    });

    stompClient.activate();
    stompClientRef.current = stompClient;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await apiClient.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) {
      return;
    }

    let fileId = null;
    if (selectedFile) {
      try {
        const fileDto = await uploadFile(selectedFile);
        fileId = fileDto.id;
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        alert('Failed to upload file. Please try again.');
        return;
      }
