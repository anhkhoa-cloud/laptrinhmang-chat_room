import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import apiClient from '../../utils/apiClient';
import { SOCKJS_ENDPOINT, toAbsoluteUrl } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { useWebRTC } from '../../hooks/useWebRTC';
import './DirectMessages.css';

const DirectMessages = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { setIncomingCall, setCallType, stompClientRef, setCallAccepted } = useCall();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const selectedUserRef = useRef(selectedUser);
  const usersRef = useRef([]);
  const isAutoSelectingRef = useRef(false);
  const fileInputRef = useRef(null);
  
  const { startCall, acceptCall, endCall } = useWebRTC(stompClientRef);
  useEffect(() => {
    fetchUsers();
    connectWebSocket();

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
    if (selectedUser) {
      const currentSelectedId = selectedUser.id;
      isAutoSelectingRef.current = false; // Reset flag
      
      // Fetch conversation to get full history
      fetchConversation(selectedUser.id).then((fetchedMessages) => {
        // Only update if this is still the selected user
        if (selectedUserRef.current && selectedUserRef.current.id === currentSelectedId) {
          setMessages(prev => {
            // Get ALL messages for THIS conversation from prev state
            // A message belongs to this conversation if it's between current user and selected user
            const conversationMessages = prev.filter(msg => {
              const isFromCurrentUser = msg.senderId === user.id || msg.receiverId === user.id;
              const isWithSelectedUser = msg.senderId === currentSelectedId || msg.receiverId === currentSelectedId;
              return isFromCurrentUser && isWithSelectedUser;
            });
            
            console.log('🔄 Merging messages for conversation with user', currentSelectedId);
            console.log('   - Fetched messages:', fetchedMessages.length);
            console.log('   - Existing conversation messages:', conversationMessages.length);
            
            // Merge fetched messages with existing conversation messages
            // Use Map to avoid duplicates (by message ID)
            const messageMap = new Map();
            
            // Add fetched messages (historical) first
            fetchedMessages.forEach(msg => {
              messageMap.set(msg.id, msg);
            });
            
            // Add existing conversation messages (may include real-time WebSocket messages)
            conversationMessages.forEach(msg => {
              // Only add if not already in map (prefer fetched message if duplicate)
              // This preserves WebSocket messages that came in before fetch completed
              if (!messageMap.has(msg.id)) {
                messageMap.set(msg.id, msg);
              } else {
                // If exists but is a temp message (large ID), replace with fetched one
                const existing = messageMap.get(msg.id);
                if (existing.id > 1000000000000 && msg.id < 1000000000000) {
                  messageMap.set(msg.id, msg);
                }
              }
            });
            
            // Convert to array and sort by timestamp
            const merged = Array.from(messageMap.values()).sort((a, b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            );
            
            console.log('   - Merged messages:', merged.length);
            return merged;
          });
        }
      });
    } else {
      // When no user selected, keep all messages in state but don't display them
      // This allows WebSocket messages to be stored for when conversation is selected
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUsers = async () => {
    try {
      // Only fetch friends for direct messages
      const response = await apiClient.get('/api/friends/list');
      const friendsList = response.data.map(friend => ({
        id: friend.userId,
        username: friend.username,
        status: friend.status,
        avatarUrl: friend.avatarUrl // Include avatarUrl
      }));
      setUsers(friendsList);
      usersRef.current = friendsList;
      return friendsList;
    } catch (error) {
      console.error('Error fetching friends', error);
      return [];
    }
  };

  const fetchConversation = async (otherUserId) => {
    try {
    const response = await apiClient.get(
        `/api/direct-messages/conversation/${otherUserId}`
      );
      // Sort messages by timestamp
      const sortedMessages = response.data.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      setMessages(sortedMessages);
      return sortedMessages;
    } catch (error) {
      console.error('Error fetching conversation', error);
      if (error.response?.status === 400) {
        alert(error.response.data || 'You can only view messages with friends');
      }
      return [];
    }
  };
