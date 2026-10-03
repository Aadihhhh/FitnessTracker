import React, { useState } from 'react';
import { createRoutine, deleteRoutine } from '../supabase.js';
import { generateWorkoutRoutine } from '../gemini.js';

export default function RoutineBuilder({ user, routines = [], onRoutineCreated, onRoutineDeleted, onStartWorkout }) {
  // Routine Builder State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState([
    { name: 'Barbell Bench Press', sets: 4, reps: '8-10 reps', rest: '90s' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '12 reps', rest: '60s' },
    { name: 'Cable Chest Flyes', sets: 3, reps: '15 reps', rest: '45s' }
  ]);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Gemini AI Assistant State
  const [aiGoal, setAiGoal] = useState('Hypertrophy & Muscle Building');
  const [aiFocus, setAiFocus] = useState('Full Body');
  const [aiLevel, setAiLevel] = useState('Intermediate');
  const [aiDuration, setAiDuration] = useState(45);
  const [aiEquipment, setAiEquipment] = useState('Dumbbells & Bodyweight');
  const [aiEnergy, setAiEnergy] = useState('⚡ High Energy & Ready to Push');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedRoutine, setGeneratedRoutine] = useState(null);

  // Search filter for saved routines
  const [searchQuery, setSearchQuery] = useState('');

  // Exercise builder helpers
  function handleAddExercise() {
    setExercises(prev => [...prev, { name: '', sets: 3, reps: '12 reps', rest: '60s' }]);
  }

  function handleExerciseChange(index, field, value) {
    setExercises(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleRemoveExercise(index) {
    if (exercises.length <= 1) {
      setStatusMessage({ type: 'error', text: 'A routine must have at least one exercise.' });
      return;
    }
    setExercises(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSaveCustomRoutine(e) {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a routine title.' });
      return;
    }

    const validExercises = exercises.filter(ex => ex.name.trim() !== '');
    if (validExercises.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please add at least one valid exercise.' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const saved = await createRoutine({
        title: title.trim(),
        description: description.trim(),
        exercises: validExercises,
        user_id: user?.id || null
      });

      setStatusMessage({ type: 'success', text: `Saved "${saved.title}" to Supabase routines table!` });
      setTitle('');
      setDescription('');
      onRoutineCreated?.(saved);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to save routine: ' + (err.message || 'Database error') });
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateAIWorkout(e) {
    e.preventDefault();
    setAiGenerating(true);
    setStatusMessage(null);

    try {
      const res = await generateWorkoutRoutine({
        goal: aiGoal,
        focus: aiFocus,
        level: aiLevel,
        duration: aiDuration,
        equipment: aiEquipment,
        mood: aiEnergy
      });
      setGeneratedRoutine(res);
      setStatusMessage({ type: 'success', text: 'Gemini generated your custom progressive workout!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'AI generation error: ' + (err.message || 'Service unavailable') });
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleSaveAIRoutine() {
    if (!generatedRoutine) return;
    setSaving(true);

    try {
      const saved = await createRoutine({
        title: generatedRoutine.title,
        description: generatedRoutine.description,
        exercises: generatedRoutine.exercises,
        user_id: user?.id || null
      });
      setStatusMessage({ type: 'success', text: `AI Routine "${saved.title}" saved to Supabase routines!` });
      onRoutineCreated?.(saved);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to save AI routine: ' + err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRoutine(routineId) {
    if (confirm('Delete this routine from Supabase?')) {
      try {
        await deleteRoutine(routineId);
        onRoutineDeleted?.(routineId);
        setStatusMessage({ type: 'info', text: 'Routine deleted from Supabase.' });
      } catch (err) {
        setStatusMessage({ type: 'error', text: 'Error deleting routine: ' + err.message });
      }
    }
  }

  const filteredRoutines = routines.filter(r =>
    (r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="view-panel active" style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: '#000000', color: '#FFFFFF', minHeight: '100vh', padding: '16px' }}>
      {/* Page Header */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
        <div>
          <span className="brand-badge" style={{ marginBottom: '8px', display: 'inline-block', background: 'rgba(0, 255, 255, 0.1)', color: '#00FFFF', border: '1px solid rgba(0, 255, 255, 0.3)', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Supabase Routines Table</span>
          <h2 style={{ fontFamily: 'Inter, SF Pro, sans-serif', fontSize: '1.6rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
            Routine Builder & AI Architect
          </h2>
          <p style={{ color: '#888888', fontSize: '0.9rem', marginTop: '4px', margin: '4px 0 0 0' }}>
            Build custom progressive routines or generate evidence-based workouts using Google Gemini 3.8 Flash.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span className="brand-badge" style={{ color: '#39FF14', borderColor: 'rgba(57, 255, 20, 0.3)', background: 'rgba(57, 255, 20, 0.08)', padding: '6px 12px', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600 }}>
            {routines.length} Saved Routines
          </span>
        </div>
      </div>

      {/* Alert Notice */}
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
          <span>{statusMessage.type === 'error' ? '❌' : '⚡'}</span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* SECTION 1: AI COACH GENERATOR */}
      <div className="glass-card ai-card" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0, 255, 255, 0.2)', borderRadius: '16px', padding: '20px', boxShadow: '0 0 20px rgba(0, 255, 255, 0.05)' }}>
        <div style={{ marginBottom: '18px' }}>
          <span className="brand-badge" style={{ marginBottom: '6px', display: 'inline-block', background: 'rgba(0, 255, 255, 0.1)', color: '#00FFFF', border: '1px solid rgba(0, 255, 255, 0.3)', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Google Gemini Intelligence</span>
          <h3 style={{ fontFamily: 'Inter, SF Pro, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
            AI Workout Architect
          </h3>
          <p style={{ color: '#888888', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            Calibrate training variables: muscle target, equipment, duration, and fatigue state.
          </p>
        </div>

        <form onSubmit={handleGenerateAIWorkout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#888888' }}>Training Goal</label>
              <select className="form-select" value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} style={{ padding: '12px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.9rem', outline: 'none', minHeight: '44px' }}>
                <option value="Hypertrophy & Muscle Building">Hypertrophy & Muscle Building</option>
                <option value="Maximal Strength & Power">Maximal Strength & Power</option>
                <option value="Fat Loss & HIIT Conditioning">Fat Loss & HIIT Conditioning</option>
                <option value="Endurance & Cardio Health">Endurance & Cardio Health</option>
                <option value="Functional Mobility & Core">Functional Mobility & Core</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#888888' }}>Focus Muscle Area</label>
              <select className="form-select" value={aiFocus} onChange={(e) => setAiFocus(e.target.value)} style={{ padding: '12px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.9rem', outline: 'none', minHeight: '44px' }}>
                <option value="Full Body">Full Body</option>
                <option value="Upper Body">Upper Body (Chest, Back, Arms)</option>
                <option value="Lower Body">Lower Body (Quads, Glutes, Hamstrings)</option>
                <option value="Core & HIIT">Core & HIIT</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#888888' }}>Experience Level</label>
              <select className="form-select" value={aiLevel} onChange={(e) => setAiLevel(e.target.value)} style={{ padding: '12px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.9rem', outline: 'none', minHeight: '44px' }}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#888888' }}>Target Duration</label>
              <select className="form-select" value={aiDuration} onChange={(e) => setAiDuration(parseInt(e.target.value, 10))} style={{ padding: '12px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.9rem', outline: 'none', minHeight: '44px' }}>
                <option value={15}>15 Minutes (Blitz)</option>
                <option value={30}>30 Minutes (Efficient)</option>
                <option value={45}>45 Minutes (Optimal)</option>
                <option value={60}>60 Minutes (Volume)</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#888888' }}>Available Equipment</label>
              <select className="form-select" value={aiEquipment} onChange={(e) => setAiEquipment(e.target.value)} style={{ padding: '12px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.9rem', outline: 'none', minHeight: '44px' }}>
                <option value="Dumbbells & Bodyweight">Dumbbells & Bodyweight</option>
                <option value="Full Commercial Gym">Full Commercial Gym</option>
                <option value="Bodyweight Only (Zero Equipment)">Bodyweight Only</option>
                <option value="Resistance Bands & Kettlebells">Bands & Kettlebells</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#888888' }}>Energy State</label>
              <select className="form-select" value={aiEnergy} onChange={(e) => setAiEnergy(e.target.value)} style={{ padding: '12px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.9rem', outline: 'none', minHeight: '44px' }}>
                <option value="⚡ High Energy & Ready to Push">⚡ High Energy & Ready to Push</option>
                <option value="💪 Moderate Energy">💪 Moderate Energy</option>
                <option value="🧘 Low Energy / Active Recovery">🧘 Low Energy / Active Recovery</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={aiGenerating} style={{ background: '#00FFFF', color: '#000000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 16px rgba(0, 255, 255, 0.3)', minHeight: '48px' }}>
              {aiGenerating ? '🧠 Gemini is computing...' : 'Generate AI Workout'}
            </button>
            {aiGenerating && (
              <span style={{ color: '#00FFFF', fontSize: '0.88rem' }}>
                Analyzing biomechanics and progressive volume...
              </span>
            )}
          </div>
        </form>

        {/* AI Result Presentation */}
        {generatedRoutine && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="brand-badge" style={{ color: '#00FFFF', background: 'rgba(0, 255, 255, 0.1)', padding: '4px 8px', borderRadius: '9999px', fontSize: '0.75rem' }}>
                  {generatedRoutine.isAI ? `Gemini 3.8 Flash (${generatedRoutine.model})` : 'AI Biomechanical Engine'}
                </span>
                <h4 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', marginTop: '6px', margin: '6px 0 0 0' }}>
                  {generatedRoutine.title}
                </h4>
                <p style={{ color: '#888888', fontSize: '0.9rem', marginTop: '4px', maxWidth: '700px' }}>
                  {generatedRoutine.description}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" onClick={handleSaveAIRoutine} disabled={saving} className="btn btn-lime" style={{ background: '#39FF14', color: '#000000', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', minHeight: '44px', boxShadow: '0 0 12px rgba(57, 255, 20, 0.3)' }}>
                  Save to My Routines
                </button>
                <button
                  type="button"
                  onClick={() => onStartWorkout?.(generatedRoutine.title)}
                  className="btn btn-primary"
                  style={{ background: '#00FFFF', color: '#000000', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', minHeight: '44px', boxShadow: '0 0 12px rgba(0, 255, 255, 0.3)' }}
                >
                  Start Workout
                </button>
              </div>
            </div>

            {/* Exercises Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '18px' }}>
              {(generatedRoutine.exercises || []).map((ex, idx) => (
                <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.95rem' }}>{ex.name}</div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#00FFFF', margin: '6px 0', fontWeight: 600 }}>
                    <span>{ex.sets} sets</span> • <span>{ex.reps}</span> • <span>Rest: {ex.rest || '60s'}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#888888', margin: 0 }}>💡 {ex.cues || 'Maintain proper form and core brace.'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: MANUAL ROUTINE BUILDER */}
      <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontFamily: 'Inter, SF Pro, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px', margin: '0 0 6px 0' }}>
          Create Custom Routine
        </h3>
        <p style={{ color: '#888888', fontSize: '0.88rem', marginBottom: '20px', margin: '0 0 20px 0' }}>
          Assemble custom exercise blocks with custom sets, reps, and target rest intervals.
        </p>

        <form onSubmit={handleSaveCustomRoutine} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: '#888888' }}>Routine Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Posterior Chain & Glute Hypertrophy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ padding: '12px 14px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.95rem', outline: 'none', minHeight: '44px' }}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: '#888888' }}>Description / Objective</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Heavy deadlifts followed by tempo Romanian deadlifts and Bulgarian split squats."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ padding: '12px 14px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.95rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Exercises ({exercises.length})
              </label>
              <button type="button" onClick={handleAddExercise} className="btn btn-secondary" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', minHeight: '36px' }}>
                + Add Exercise
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {exercises.map((ex, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr)) auto', gap: '8px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Exercise Name"
                    value={ex.name}
                    onChange={(e) => handleExerciseChange(idx, 'name', e.target.value)}
                    required
                    style={{ padding: '10px', borderRadius: '6px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.88rem', minHeight: '40px', gridColumn: 'span 2' }}
                  />
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Sets"
                    value={ex.sets}
                    min="1"
                    onChange={(e) => handleExerciseChange(idx, 'sets', parseInt(e.target.value, 10))}
                    required
                    style={{ padding: '10px', borderRadius: '6px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.88rem', minHeight: '40px' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Reps"
                    value={ex.reps}
                    onChange={(e) => handleExerciseChange(idx, 'reps', e.target.value)}
                    required
                    style={{ padding: '10px', borderRadius: '6px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.88rem', minHeight: '40px' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Rest"
                    value={ex.rest}
                    onChange={(e) => handleExerciseChange(idx, 'rest', e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.88rem', minHeight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(idx)}
                    className="btn btn-ghost"
                    style={{ background: 'rgba(255, 49, 49, 0.15)', border: '1px solid rgba(255, 49, 49, 0.3)', color: '#FF3131', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', height: '40px' }}
                    title="Remove Exercise"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start', marginTop: '10px', background: '#00FFFF', color: '#000000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 16px rgba(0, 255, 255, 0.3)', minHeight: '48px', width: '100%', maxWidth: '280px' }}>
            {saving ? 'Saving to Supabase...' : 'Save Routine to Supabase'}
          </button>
        </form>
      </div>

      {/* SECTION 3: ROUTINES LIBRARY */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontFamily: 'Inter, SF Pro, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Saved Routines Library
            </h3>
            <p style={{ color: '#888888', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Your programs stored in Supabase <code style={{ color: '#00FFFF', fontFamily: 'monospace' }}>routines</code> table
            </p>
          </div>
          <div style={{ width: '100%', maxWidth: '280px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search routines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', fontSize: '0.9rem', width: '100%', outline: 'none', minHeight: '44px' }}
            />
          </div>
        </div>

        {filteredRoutines.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: '#888888', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
            No routines found. Build your first routine or use Gemini AI above!
          </div>
        ) : (
          <div className="routines-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredRoutines.map(r => {
              const exercisesList = r.exercises || [];
              return (
                <div key={r.id} className="routine-card" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div className="routine-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <h4 className="routine-title" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{r.title}</h4>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoutine(r.id)}
                        className="btn btn-ghost"
                        style={{ background: 'rgba(255, 49, 49, 0.1)', border: '1px solid rgba(255, 49, 49, 0.3)', color: '#FF3131', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', minHeight: '36px' }}
                        title="Delete Routine"
                      >
                        🗑️
                      </button>
                    </div>
                    <p className="routine-desc" style={{ color: '#888888', fontSize: '0.85rem', margin: '8px 0 12px 0' }}>{r.description || 'Custom routine program.'}</p>
                    <div className="exercise-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {exercisesList.slice(0, 4).map((ex, i) => {
                        const name = typeof ex === 'string' ? ex : (ex.name || 'Exercise');
                        const sets = ex.sets ? ` (${ex.sets} sets)` : '';
                        return <span key={i} className="exercise-tag" style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#00FFFF' }}>{name + sets}</span>;
                      })}
                      {exercisesList.length > 4 && (
                        <span className="exercise-tag" style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#888888' }}>+{exercisesList.length - 4} more</span>
                      )}
                    </div>
                  </div>

                  <div className="routine-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => onStartWorkout?.(r.title)}
                      className="btn btn-lime"
                      style={{ flex: 1, background: '#39FF14', color: '#000000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 0 12px rgba(57, 255, 20, 0.3)', minHeight: '44px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Start Workout
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}