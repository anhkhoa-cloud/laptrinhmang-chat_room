import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import { toAbsoluteUrl } from '../../config/env';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/api/users/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

   const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size must be less than 5MB');
        return;
      }
      uploadAvatar(file);
    }
  };

  const uploadAvatar = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await apiClient.post('/api/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Upload response:', response.data);
      
      // Update profile with new avatar - ensure avatarUrl is set
      const updatedProfile = response.data;
      console.log('Updated profile avatarUrl:', updatedProfile.avatarUrl);
      
      // Immediately update profile with new data
      setProfile(updatedProfile);
      
      // Also fetch fresh data from server to ensure consistency
      setTimeout(() => {
        fetchProfile();
      }, 200);
      
      alert('Avatar updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

   const getAvatarUrl = () => {
    if (profile?.avatarUrl) {
      // Add timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      const url = `${toAbsoluteUrl(profile.avatarUrl)}?t=${timestamp}`;
      console.log('Avatar URL:', url);
      return url;
    }
    console.log('No avatar URL in profile:', profile);
    return null;
  };

  if (loading) {
    return <div className="profile-container">Đang tải...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button onClick={() => navigate('/rooms')} className="btn-back">
          ← Quay lại
        </button>
        <h2>Hồ sơ của tôi</h2>
      </div>

      <div className="profile-content">
        <div className="avatar-section">
          <div className="avatar-container">
            {getAvatarUrl() ? (
              <img 
                key={profile?.avatarUrl || 'avatar'} 
                src={getAvatarUrl()} 
                alt="Avatar" 
                className="avatar-image"
                style={{ display: 'block' }}
                onLoad={() => {
                  console.log('✅ Avatar image loaded successfully');
                }}
                onError={(e) => {
                  console.error('❌ Avatar image failed to load:', e.target.src);
                  // If image fails to load, hide image
                  e.target.style.display = 'none';
                }}
              />
            ) : null}
            {!getAvatarUrl() && (
              <div className="avatar-placeholder" style={{ display: 'flex' }}>
                {profile?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="avatar-overlay">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-upload-avatar"
                disabled={uploading}
              >
                {uploading ? 'Đang tải...' : '📷 Đổi ảnh đại diện'}
              </button>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>
