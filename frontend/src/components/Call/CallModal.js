import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../hooks/useWebRTC';
import './CallModal.css';
import { toAbsoluteUrl } from '../../config/env';

const CallModal = () => {
  const {
    incomingCall,
    setIncomingCall,
    activeCall,
    setActiveCall,
    callType,
    setCallType,
    localStream,
    remoteStream,
    setLocalStream,
    setRemoteStream,
    peerConnection,
    setPeerConnection,
    callAccepted,
    setCallAccepted,
    stompClientRef
  } = useCall();
  
  const { user } = useAuth();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const durationIntervalRef = useRef(null);
  
  const { acceptCall, endCall } = useWebRTC(stompClientRef);

  useEffect(() => {
    if (localStream) {
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      if (localAudioRef.current) localAudioRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Start timer only after call is accepted
  useEffect(() => {
    if (activeCall && callAccepted) {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      setCallDuration(0);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [activeCall, callAccepted]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    setCallAccepted(false);
    endCall();
  };

  if (!incomingCall && !activeCall) {
    return null;
  }

  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        {incomingCall && !activeCall && (
          <div className="incoming-call">
            <div className="caller-info">
              {incomingCall.callerAvatarUrl ? (
                <img 
                  src={toAbsoluteUrl(incomingCall.callerAvatarUrl)} 
                  alt={incomingCall.callerUsername}
                  className="caller-avatar"
                />
              ) : (
                <div className="caller-avatar-placeholder">
                  {incomingCall.callerUsername?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <h2>{incomingCall.callerUsername} is calling...</h2>
              <p>{incomingCall.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}</p>
            </div>
            <div className="call-actions">
              <button 
                className="btn-accept-call"
                onClick={async () => {
                  if (stompClientRef.current?.connected && incomingCall) {
                    // Accept call
                    stompClientRef.current.publish({
                      destination: '/app/call.accept',
                      body: JSON.stringify({
                        callerId: incomingCall.callerId
                      })
                    });
                    
                    // Start WebRTC
                    await acceptCall(
                      incomingCall.callerId,
                      incomingCall.callerUsername,
                      incomingCall.callType
                    );
                    
                    setActiveCall({
                      otherUser: {
                        id: incomingCall.callerId,
                        username: incomingCall.callerUsername
                      },
                      isCaller: false
                    });
                    setCallAccepted(true);
                    setIncomingCall(null);
                  }
                }}
              >
                ✅ Accept
              </button>
              <button 
                className="btn-reject-call"
                onClick={() => {
                  if (stompClientRef.current?.connected && incomingCall) {
                    stompClientRef.current.publish({
                      destination: '/app/call.reject',
                      body: JSON.stringify({
                        callerId: incomingCall.callerId
                      })
                    });
                  }
                  setIncomingCall(null);
                }}
              >
                ❌ Decline
              </button>
            </div>
          </div>
        )}

        {activeCall && (
          <div className="active-call">
            <div className="call-header">
              <div className="call-info">
                <h3>{activeCall.otherUser?.username || 'Calling...'}</h3>
                <span className="call-duration">{formatDuration(callDuration)}</span>
              </div>
            </div>

            <div className="video-container">
              {callType === 'video' ? (
                <>
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline
                    className="remote-video"
                  />
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline
                    muted
                    className="local-video"
                  />
                </>
              ) : (
                <div className="voice-call-view">
                  {activeCall.otherUser?.avatarUrl ? (
                    <img 
                      src={toAbsoluteUrl(activeCall.otherUser.avatarUrl)} 
                      alt={activeCall.otherUser.username}
                      className="voice-avatar"
                    />
                  ) : (
                    <div className="voice-call-view">
                      <div className="voice-avatar-placeholder">
                        {activeCall.otherUser?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </div>
                  )}
                  <h2>{activeCall.otherUser?.username || 'Calling...'}</h2>
                </div>
              )}
              {/* Hidden audio elements to ensure audio tracks are rendered */}
              <audio ref={remoteAudioRef} autoPlay />
              <audio ref={localAudioRef} autoPlay muted />
            </div>

            <div className="call-controls">
              <button 
                className={`control-btn ${isMuted ? 'muted' : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? '🔇' : '🎤'}
              </button>
              {callType === 'video' && (
                <button 
                  className={`control-btn ${isVideoOff ? 'video-off' : ''}`}
                  onClick={toggleVideo}
                  title={isVideoOff ? 'Turn on video' : 'Turn off video'}
                >
                  {isVideoOff ? '📹' : '📷'}
                </button>
              )}
              <button 
                className="control-btn end-call"
                onClick={handleEndCall}
                title="End call"
              >
                📴
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;

