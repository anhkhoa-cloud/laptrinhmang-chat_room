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
   }

    if (stompClientRef.current?.connected) {
      const payload = {
        roomId: parseInt(roomId),
        content: newMessage || (selectedFile ? `📎 ${selectedFile.name}` : '')
      };
      if (fileId) {
        payload.fileId = fileId;
      }

      stompClientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setNewMessage('');
      stopTyping();
    }
  };

  const handleTyping = () => {
    if (!isTyping && stompClientRef.current?.connected) {
      setIsTyping(true);
      stompClientRef.current.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({
          roomId: parseInt(roomId),
          isTyping: true
        }),
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (isTyping && stompClientRef.current?.connected) {
      setIsTyping(false);
      stompClientRef.current.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({
          roomId: parseInt(roomId),
          isTyping: false
        }),
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await apiClient.delete(`/api/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      alert('Error deleting message: ' + (error.response?.data || error.message));
    }
  };

  const searchMessages = async () => {
    if (searchKeyword.trim()) {
      try {
        const response = await apiClient.get(
          `/api/messages/room/${roomId}/search?keyword=${encodeURIComponent(searchKeyword)}`
        );
        setSearchResults(response.data);
      } catch (error) {
        console.error('Error searching messages', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="chat-room-container">
      <div className="chat-room-header">
        <button onClick={() => navigate('/rooms')} className="btn-back">← Về phòng</button>
        <h2>{room?.name || 'Phòng chat'}</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm kiếm tin nhắn..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchMessages()}
          />
          <button onClick={searchMessages} className="btn-search">Tìm</button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h3>Kết quả tìm kiếm</h3>
          {searchResults.map(msg => (
            <div key={msg.id} className="message">
              <span className="message-sender">{msg.senderUsername}:</span>
              <span className="message-content">{msg.content}</span>
              <span className="message-time">{formatTime(msg.timestamp)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.senderId === user.id ? 'own-message' : ''}`}
          >
            <div className="message-header">
              {message.senderAvatarUrl ? (
                <img 
                  src={toAbsoluteUrl(message.senderAvatarUrl)} 
                  alt={message.senderUsername}
                  className="message-avatar"
                />
              ) : (
                <div className="message-avatar-placeholder">
                  {message.senderUsername?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="message-info">
                <span className="message-sender">{message.senderUsername || 'Không rõ'}</span>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
            </div>
            <div className="message-content">{message.content}</div>
            {message.file && (
              <div className="message-file">
                {message.file.mimeType && message.file.mimeType.startsWith('image/') ? (
                  <img
                    src={toAbsoluteUrl(message.file.downloadUrl)}
                    alt={message.file.originalName}
                    style={{ maxWidth: '320px', maxHeight: '240px', borderRadius: '10px' }}
                    onError={(e) => {
                      // fallback to link when image fails
                      e.currentTarget.style.display = 'none'
                      const link = e.currentTarget.nextElementSibling
                      if (link) link.style.display = 'inline-flex'
                    }}
                  />
                ) : null}
                <a 
                  href={toAbsoluteUrl(message.file.downloadUrl)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="file-link"
                  style={{ display: message.file.mimeType && message.file.mimeType.startsWith('image/') ? 'none' : 'inline-flex' }}
                >
                  📎 {message.file.originalName} ({(message.file.fileSize / 1024).toFixed(2)} KB)
                </a>
              </div>
