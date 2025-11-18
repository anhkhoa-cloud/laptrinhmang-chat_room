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
