import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import RoomList from './components/Room/RoomList';
import ChatRoom from './components/Room/ChatRoom';
import DirectMessages from './components/DirectMessage/DirectMessages';
import FriendsList from './components/Friends/FriendsList';
import Profile from './components/Profile/Profile';
import CallModal from './components/Call/CallModal';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <Router>
          <div className="App">
            <CallModal />
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/rooms"
              element={
                <PrivateRoute>
                  <RoomList />
                </PrivateRoute>
              }
            />
            <Route
              path="/room/:roomId"
              element={
                <PrivateRoute>
                  <ChatRoom />
                </PrivateRoute>
              }
            />
            <Route
              path="/direct-messages"
              element={
                <PrivateRoute>
                  <DirectMessages />
                </PrivateRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <PrivateRoute>
                  <FriendsList />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/rooms" replace />} />
            </Routes>
          </div>
        </Router>
      </CallProvider>
    </AuthProvider>
  );
}

export default App;

