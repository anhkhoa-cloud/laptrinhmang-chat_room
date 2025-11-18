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
        console.log('✅ Connected to WebSocket for direct messages');
        console.log('Current user ID:', user.id);
        
        // expose stomp client to CallContext for CallModal/useWebRTC
        try {
          const { stompClientRef: ccRef, setCallAccepted } = require('../../context/CallContext');
        } catch {}
        // assign via hook instead (below we use useCall)
        
        // Subscribe to personal message queue - receive all messages for current user
        // Note: Spring WebSocket automatically converts /user/queue/messages to /user/{userId}/queue/messages
        const subscription = stompClient.subscribe(`/user/queue/messages`, (message) => {
          try {
            console.log('📨 Raw WebSocket message received:', message);
            console.log('📨 Message body:', message.body);
            
            const newMessage = JSON.parse(message.body);
            console.log('✅ Parsed direct message:', newMessage);
            console.log('   - Sender ID:', newMessage.senderId);
            console.log('   - Receiver ID:', newMessage.receiverId);
            console.log('   - Current user ID:', user.id);
            
            // Check if this message is for current user
            const isForCurrentUser = newMessage.senderId === user.id || 
                                     newMessage.receiverId === user.id;
            
            if (!isForCurrentUser) {
              console.log('❌ Message not for current user, ignoring');
              return;
            }
            
            setMessages(prev => {
              // Check if message already exists (avoid duplicates)
              const existingIndex = prev.findIndex(m => 
                m.id === newMessage.id || 
                (m.id && m.id > 1000000000000 && newMessage.id && newMessage.id < 1000000000000 && 
                 m.content === newMessage.content && 
                 m.senderId === newMessage.senderId && 
                 m.receiverId === newMessage.receiverId)
              );
              
              if (existingIndex >= 0) {
                console.log('🔄 Updating existing message (replacing temp message)');
                // Update existing message (replace temp message with real one)
                const updated = [...prev];
                updated[existingIndex] = newMessage;
                return updated.sort((a, b) => 
                  new Date(a.timestamp) - new Date(b.timestamp)
                );
              }
              
              // Get current selected user from ref (always latest)
              const currentSelectedUser = selectedUserRef.current;
              
              // Determine the other user in this conversation
              const otherUserId = newMessage.senderId === user.id 
                ? newMessage.receiverId 
                : newMessage.senderId;
              
              console.log('   - Other user ID:', otherUserId);
              console.log('   - Current selected user:', currentSelectedUser?.id);
              
              // Auto-select conversation if this is an INCOMING message and no conversation selected
              if (!currentSelectedUser && otherUserId && newMessage.senderId !== user.id) {
                console.log('🔄 Incoming message! Auto-selecting conversation with user:', otherUserId);
                isAutoSelectingRef.current = true;
                
                const otherUser = usersRef.current.find(u => u.id === otherUserId);
                if (otherUser) {
                  console.log('✅ Found user in friends list, auto-selecting:', otherUser.username);
                  // Update ref immediately
                  selectedUserRef.current = otherUser;
                  setSelectedUser(otherUser);
                } else {
                  console.log('⚠️ User not in friends list, fetching...');
                  fetchUsers().then(friendsList => {
                    const foundUser = friendsList.find(u => u.id === otherUserId);
                    if (foundUser) {
                      console.log('✅ Found user after fetch, auto-selecting:', foundUser.username);
                      selectedUserRef.current = foundUser;
                      setSelectedUser(foundUser);
                    }
                  });
                }
              }
              
              // Re-check selected user after potential auto-select
              const updatedSelectedUser = selectedUserRef.current;
              
              // Check if message belongs to current conversation
              const isForCurrentConversation = updatedSelectedUser && 
                (newMessage.senderId === updatedSelectedUser.id || 
                 newMessage.receiverId === updatedSelectedUser.id);
              
              // ALWAYS add message to state if it's for current user
              // The display logic will filter by selectedUser
              console.log('✅ Adding message to state (always store messages for current user)');
              
              // Check if we should auto-select conversation
              if (!updatedSelectedUser && otherUserId && newMessage.senderId !== user.id) {
                // This case was already handled above, but we still need to add the message
                isAutoSelectingRef.current = false; // Reset flag after auto-selection
              }
              
              // Always add the message to state
              const newMessages = [...prev, newMessage];
              const sorted = newMessages.sort((a, b) => 
                new Date(a.timestamp) - new Date(b.timestamp)
              );
              console.log('   - Total messages in state after add:', sorted.length);
              
              // If this is for current conversation or no conversation selected, it will be displayed
              if (isForCurrentConversation || !updatedSelectedUser) {
                console.log('   - Message will be displayed (current conversation or no selection)');
              } else {
                console.log('   - Message stored but not displayed (different conversation)');
              }
              
              return sorted;
            });
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
            console.error('   - Message body:', message.body);
            console.error('   - Error stack:', error.stack);
          }
        });
        
        console.log('✅ Subscribed to /user/queue/messages for user:', user.id);
        console.log('   - Subscription active:', subscription);
        
        // Subscribe to call events
        const callSubscription = stompClient.subscribe('/user/queue/call', (message) => {
          try {
            const data = JSON.parse(message.body);
            console.log('📞 Call event received:', data);
            
            if (data.type === 'call-offer') {
              setIncomingCall({
                callerId: data.callerId,
                callerUsername: data.callerUsername,
                callType: data.callType
              });
              setCallType(data.callType);
            } else if (data.type === 'call-accepted') {
              // mark call accepted to start timer
              if (setCallAccepted) setCallAccepted(true);
            } else if (data.type === 'call-rejected') {
              alert('Cuộc gọi đã bị từ chối');
              if (setCallAccepted) setCallAccepted(false);
              endCall();
            } else if (data.type === 'call-ended') {
              if (setCallAccepted) setCallAccepted(false);
              endCall();
            }
          } catch (error) {
            console.error('Error parsing call event:', error);
          }
        });
        
        console.log('✅ Subscribed to /user/queue/call for user:', user.id);
      },
      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame);
        console.error('   - Command:', frame.command);
        console.error('   - Headers:', frame.headers);
        console.error('   - Body:', frame.body);
      },
      onDisconnect: () => {
        console.log('⚠️ WebSocket disconnected');
      },
      onWebSocketError: (error) => {
        console.error('❌ WebSocket error:', error);
      },
      debug: (str) => {
        console.log('🔍 STOMP debug:', str);
      }
    });

    stompClient.activate();
    stompClientRef.current = stompClient;
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
    if ((!newMessage.trim() && !selectedFile) || !selectedUser) {
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

    const messageContent = newMessage.trim() || (selectedFile ? `📎 ${selectedFile.name}` : '');
    setNewMessage(''); // Clear input immediately

    // Optimistic update - add message to UI immediately
    const tempMessage = {
      id: Date.now(), // Temporary ID
      content: messageContent,
      senderId: user.id,
      senderUsername: user.username,
      receiverId: selectedUser.id,
      receiverUsername: selectedUser.username,
      timestamp: new Date().toISOString(),
      file: selectedFile ? {
        id: fileId,
        originalName: selectedFile.name,
        fileSize: selectedFile.size,
        downloadUrl: `/api/files/download/${fileId}`
      } : null
    };

    setMessages(prev => [...prev, tempMessage].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    ));

    // Send via WebSocket
    if (stompClientRef.current?.connected) {
      try {
        const messagePayload = {
          receiverId: selectedUser.id,
          content: messageContent
        };
        if (fileId) {
          messagePayload.fileId = fileId;
        }
        console.log('📤 Sending message via WebSocket:', messagePayload);
        console.log('   - Destination: /app/direct.sendMessage');
        console.log('   - STOMP client connected:', stompClientRef.current.connected);
        
        stompClientRef.current.publish({
          destination: '/app/direct.sendMessage',
          body: JSON.stringify(messagePayload),
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('✅ Message sent via WebSocket');
      } catch (error) {
        console.error('❌ Error sending message:', error);
        console.error('   - Error stack:', error.stack);
        // Revert optimistic update on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        setNewMessage(messageContent); // Restore message
        alert('Failed to send message. Please try again.');
      }
    } else {
      console.error('❌ WebSocket not connected');
      console.error('   - STOMP client:', stompClientRef.current);
      console.error('   - Connected:', stompClientRef.current?.connected);
      // Revert optimistic update
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(messageContent);
      alert('Connection lost. Please refresh the page.');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
