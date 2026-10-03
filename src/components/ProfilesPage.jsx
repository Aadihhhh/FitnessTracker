import React, { useState, useEffect } from 'react';
import {
  getCurrentUser,
  getProfile,
  upsertProfile,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  subscribeAuthChange,
  testConnection
} from '../supabase.js';

export default function ProfilesPage({ user, onUserChange, workouts = [], routines = [] }) {
  const [profile, setProfile] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  useEffect(() => {
    testConnection().then(res => setSupabaseConnected(res.connected));
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadProfile(user.id);
    } else {
      setProfile(null);
      setNameInput('');
    }
  }, [user]);

  async function loadProfile(userId) {
    try {
      const data = await getProfile(userId);
      if (data) {
        setProfile(data);
        setNameInput(data.name || '');
      } else {
        setNameInput(user?.user_metadata?.name || user?.email?.split('@')[0] || '');
      }
    } catch (err) {
      console.warn('Error loading profile:', err);
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setMessage({ text: 'Please fill in both email and password.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isSignUp) {
        const { user: newUser } = await signUpWithEmail(emailInput, passwordInput, nameInput);
        if (newUser) {
          onUserChange?.(newUser);
          setMessage({ text: 'Account registered successfully and synced to Supabase profiles!', type: 'success' });
        }
      } else {
        const { user: loggedInUser } = await signInWithEmail(emailInput, passwordInput);
        if (loggedInUser) {
          onUserChange?.(loggedInUser);
          setMessage({ text: 'Welcome back! Signed in to Supabase.', type: 'success' });
        }
      }
      setPasswordInput('');
    } catch (err) {
      setMessage({ text: err.message || 'Authentication failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const updated = await upsertProfile({
        id: user.id,
        name: nameInput.trim() || user.email?.split('@')[0],
        email: user.email
      });
      setProfile(updated);
      setMessage({ text: 'Profile updated in Supabase profiles table!', type: 'success' });
    } catch (err) {
      setMessage({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
      onUserChange?.(null);
      setProfile(null);
      setMessage({ text: 'Signed out of Supabase.', type: 'info' });
    } catch (err) {
      setMessage({ text: err.message || 'Sign out failed', type: 'error' });
    }
  }

  return (
    <div className="view-panel active" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', background: '#000000', color: '#FFFFFF', minHeight: '100vh', padding: '16px' }}>
      {/* Header Card */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
        <div>
          <span className="brand-badge" style={{ marginBottom: '8px', display: 'inline-block', background: 'rgba(0, 255, 255, 0.1)', color: '#00FFFF', border: '1px solid rgba(0, 255, 255, 0.3)', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Supabase Profiles Table</span>
          <h2 style={{ fontFamily: 'Inter, SF Pro, sans-serif', fontSize: '1.6rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
            {user ? 'Athlete Profile' : 'Account & Authentication'}
          </h2>
          <p style={{ color: '#888888', fontSize: '0.9rem', marginTop: '4px', margin: '4px 0 0 0' }}>
            Manage identity, credentials, and Supabase database synchronization.
          </p>
        </div>

        {/* Connection Status Indicator */}
        <div className="status-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <span className="status-dot" style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: supabaseConnected ? '#39FF14' : '#FF3131',
            boxShadow: supabaseConnected ? '0 0 10px #39FF14' : '0 0 10px #FF3131',
            display: 'inline-block'
          }}></span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: supabaseConnected ? '#39FF14' : '#FF3131' }}>
            {supabaseConnected ? 'Supabase Connected' : 'Local Fallback'}
          </span>
        </div>
      </div>

      {/* Alert Banner */}
      {message.text && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: message.type === 'error' ? 'rgba(255, 49, 49, 0.12)' : 'rgba(57, 255, 20, 0.12)',
          border: `1px solid ${message.type === 'error' ? '#FF3131' : '#39FF14'}`,
          color: message.type === 'error' ? '#FF3131' : '#39FF14',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: `0 0 12px ${message.type === 'error' ? 'rgba(255, 49, 49, 0.2)' : 'rgba(57, 255, 20, 0.2)'}`
        }}>
          <span>{message.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Authenticated Profile View */}
      {user ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00FFFF, #A855F7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#FFFFFF',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)'
              }}>
                {(profile?.name || user.email || 'A').substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{profile?.name || 'Athlete'}</h3>
                <p style={{ color: '#888888', fontSize: '0.88rem', margin: '4px 0' }}>{user.email}</p>
                <span style={{ fontSize: '0.72rem', color: '#666666', fontFamily: 'monospace' }}>
                  UUID: {user.id}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="btn btn-ghost"
                style={{
                  color: '#FF3131',
                  border: '1px solid rgba(255, 49, 49, 0.4)',
                  background: 'rgba(255, 49, 49, 0.1)',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  minHeight: '44px'
                }}
              >
                Sign Out
              </button>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#888888' }}>Display Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter full name"
                  required
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#000000',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    fontSize: '0.95rem',
                    outline: 'none',
                    minHeight: '44px'
                  }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#888888' }}>Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  value={user.email || ''}
                  disabled
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#888888',
                    fontSize: '0.95rem',
                    cursor: 'not-allowed',
                    minHeight: '44px'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  alignSelf: 'flex-start',
                  background: '#00FFFF',
                  color: '#000000',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(0, 255, 255, 0.3)',
                  minHeight: '48px',
                  width: '100%',
                  maxWidth: '240px'
                }}
              >
                {loading ? 'Saving to Supabase...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>

          {/* Activity Summary for User */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workouts Recorded</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#00FFFF', marginTop: '6px', textShadow: '0 0 10px rgba(0, 255, 255, 0.3)' }}>
                {workouts.length}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Routines Designed</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#A855F7', marginTop: '6px', textShadow: '0 0 10px rgba(168, 85, 247, 0.3)' }}>
                {routines.length}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Member Since</span>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#39FF14', marginTop: '10px' }}>
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Sign In / Sign Up Form */
        <div className="glass-card" style={{ maxWidth: '480px', margin: '0 auto', width: '100%', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '24px' }}>
            <button
              type="button"
              className={`btn btn-ghost ${!isSignUp ? 'active' : ''}`}
              onClick={() => setIsSignUp(false)}
              style={{
                flex: 1,
                padding: '12px',
                background: 'transparent',
                color: !isSignUp ? '#00FFFF' : '#888888',
                border: 'none',
                borderBottom: !isSignUp ? '2px solid #00FFFF' : 'none',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn btn-ghost ${isSignUp ? 'active' : ''}`}
              onClick={() => setIsSignUp(true)}
              style={{
                flex: 1,
                padding: '12px',
                background: 'transparent',
                color: isSignUp ? '#00FFFF' : '#888888',
                border: 'none',
                borderBottom: isSignUp ? '2px solid #00FFFF' : 'none',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isSignUp && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#888888' }}>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Alex Morgan"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#000000',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    fontSize: '0.95rem',
                    outline: 'none',
                    minHeight: '44px'
                  }}
                />
              </div>
            )}

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#888888' }}>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="athlete@fitnesstracker.app"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: '#000000',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  outline: 'none',
                  minHeight: '44px'
                }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#888888' }}>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: '#000000',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  outline: 'none',
                  minHeight: '44px'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '8px',
                background: '#00FFFF',
                color: '#000000',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(0, 255, 255, 0.3)',
                minHeight: '48px'
              }}
            >
              {loading ? 'Processing Supabase Auth...' : (isSignUp ? 'Create Supabase Account' : 'Sign In')}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#888888', marginTop: '12px' }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                style={{ background: 'none', border: 'none', color: '#00FFFF', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </form>
        </div>
      )}
    </div>
  );
}