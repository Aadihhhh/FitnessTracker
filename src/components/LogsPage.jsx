import React, { useState } from 'react';
import { deleteWorkout } from '../supabase.js';

export default function LogsPage({ workouts = [], onWorkoutDeleted }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMood, setSelectedMood] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [activeDetailModal, setActiveDetailModal] = useState(null);

  const moods = [
    { name: '🔥 Crushed It', color: '#39FF14' },
    { name: '💪 Feeling Strong', color: '#00FFFF' },
    { name: '⚡ Energized', color: '#FFD700' },
    { name: '😴 Exhausted', color: '#A855F7' },
    { name: '🧘 Relaxed', color: '#3B82F6' }
  ];

  // Filtering
  let filtered = workouts.filter(w => {
    const matchSearch =
      (w.exercise && w.exercise.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.notes && w.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchMood = selectedMood === 'ALL' || w.mood === selectedMood;
    return matchSearch && matchMood;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    } else if (sortBy === 'oldest') {
      return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    } else if (sortBy === 'duration') {
      return (b.duration || 0) - (a.duration || 0);
    }
    return 0;
  });

  // Analytics Computations
  const totalWorkouts = workouts.length;
  const totalMinutes = workouts.reduce((acc, w) => acc + (parseInt(w.duration, 10) || 0), 0);
  const avgDuration = totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0;

  // 7-Day Volume Computation
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayVolumes = [0, 0, 0, 0, 0, 0, 0];

  workouts.forEach(w => {
    if (w.timestamp) {
      const d = new Date(w.timestamp);
      const dayIdx = (d.getDay() + 6) % 7; // Convert Sun(0) to Mon(0)...Sun(6)
      dayVolumes[dayIdx] += (parseInt(w.duration, 10) || 0);
    }
  });

  const maxVolume = Math.max(...dayVolumes, 45);

  // Mood counts
  const moodCounts = moods.map(m => {
    const count = workouts.filter(w => w.mood === m.name).length;
    const pct = totalWorkouts > 0 ? Math.round((count / totalWorkouts) * 100) : 0;
    return { ...m, count, pct };
  });

  async function handleDelete(workoutId) {
    if (confirm('Delete this workout log from Supabase?')) {
      await deleteWorkout(workoutId);
      if (activeDetailModal?.id === workoutId) {
        setActiveDetailModal(null);
      }
      onWorkoutDeleted?.(workoutId);
    }
  }

  return (
    <div className="view-panel active" style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: '#000000', color: '#FFFFFF', minHeight: '100vh', padding: '16px' }}>
      {/* Header */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
        <div>
          <span className="brand-badge" style={{ marginBottom: '8px', display: 'inline-block', background: 'rgba(0, 255, 255, 0.1)', color: '#00FFFF', border: '1px solid rgba(0, 255, 255, 0.3)', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Supabase Logs Table</span>
          <h2 style={{ fontFamily: 'Inter, SF Pro, sans-serif', fontSize: '1.6rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
            Workout Logs & Analytics
          </h2>
          <p style={{ color: '#888888', fontSize: '0.9rem', marginTop: '4px', margin: '4px 0 0 0' }}>
            Comprehensive records synced with Supabase <code style={{ color: '#00FFFF', fontFamily: 'monospace' }}>workouts</code> & <code style={{ color: '#00FFFF', fontFamily: 'monospace' }}>logs</code> tables.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span className="brand-badge" style={{ color: '#00FFFF', border: '1px solid rgba(0, 255, 255, 0.3)', background: 'rgba(0, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600 }}>
            {totalWorkouts} Total Logs
          </span>
          <span className="brand-badge" style={{ color: '#39FF14', border: '1px solid rgba(57, 255, 20, 0.3)', background: 'rgba(57, 255, 20, 0.08)', padding: '6px 12px', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600 }}>
            {totalMinutes} min volume
          </span>
        </div>
      </div>

      {/* Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Weekly Volume Chart */}
        <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Weekly Volume Trend</h3>
            <span style={{ fontSize: '0.8rem', color: '#00FFFF', fontWeight: 600 }}>
              {dayVolumes.reduce((a, b) => a + b, 0)} min this week
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '170px', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', gap: '8px' }}>
            {days.map((day, idx) => {
              const vol = dayVolumes[idx];
              const heightPercent = Math.max(10, Math.round((vol / maxVolume) * 100));
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} title={`${day}: ${vol} min`}>
                  <span style={{ fontSize: '0.72rem', color: '#00FFFF', fontWeight: 600, marginBottom: '6px' }}>
                    {vol > 0 ? `${vol}m` : ''}
                  </span>
                  <div style={{
                    width: '100%',
                    maxWidth: '32px',
                    height: `${heightPercent}%`,
                    background: 'linear-gradient(180deg, #00FFFF, rgba(0, 255, 255, 0.2))',
                    borderRadius: '6px 6px 0 0',
                    boxShadow: '0 0 12px rgba(0, 255, 255, 0.3)',
                    transition: 'height 0.4s ease'
                  }}></div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.75rem', color: '#888888' }}>
            {days.map(d => <span key={d}>{d}</span>)}
          </div>
        </div>

        {/* Mood Distribution */}
        <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', margin: '0 0 16px 0' }}>
            Mood & Sentiment Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {moodCounts.map(m => (
              <div key={m.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>{m.name}</span>
                  <span style={{ fontWeight: 600, color: m.color }}>{m.count} logs ({m.pct}%)</span>
                </div>
                <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.pct}%`, background: m.color, borderRadius: '9999px', boxShadow: `0 0 8px ${m.color}`, transition: 'width 0.4s ease' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Session Length</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#00FFFF', marginTop: '4px', textShadow: '0 0 8px rgba(0, 255, 255, 0.3)' }}>
            {avgDuration} mins
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Most Frequent Mood</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#39FF14', marginTop: '6px', textShadow: '0 0 8px rgba(57, 255, 20, 0.3)' }}>
            {[...moodCounts].sort((a, b) => b.count - a.count)[0]?.count > 0
              ? [...moodCounts].sort((a, b) => b.count - a.count)[0].name
              : '💪 Feeling Strong'}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Database Rows</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
            {totalWorkouts}
          </div>
        </div>
      </div>

      {/* Workout Logs Feed */}
      <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Workout History & Logs</h3>

          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end', maxWidth: '100%' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search exercise, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                minWidth: '160px',
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />

            <select
              className="form-select"
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              style={{
                width: '140px',
                padding: '10px',
                borderRadius: '8px',
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            >
              <option value="ALL">All Moods</option>
              {moods.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>

            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '120px',
                padding: '10px',
                borderRadius: '8px',
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="duration">Longest</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#888888' }}>
            No workouts found matching your filter criteria.
          </div>
        ) : (
          <div className="recent-table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="workout-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#888888', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px 8px' }}>Exercise / Routine</th>
                  <th style={{ padding: '12px 8px' }}>Duration</th>
                  <th style={{ padding: '12px 8px' }}>Mood & Energy</th>
                  <th style={{ padding: '12px 8px' }}>Notes</th>
                  <th style={{ padding: '12px 8px' }}>Date</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => {
                  const dateStr = w.timestamp
                    ? new Date(w.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    : 'Today';

                  return (
                    <tr key={w.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600, color: '#FFFFFF' }}>{w.exercise || 'Workout Session'}</td>
                      <td style={{ padding: '12px 8px' }}><span style={{ color: '#00FFFF', fontWeight: 600 }}>{w.duration || 0} min</span></td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.8rem',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'inline-block'
                        }}>
                          {w.mood || '💪 Feeling Strong'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#888888', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.notes || '—'}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#666666', fontSize: '0.8rem' }}>{dateStr}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => setActiveDetailModal(w)}
                          className="table-action-btn"
                          title="View Details"
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(0, 255, 255, 0.4)',
                            color: '#00FFFF',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            minHeight: '36px'
                          }}
                        >
                          🔍 Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(w.id)}
                          className="table-action-btn delete"
                          title="Delete Record"
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 49, 49, 0.4)',
                            color: '#FF3131',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            marginLeft: '6px',
                            minHeight: '36px'
                          }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {activeDetailModal && (
        <div className="modal-overlay active" onClick={() => setActiveDetailModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ background: '#000000', border: '1px solid rgba(0, 255, 255, 0.3)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 0 24px rgba(0, 255, 255, 0.2)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>{activeDetailModal.exercise || 'Workout Session'}</h3>
              <button className="close-modal-btn" onClick={() => setActiveDetailModal(null)} style={{ background: 'transparent', border: 'none', color: '#888888', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '8px' }}>
                <span style={{ color: '#888888' }}>Duration:</span>
                <span style={{ color: '#00FFFF', fontWeight: 700 }}>{activeDetailModal.duration || 0} minutes</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '8px' }}>
                <span style={{ color: '#888888' }}>Mood & Energy:</span>
                <span className="brand-badge" style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.85rem' }}>{activeDetailModal.mood || '💪 Feeling Strong'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '8px' }}>
                <span style={{ color: '#888888' }}>Timestamp:</span>
                <span style={{ fontSize: '0.85rem' }}>{activeDetailModal.timestamp ? new Date(activeDetailModal.timestamp).toLocaleString() : 'N/A'}</span>
              </div>
              <div>
                <span style={{ color: '#888888', display: 'block', marginBottom: '6px' }}>Training Notes:</span>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '12px', fontSize: '0.9rem', color: '#FFFFFF', lineHeight: 1.5 }}>
                  {activeDetailModal.notes || 'No notes entered for this workout.'}
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#555555', fontFamily: 'monospace' }}>
                Workout UUID: {activeDetailModal.id}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setActiveDetailModal(null)} className="btn btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 600, minHeight: '44px' }}>
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(activeDetailModal.id)}
                  className="btn btn-ghost"
                  style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255, 49, 49, 0.15)', color: '#FF3131', border: '1px solid rgba(255, 49, 49, 0.3)', cursor: 'pointer', fontWeight: 600, minHeight: '44px' }}
                >
                  Delete Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}