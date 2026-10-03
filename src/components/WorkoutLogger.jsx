import React, { useState, useEffect } from 'react';
import { createWorkout } from '../supabase.js';

export default function WorkoutLogger({ user, routines = [], onWorkoutCreated, onCancelActiveWorkout }) {
  const [exercise, setExercise] = useState('');
  const [duration, setDuration] = useState(45);
  const [mood, setMood] = useState('🔥 Crushed It');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Live Stopwatch Mode
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [isLiveRunning, setIsLiveRunning] = useState(false);

  const moods = [
    '🔥 Crushed It',
    '💪 Feeling Strong',
    '⚡ Energized',
    '😴 Exhausted',
    '🧘 Relaxed'
  ];

  // Stopwatch interval
  useEffect(() => {
    let interval = null;
    if (isLiveRunning) {
      interval = setInterval(() => {
        setLiveSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isLiveRunning]);

  function formatTime(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function handleStartLive(routineTitle) {
    setExercise(routineTitle || 'General Training Session');
    setLiveSeconds(0);
    setIsLiveRunning(true);
    setIsLiveActive(true);
  }

  function handleFinishLive() {
    const calculatedDuration = Math.max(1, Math.round(liveSeconds / 60));
    setDuration(calculatedDuration);
    setIsLiveRunning(false);
    setIsLiveActive(false);
    handleSubmitWorkout(null, calculatedDuration);
  }

  async function handleSubmitWorkout(e, overrideDuration) {
    if (e) e.preventDefault();

    const finalExercise = exercise.trim();
    if (!finalExercise) {
      setStatusMessage({ type: 'error', text: 'Please enter an exercise or routine name.' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    const finalDuration = overrideDuration || duration;

    try {
      const created = await createWorkout({
        exercise: finalExercise,
        duration: finalDuration,
        notes: notes.trim(),
        mood: mood,
        user_id: user?.id || null
      });

      setStatusMessage({
        type: 'success',
        text: `Recorded "${finalExercise}" (${finalDuration} min) to Supabase workouts & logs tables!`
      });

      // Reset form
      setExercise('');
      setNotes('');
      setLiveSeconds(0);

      onWorkoutCreated?.(created);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Failed to record workout: ' + (err.message || 'Database error')
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view-panel active" style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', background: '#000000', color: '#FFFFFF', minHeight: '100vh', padding: '16px' }}>
      {/* Header */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
        <div>
          <span className="brand-badge" style={{ marginBottom: '8px', display: 'inline-block', background: 'rgba(0, 255, 255, 0.1)', color: '#00FFFF', border: '1px solid rgba(0, 255, 255, 0.3)', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Supabase Workouts & Logs</span>
          <h2 style={{ fontFamily: 'Inter, SF Pro, sans-serif', fontSize: '1.6rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
            Workout Session Logger
          </h2>
          <p style={{ color: '#888888', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Log sessions manually or record real-time interval metrics with live HUD tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isLiveActive) {
              handleFinishLive();
            } else {
              handleStartLive(exercise || 'Live Training Session');
            }
          }}
          className={`btn ${isLiveActive ? 'btn-lime' : 'btn-primary'}`}
          style={{
            background: isLiveActive ? '#39FF14' : '#00FFFF',
            color: '#000000',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 0 16px ${isLiveActive ? 'rgba(57, 255, 20, 0.4)' : 'rgba(0, 255, 255, 0.4)'}`,
            minHeight: '44px'
          }}
        >
          {isLiveActive ? '⏹ Finish Active Session' : '⏱ Start Live Stopwatch'}
        </button>
      </div>

      {/* Live Stopwatch Panel */}
      {isLiveActive && (
        <div className="glass-card" style={{
          border: '1px solid #39FF14',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 0 30px rgba(57, 255, 20, 0.25)',
          background: 'linear-gradient(135deg, rgba(57, 255, 20, 0.1) 0%, rgba(0, 0, 0, 0.95) 100%)',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#39FF14', fontWeight: 700 }}>
                Live Session Active
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 0 0' }}>
                {exercise || 'Active Workout'}
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '2.5rem', fontWeight: 700, color: '#CCFF00', letterSpacing: '0.05em', textShadow: '0 0 12px rgba(204, 255, 0, 0.5)' }}>
                {formatTime(liveSeconds)}
              </div>
              <button
                type="button"
                onClick={() => setIsLiveRunning(!isLiveRunning)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, minHeight: '40px' }}
              >
                {isLiveRunning ? 'Pause' : 'Resume'}
              </button>
              <button
                type="button"
                onClick={handleFinishLive}
                className="btn btn-lime"
                style={{ background: '#39FF14', color: '#000000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 12px rgba(57, 255, 20, 0.3)', minHeight: '40px' }}
              >
                Finish & Log
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLiveActive(false);
                  setIsLiveRunning(false);
                  setLiveSeconds(0);
                }}
                className="btn btn-ghost"
                title="Cancel Live Workout"
                style={{ background: 'transparent', border: 'none', color: '#FF3131', fontSize: '1.2rem', cursor: 'pointer', padding: '6px 10px' }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Alert */}
      {statusMessage && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: statusMessage.type === 'error' ? 'rgba(255, 49, 49, 0.12)' : 'rgba(57, 255, 20, 0.12)',
          border: `1px solid ${statusMessage.type === 'error' ? '#FF3131' : '#39FF14'}`,
          color: statusMessage.type === 'error' ? '#FF3131' : '#39FF14',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: `0 0 12px ${statusMessage.type === 'error' ? 'rgba(255, 49, 49, 0.2)' : 'rgba(57, 255, 20, 0.2)'}`
        }}>
          <span>{statusMessage.type === 'error' ? '❌' : '🎉'}</span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Manual Logger Form */}
      <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
        <form onSubmit={(e) => handleSubmitWorkout(e)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Exercise Input & Routine Autocomplete */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: '#888888' }}>Exercise or Routine Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Incline Bench & Bicep Blast, or 5K Morning Run"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              required
              style={{ padding: '12px 14px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.95rem', outline: 'none', minHeight: '44px' }}
            />
            {routines.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: '#888888', alignSelf: 'center' }}>Or pick saved routine:</span>
                {routines.slice(0, 4).map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setExercise(r.title)}
                    className="exercise-tag"
                    style={{
                      cursor: 'pointer',
                      background: exercise === r.title ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${exercise === r.title ? '#00FFFF' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: exercise === r.title ? '#00FFFF' : '#FFFFFF',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Duration Slider & Quick Presets */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: '#888888' }}>Duration: <span style={{ color: '#00FFFF', fontWeight: 700, fontSize: '1rem' }}>{duration}</span> Minutes</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[15, 30, 45, 60, 90].map(dur => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setDuration(dur)}
                    className="quick-dur-btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: duration === dur ? 'rgba(0, 255, 255, 0.2)' : '#000000',
                      color: duration === dur ? '#00FFFF' : '#FFFFFF',
                      cursor: 'pointer',
                      minHeight: '32px'
                    }}
                  >
                    {dur}m
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min="5"
              max="180"
              step="5"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#00FFFF', cursor: 'pointer', marginTop: '4px' }}
            />
          </div>

          {/* Mood Selector */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: '#888888' }}>Workout Mood & Energy Level *</label>
            <div className="mood-selector" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {moods.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`mood-btn ${mood === m ? 'selected' : ''}`}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: mood === m ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${mood === m ? '#00FFFF' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: mood === m ? '#00FFFF' : '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: mood === m ? 600 : 400,
                    minHeight: '44px'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Training Notes */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: '#888888' }}>Training Notes (Weight, RPE, Progressive Overload)</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="e.g. Squats: 100kg x 4 sets x 8 reps. High bar felt comfortable. Form was clean throughout."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ padding: '12px 14px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.95rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '8px', background: '#00FFFF', color: '#000000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 16px rgba(0, 255, 255, 0.3)', minHeight: '48px' }}
          >
            {saving ? 'Recording to Supabase...' : 'Save Workout to Supabase'}
          </button>
        </form>
      </div>
    </div>
  );
}