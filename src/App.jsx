import React, { useState, useEffect, useRef } from 'react';
import ProfilesPage from './components/ProfilesPage.jsx';
import WorkoutLogger from './components/WorkoutLogger.jsx';
import RoutineBuilder from './components/RoutineBuilder.jsx';
import LogsPage from './components/LogsPage.jsx';
import {
  testConnection,
  getCurrentUser,
  subscribeAuthChange,
  getWorkouts,
  getRoutines,
  createWorkout,
  initSeedData
} from './supabase.js';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [toast, setToast] = useState(null);

  // Active Live Workout HUD State
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Initialize data and listeners
  useEffect(() => {
    initSeedData();

    // Check Supabase connection
    testConnection().then(res => setSupabaseConnected(res.connected));

    // Get current user
    getCurrentUser().then(u => {
      setUser(u);
      loadUserData(u?.id);
    });

    // Listen to real-time auth changes
    const { data: authSubscription } = subscribeAuthChange((event, newUser) => {
      setUser(newUser);
      loadUserData(newUser?.id);
      if (event === 'SIGNED_IN') {
        showToast('Signed in successfully to Supabase!', 'success');
      } else if (event === 'SIGNED_OUT') {
        showToast('Signed out of Supabase.', 'info');
      }
    });

    return () => {
      authSubscription?.subscription?.unsubscribe?.();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function loadUserData(userId) {
    try {
      const [fetchedWorkouts, fetchedRoutines] = await Promise.all([
        getWorkouts(userId),
        getRoutines(userId)
      ]);
      setWorkouts(fetchedWorkouts);
      setRoutines(fetchedRoutines);
    } catch (err) {
      console.warn('Error loading initial data:', err);
    }
  }

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Confetti trigger
  function triggerConfetti() {
    const count = 50;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.left = (Math.random() * 100) + 'vw';
      el.style.top = '-10px';
      el.style.width = (Math.random() * 8 + 6) + 'px';
      el.style.height = (Math.random() * 14 + 8) + 'px';
      el.style.backgroundColor = ['#00F0FF', '#10B981', '#CCFF00', '#8B5CF6', '#F59E0B'][Math.floor(Math.random() * 5)];
      el.style.zIndex = '9999';
      el.style.borderRadius = '2px';
      el.style.pointerEvents = 'none';
      el.style.transform = `rotate(${Math.random() * 360}deg)`;
      el.style.transition = `transform ${Math.random() * 2 + 1.5}s ease-out, top ${Math.random() * 2 + 1.5}s ease-in, opacity ${Math.random() * 1.5 + 1.5}s ease-out`;
      document.body.appendChild(el);

      requestAnimationFrame(() => {
        el.style.top = '105vh';
        el.style.opacity = '0';
        el.style.transform = `rotate(${Math.random() * 720}deg) scale(${Math.random() * 0.8 + 0.4})`;
      });

      setTimeout(() => el.remove(), 3500);
    }
  }

  // Active workout HUD timer controls
  function startWorkout(workoutTitle) {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveSession(workoutTitle || 'Active Training Session');
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    showToast(`Started live session "${workoutTitle}"!`, 'success');
  }

  async function finishWorkout() {
    if (!activeSession) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const durationMin = Math.max(1, Math.round(elapsedSeconds / 60));
    const title = activeSession;
    setActiveSession(null);

    try {
      const created = await createWorkout({
        exercise: title,
        duration: durationMin,
        notes: `Recorded via live timer session (${durationMin} mins).`,
        mood: '🔥 Crushed It',
        user_id: user?.id || null
      });

      setWorkouts(prev => [created, ...prev]);
      triggerConfetti();
      showToast(`Finished! Logged ${durationMin} min session to Supabase.`, 'success');
    } catch (err) {
      showToast('Error saving workout: ' + err.message, 'error');
    }
  }

  function cancelWorkout() {
    if (confirm('Cancel active workout session?')) {
      if (timerRef.current) clearInterval(timerRef.current);
      setActiveSession(null);
      setElapsedSeconds(0);
      showToast('Workout canceled.', 'info');
    }
  }

  function formatTime(totalSec) {
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  // Handlers for state updates from child components
  function handleWorkoutCreated(newWo) {
    setWorkouts(prev => [newWo, ...prev]);
    triggerConfetti();
    showToast(`Workout "${newWo.exercise}" recorded!`, 'success');
  }

  function handleWorkoutDeleted(deletedId) {
    setWorkouts(prev => prev.filter(w => w.id !== deletedId));
    showToast('Workout deleted from Supabase.', 'info');
  }

  function handleRoutineCreated(newRt) {
    setRoutines(prev => [newRt, ...prev]);
    showToast(`Routine "${newRt.title}" saved!`, 'success');
  }

  function handleRoutineDeleted(deletedId) {
    setRoutines(prev => prev.filter(r => r.id !== deletedId));
    showToast('Routine deleted from Supabase.', 'info');
  }

  // Titles mapping
  const viewTitles = {
    dashboard: { title: 'Training Dashboard', subtitle: 'Track workouts, routines, and AI suggestions with Supabase sync' },
    workouts: { title: 'Log Workout Session', subtitle: 'Record completed exercises, duration, and mood to Supabase' },
    routines: { title: 'Routine Builder', subtitle: 'Build and manage custom routines saved in Supabase routines table' },
    logs: { title: 'Workout Logs & Analytics', subtitle: 'Analyze training volume and mood sentiment trends over time' },
    profile: { title: 'Athlete Profile & Settings', subtitle: 'Manage identity, credentials, and Supabase database synchronization' }
  };

  const currentMeta = viewTitles[currentView] || viewTitles.dashboard;

  return (
    <div id="app">
      {/* Desktop Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-wrapper">
          <div className="brand-logo-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="brand-title">FitnessTracker</div>
            <span className="brand-badge">Supabase + Gemini</span>
          </div>
        </div>

        <ul className="nav-menu">
          <li>
            <button
              className={`nav-item-btn ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="9" rx="1" strokeLinecap="round"/>
                <rect x="14" y="3" width="7" height="5" rx="1" strokeLinecap="round"/>
                <rect x="14" y="12" width="7" height="9" rx="1" strokeLinecap="round"/>
                <rect x="3" y="16" width="7" height="5" rx="1" strokeLinecap="round"/>
              </svg>
              Dashboard
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${currentView === 'workouts' ? 'active' : ''}`}
              onClick={() => setCurrentView('workouts')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Log Workout
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${currentView === 'routines' ? 'active' : ''}`}
              onClick={() => setCurrentView('routines')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Routine Builder
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${currentView === 'logs' ? 'active' : ''}`}
              onClick={() => setCurrentView('logs')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 3v18h18" strokeLinecap="round"/>
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Logs & Analytics
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => setCurrentView('profile')}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Profile
            </button>
          </li>
        </ul>

        {/* Sidebar Footer User Card */}
        <div className="sidebar-footer">
          <div className="user-card" onClick={() => setCurrentView('profile')}>
            <div className="user-avatar">
              {(user?.user_metadata?.name || user?.email || 'GA').substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">
                {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Guest Athlete'}
              </span>
              <span className="user-role">
                {user ? user.email : 'Tap to sign in'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Header Bar */}
        <header className="top-header">
          <div className="header-title-box">
            <h1>{currentMeta.title}</h1>
            <p>{currentMeta.subtitle}</p>
          </div>

          <div className="header-actions">
            <div className="status-pill" onClick={() => testConnection().then(res => setSupabaseConnected(res.connected))} style={{ cursor: 'pointer' }}>
              <span className="status-dot" style={{ background: supabaseConnected ? 'var(--accent-lime)' : 'var(--accent-amber)' }}></span>
              <span>{supabaseConnected ? 'Supabase Connected' : 'Local Fallback'}</span>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => {
                showToast('Syncing with Supabase...', 'info');
                loadUserData(user?.id);
                testConnection().then(res => setSupabaseConnected(res.connected));
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              Sync
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const firstRoutine = routines[0];
                startWorkout(firstRoutine ? firstRoutine.title : 'Full Body Functional Blitz');
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Quick Start
            </button>
          </div>
        </header>

        {/* Floating Active Workout HUD */}
        {activeSession && (
          <div className="active-workout-hud visible">
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-lime)', fontWeight: 700 }}>
                Workout In Progress
              </span>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF' }}>
                {activeSession}
              </h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Active stopwatch running & recording volume
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="hud-timer">{formatTime(elapsedSeconds)}</div>
              <button className="btn btn-lime" onClick={finishWorkout}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Finish & Log
              </button>
              <button className="btn btn-ghost" onClick={cancelWorkout} title="Cancel session">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Active View Router */}
        {currentView === 'dashboard' && (
          <div className="view-panel active">
            {/* KPI Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Workouts</span>
                  <div className="stat-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                  </div>
                </div>
                <div className="stat-value">{workouts.length}</div>
                <div className="stat-subtext">Supabase workouts table</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Minutes</span>
                  <div className="stat-icon" style={{ color: 'var(--accent-lime)', background: 'rgba(16, 185, 129, 0.1)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                </div>
                <div className="stat-value">
                  {workouts.reduce((acc, w) => acc + (parseInt(w.duration, 10) || 0), 0)}m
                </div>
                <div className="stat-subtext">Total logged volume</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Saved Routines</span>
                  <div className="stat-icon" style={{ color: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.1)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                  </div>
                </div>
                <div className="stat-value">{routines.length}</div>
                <div className="stat-subtext" style={{ color: 'var(--accent-purple)' }}>Custom & AI routines</div>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="action-banner">
              <div className="action-banner-content">
                <h3>🤖 Design Next Session with Gemini AI</h3>
                <p>Generate tailored progressive workouts with warm-ups, exercise circuits, and cooldowns directly into Supabase.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setCurrentView('routines')}>
                Open AI Architect
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>

            {/* Render Logs table summary inside Dashboard */}
            <LogsPage workouts={workouts} onWorkoutDeleted={handleWorkoutDeleted} />
          </div>
        )}

        {currentView === 'workouts' && (
          <WorkoutLogger
            user={user}
            routines={routines}
            onWorkoutCreated={handleWorkoutCreated}
          />
        )}

        {currentView === 'routines' && (
          <RoutineBuilder
            user={user}
            routines={routines}
            onRoutineCreated={handleRoutineCreated}
            onRoutineDeleted={handleRoutineDeleted}
            onStartWorkout={startWorkout}
          />
        )}

        {currentView === 'logs' && (
          <LogsPage
            workouts={workouts}
            onWorkoutDeleted={handleWorkoutDeleted}
          />
        )}

        {currentView === 'profile' && (
          <ProfilesPage
            user={user}
            onUserChange={setUser}
            workouts={workouts}
            routines={routines}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <button
          className={`mobile-nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/></svg>
          Home
        </button>
        <button
          className={`mobile-nav-btn ${currentView === 'workouts' ? 'active' : ''}`}
          onClick={() => setCurrentView('workouts')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Log
        </button>
        <button
          className={`mobile-nav-btn ${currentView === 'routines' ? 'active' : ''}`}
          onClick={() => setCurrentView('routines')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          Routines
        </button>
        <button
          className={`mobile-nav-btn ${currentView === 'logs' ? 'active' : ''}`}
          onClick={() => setCurrentView('logs')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
          Logs
        </button>
        <button
          className={`mobile-nav-btn ${currentView === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentView('profile')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile
        </button>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
