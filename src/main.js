import './style.css';
import {
  testConnection,
  getCurrentUser,
  subscribeAuthChange,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  getWorkouts,
  createWorkout,
  deleteWorkout,
  getRoutines,
  createRoutine,
  deleteRoutine,
  initSeedData,
  supabase
} from './supabase.js';
import { generateWorkoutRoutine, setGeminiApiKey, hasGeminiApiKey } from './gemini.js';

// Application State
const state = {
  currentView: 'dashboard',
  user: null,
  workouts: [],
  routines: [],
  activeWorkout: null,
  timerInterval: null,
  elapsedSeconds: 0,
  isLiveSupabase: false,
  selectedLogMood: '🔥 Crushed It',
  searchTerm: '',
  moodFilter: 'ALL',
  selectedWorkoutDetail: null
};

// Simple confetti effect for workout completion
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

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// View Navigation
function switchView(viewName) {
  state.currentView = viewName;

  // Update Nav Buttons
  document.querySelectorAll('.nav-item-btn, .mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Update View Panels
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `view-${viewName}`);
  });

  // Update Header Titles
  const titleEl = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');

  const titles = {
    dashboard: {
      title: 'Training Dashboard',
      subtitle: 'Track workouts, routines, and AI suggestions with Supabase sync'
    },
    'ai-coach': {
      title: 'AI Coach (Gemini)',
      subtitle: 'Generate tailored progressive workouts with Google Gemini 3.8 Flash'
    },
    routines: {
      title: 'Routine Builder',
      subtitle: 'Build and manage custom routines saved in Supabase routines table'
    },
    'log-workout': {
      title: 'Log Workout Session',
      subtitle: 'Record completed exercises, duration, and mood to Supabase'
    },
    analytics: {
      title: 'Performance & Progress',
      subtitle: 'Analyze training volume and mood sentiment over time'
    }
  };

  if (titles[viewName]) {
    titleEl.textContent = titles[viewName].title;
    subtitleEl.textContent = titles[viewName].subtitle;
  }

  // Refresh view specific data
  if (viewName === 'dashboard') {
    renderDashboard();
  } else if (viewName === 'routines') {
    renderRoutines();
  } else if (viewName === 'analytics') {
    renderAnalytics();
  }
}

// Render Dashboard Data & Stats
function renderDashboard() {
  const totalWorkouts = state.workouts.length;
  const totalMinutes = state.workouts.reduce((acc, w) => acc + (parseInt(w.duration, 10) || 0), 0);
  const totalRoutines = state.routines.length;

  const totalWoEl = document.getElementById('stat-total-workouts');
  const totalMinEl = document.getElementById('stat-total-minutes');
  const totalRtEl = document.getElementById('stat-routine-count');
  const streakEl = document.getElementById('stat-streak');

  if (totalWoEl) totalWoEl.textContent = totalWorkouts;
  if (totalMinEl) totalMinEl.textContent = `${totalMinutes}m`;
  if (totalRtEl) totalRtEl.textContent = totalRoutines;
  if (streakEl) streakEl.textContent = totalWorkouts > 0 ? `${Math.min(totalWorkouts + 1, 7)} Days` : '0 Days';

  // Filter workouts by search and mood
  let filtered = state.workouts;
  if (state.searchTerm) {
    const q = state.searchTerm.toLowerCase();
    filtered = filtered.filter(w =>
      (w.exercise && w.exercise.toLowerCase().includes(q)) ||
      (w.notes && w.notes.toLowerCase().includes(q))
    );
  }
  if (state.moodFilter && state.moodFilter !== 'ALL') {
    filtered = filtered.filter(w => w.mood === state.moodFilter);
  }

  // Render workouts table
  const tbody = document.getElementById('workout-history-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    const isFiltered = state.searchTerm || (state.moodFilter && state.moodFilter !== 'ALL');
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">
          ${isFiltered ? 'No workouts matching your filters.' : 'No workouts logged yet. Start a routine or log your first session above!'}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(w => {
    const dateStr = w.timestamp ? new Date(w.timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Today';

    const moodBadge = w.mood || '💪 Feeling Strong';

    return `
      <tr data-id="${w.id}">
        <td style="font-weight: 600; color: #FFFFFF;">${escapeHtml(w.exercise || 'Workout Session')}</td>
        <td><span style="color: var(--accent-cyan); font-weight: 600;">${w.duration || 0} min</span></td>
        <td>
          <span style="background: rgba(255, 255, 255, 0.05); padding: 4px 10px; border-radius: 9999px; font-size: 0.8rem; border: 1px solid var(--border-subtle); display: inline-block;">
            ${escapeHtml(moodBadge)}
          </span>
        </td>
        <td style="color: var(--text-muted); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(w.notes || '—')}
        </td>
        <td style="color: var(--text-faint); font-size: 0.8rem;">${dateStr}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="table-action-btn view-detail-btn" data-id="${w.id}" title="View Log Details">
            🔍 Details
          </button>
          <button class="table-action-btn delete delete-workout-btn" data-id="${w.id}" title="Delete Workout Record">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach table button listeners
  tbody.querySelectorAll('.view-detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wId = btn.dataset.id;
      const workout = state.workouts.find(w => w.id === wId);
      if (workout) openWorkoutDetailsModal(workout);
    });
  });

  tbody.querySelectorAll('.delete-workout-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const wId = btn.dataset.id;
      if (confirm('Delete this workout record from Supabase?')) {
        await deleteWorkout(wId);
        state.workouts = state.workouts.filter(w => w.id !== wId);
        renderDashboard();
        renderAnalytics();
        showToast('Workout record deleted', 'info');
      }
    });
  });
}

// Workout Details Modal
function openWorkoutDetailsModal(workout) {
  state.selectedWorkoutDetail = workout;

  const titleEl = document.getElementById('detail-modal-exercise');
  const durEl = document.getElementById('detail-modal-duration');
  const moodEl = document.getElementById('detail-modal-mood');
  const dateEl = document.getElementById('detail-modal-date');
  const notesEl = document.getElementById('detail-modal-notes');
  const idEl = document.getElementById('detail-modal-id');

  if (titleEl) titleEl.textContent = workout.exercise || 'Workout Session';
  if (durEl) durEl.textContent = `${workout.duration || 0} minutes`;
  if (moodEl) moodEl.textContent = workout.mood || '💪 Feeling Strong';
  if (dateEl) dateEl.textContent = workout.timestamp ? new Date(workout.timestamp).toLocaleString() : 'N/A';
  if (notesEl) notesEl.textContent = workout.notes || 'No notes entered for this session.';
  if (idEl) idEl.textContent = workout.id || 'local';

  openModal('workout-details-modal');
}

// Render Routines Library
function renderRoutines() {
  const container = document.getElementById('routines-grid-container');
  if (!container) return;

  if (state.routines.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        <p style="margin-bottom: 14px;">No routines found in your Supabase routines library.</p>
        <button class="btn btn-primary" id="btn-create-first-routine">+ Create Your First Routine</button>
      </div>
    `;
    document.getElementById('btn-create-first-routine')?.addEventListener('click', () => {
      openModal('create-routine-modal');
    });
    return;
  }

  container.innerHTML = state.routines.map(r => {
    const exercises = r.exercises || [];
    const exerciseTags = exercises.slice(0, 4).map(ex => {
      const name = typeof ex === 'string' ? ex : (ex.name || 'Exercise');
      const sets = ex.sets ? ` (${ex.sets} sets)` : '';
      return `<span class="exercise-tag">${escapeHtml(name + sets)}</span>`;
    }).join('');

    const moreTag = exercises.length > 4 ? `<span class="exercise-tag">+${exercises.length - 4} more</span>` : '';

    return `
      <div class="routine-card" data-routine-id="${r.id}">
        <div>
          <div class="routine-header">
            <h3 class="routine-title">${escapeHtml(r.title)}</h3>
            <button class="btn btn-ghost delete-routine-btn" data-id="${r.id}" style="color: var(--accent-rose); padding: 4px 8px;" title="Delete Routine">
              🗑️
            </button>
          </div>
          <p class="routine-desc">${escapeHtml(r.description || 'Custom workout program.')}</p>
          <div class="exercise-tags">
            ${exerciseTags}
            ${moreTag}
          </div>
        </div>
        <div class="routine-actions">
          <button class="btn btn-lime start-routine-btn" data-id="${r.id}" style="flex: 1;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Start Workout
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach start and delete handlers
  container.querySelectorAll('.start-routine-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rId = btn.dataset.id;
      const routine = state.routines.find(r => r.id === rId);
      if (routine) {
        startActiveWorkout(routine.title);
      }
    });
  });

  container.querySelectorAll('.delete-routine-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rId = btn.dataset.id;
      if (confirm('Delete this routine from Supabase routines library?')) {
        await deleteRoutine(rId);
        state.routines = state.routines.filter(r => r.id !== rId);
        renderRoutines();
        renderDashboard();
        showToast('Routine deleted from Supabase', 'info');
      }
    });
  });
}

// Render Analytics View
function renderAnalytics() {
  const barsContainer = document.getElementById('analytics-bars-container');
  const moodContainer = document.getElementById('analytics-mood-breakdown');
  const totalWeeklyEl = document.getElementById('analytics-total-weekly-min');
  const avgDurEl = document.getElementById('analytics-avg-duration');
  const topMoodEl = document.getElementById('analytics-top-mood');
  const recordsCountEl = document.getElementById('analytics-records-count');

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyVolumes = [0, 0, 0, 0, 0, 0, 0];

  // Distribute workouts across days of current week
  state.workouts.forEach(w => {
    if (w.timestamp) {
      const d = new Date(w.timestamp);
      const dayIndex = (d.getDay() + 6) % 7; // Convert Sun(0) to Mon(0)..Sun(6)
      dailyVolumes[dayIndex] += (parseInt(w.duration, 10) || 0);
    }
  });

  const totalWeeklyMins = dailyVolumes.reduce((a, b) => a + b, 0);
  if (totalWeeklyEl) totalWeeklyEl.textContent = `${totalWeeklyMins} mins this week`;

  const maxVal = Math.max(...dailyVolumes, 45);

  if (barsContainer) {
    barsContainer.innerHTML = days.map((day, idx) => {
      const vol = dailyVolumes[idx];
      const heightPercent = Math.max(10, Math.round((vol / maxVal) * 100));
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end;" title="${day}: ${vol} minutes">
          <span style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 600; margin-bottom: 6px;">${vol > 0 ? vol + 'm' : ''}</span>
          <div style="width: 100%; max-width: 32px; height: ${heightPercent}%; background: linear-gradient(180deg, var(--accent-cyan), rgba(0, 240, 255, 0.2)); border-radius: 6px 6px 0 0; transition: height 0.5s ease; box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);"></div>
        </div>
      `;
    }).join('');
  }

  // Mood breakdown from logs
  if (moodContainer) {
    const moods = [
      { name: '🔥 Crushed It', count: 0, color: 'var(--accent-volt)' },
      { name: '💪 Feeling Strong', count: 0, color: 'var(--accent-lime)' },
      { name: '⚡ Energized', count: 0, color: 'var(--accent-cyan)' },
      { name: '😴 Exhausted', count: 0, color: 'var(--accent-amber)' },
      { name: '🧘 Relaxed', count: 0, color: 'var(--accent-purple)' }
    ];

    state.workouts.forEach(w => {
      const match = moods.find(m => m.name === w.mood);
      if (match) match.count++;
      else moods[1].count++;
    });

    const total = state.workouts.length || 1;

    moodContainer.innerHTML = moods.map(m => {
      const pct = Math.round((m.count / total) * 100);
      return `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px;">
            <span>${m.name}</span>
            <span style="font-weight: 600; color: ${m.color};">${m.count} logs (${pct}%)</span>
          </div>
          <div style="height: 8px; width: 100%; background: rgba(255, 255, 255, 0.05); border-radius: 9999px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: ${m.color}; border-radius: 9999px;"></div>
          </div>
        </div>
      `;
    }).join('');

    // Update KPI Summary Row
    if (avgDurEl) {
      const avg = state.workouts.length > 0
        ? Math.round(state.workouts.reduce((acc, w) => acc + (parseInt(w.duration, 10) || 0), 0) / state.workouts.length)
        : 0;
      avgDurEl.textContent = `${avg} min`;
    }

    if (topMoodEl) {
      const sortedMoods = [...moods].sort((a, b) => b.count - a.count);
      topMoodEl.textContent = sortedMoods[0]?.count > 0 ? sortedMoods[0].name : '💪 Feeling Strong';
    }

    if (recordsCountEl) {
      recordsCountEl.textContent = state.workouts.length;
    }
  }
}

// Active Workout HUD Timer
function startActiveWorkout(exerciseName) {
  if (state.timerInterval) clearInterval(state.timerInterval);

  state.activeWorkout = {
    exercise: exerciseName,
    startTime: Date.now()
  };
  state.elapsedSeconds = 0;

  const hud = document.getElementById('active-workout-hud');
  const nameEl = document.getElementById('hud-workout-name');
  const timerEl = document.getElementById('hud-timer-display');

  if (nameEl) nameEl.textContent = exerciseName;
  if (hud) hud.classList.add('visible');

  state.timerInterval = setInterval(() => {
    state.elapsedSeconds++;
    const mins = String(Math.floor(state.elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(state.elapsedSeconds % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
  }, 1000);

  showToast(`Live Workout "${exerciseName}" started! Timer active.`, 'success');
}

async function finishActiveWorkout() {
  if (!state.activeWorkout) return;

  clearInterval(state.timerInterval);
  state.timerInterval = null;

  const durationMin = Math.max(1, Math.round(state.elapsedSeconds / 60));
  const exerciseName = state.activeWorkout.exercise;

  document.getElementById('active-workout-hud')?.classList.remove('visible');

  // Record to Supabase workouts and logs tables
  const created = await createWorkout({
    exercise: exerciseName,
    duration: durationMin,
    mood: '🔥 Crushed It',
    notes: `Completed in live HUD training session (${durationMin} mins).`,
    user_id: state.user?.id || null
  });

  state.workouts = [created, ...state.workouts];
  state.activeWorkout = null;

  triggerConfetti();
  showToast(`Workout finished! Logged ${durationMin} min session to Supabase.`, 'success');
  renderDashboard();
  renderAnalytics();
}

function cancelActiveWorkout() {
  if (confirm('Cancel current live workout session?')) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.activeWorkout = null;
    document.getElementById('active-workout-hud')?.classList.remove('visible');
    showToast('Workout session canceled', 'info');
  }
}

// Modals
function openModal(modalId) {
  document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('active');
}

// Utility: HTML escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize Application
async function initApp() {
  initSeedData();

  // Test Supabase connectivity
  await refreshSupabaseConnection();

  // Check auth user
  try {
    const user = await getCurrentUser();
    if (user) {
      state.user = user;
      updateUserUI(user);
    }
  } catch (e) {
    console.warn('Auth check notice:', e);
  }

  // Subscribe to real-time auth changes
  subscribeAuthChange(async (event, user) => {
    state.user = user;
    updateUserUI(user);
    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      state.workouts = await getWorkouts(user?.id);
      state.routines = await getRoutines(user?.id);
      renderDashboard();
      renderRoutines();
      renderAnalytics();
    }
  });

  // Load initial database records from Supabase
  state.workouts = await getWorkouts(state.user?.id);
  state.routines = await getRoutines(state.user?.id);

  // Initial render
  renderDashboard();
  renderRoutines();
  renderAnalytics();

  setupEventListeners();
}

async function refreshSupabaseConnection() {
  const conn = await testConnection();
  state.isLiveSupabase = conn.connected;

  const pillText = document.getElementById('supabase-status-text');
  const dot = document.getElementById('supabase-dot');

  if (conn.connected) {
    if (pillText) pillText.textContent = 'Supabase Connected';
    if (dot) dot.style.background = 'var(--accent-lime)';
  } else {
    if (pillText) pillText.textContent = 'Local Cache (Supabase fallback)';
    if (dot) dot.style.background = 'var(--accent-amber)';
  }
  return conn;
}

function updateUserUI(user) {
  const nameEl = document.getElementById('sidebar-user-name');
  const emailEl = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-user-avatar');
  const signOutBtn = document.getElementById('btn-auth-signout');

  // Profile view modal elements
  const profileStatusEl = document.getElementById('profile-view-status');
  const profileIdEl = document.getElementById('profile-view-id');
  const profileEmailEl = document.getElementById('profile-view-email');

  if (user) {
    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Athlete';
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = user.email || 'Authenticated';
    if (avatarEl) avatarEl.textContent = name.substring(0, 2).toUpperCase();
    if (signOutBtn) signOutBtn.style.display = 'block';

    if (profileStatusEl) profileStatusEl.textContent = 'Authenticated via Supabase Auth';
    if (profileIdEl) profileIdEl.textContent = user.id;
    if (profileEmailEl) profileEmailEl.textContent = user.email;
  } else {
    if (nameEl) nameEl.textContent = 'Guest Athlete';
    if (emailEl) emailEl.textContent = 'Tap to authenticate';
    if (avatarEl) avatarEl.textContent = 'GA';
    if (signOutBtn) signOutBtn.style.display = 'none';

    if (profileStatusEl) profileStatusEl.textContent = 'Guest Mode';
    if (profileIdEl) profileIdEl.textContent = 'None';
    if (profileEmailEl) profileEmailEl.textContent = 'Guest';
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Navigation buttons
  document.querySelectorAll('.nav-item-btn, .mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) switchView(view);
    });
  });

  // Top header Sync / Refresh button
  document.getElementById('header-refresh-btn')?.addEventListener('click', async () => {
    showToast('Syncing records with Supabase...', 'info');
    await refreshSupabaseConnection();
    state.workouts = await getWorkouts(state.user?.id);
    state.routines = await getRoutines(state.user?.id);
    renderDashboard();
    renderRoutines();
    renderAnalytics();
    showToast('Supabase sync complete!', 'success');
  });

  // Top header quick start button
  document.getElementById('header-quick-start-btn')?.addEventListener('click', () => {
    const firstRoutine = state.routines[0];
    const name = firstRoutine ? firstRoutine.title : 'Full Body Functional Blitz';
    startActiveWorkout(name);
  });

  // Banner AI button
  document.getElementById('banner-ai-btn')?.addEventListener('click', () => {
    switchView('ai-coach');
  });

  // Dashboard go to log button
  document.getElementById('btn-go-to-log')?.addEventListener('click', () => {
    switchView('log-workout');
  });

  // Search input in workout history
  document.getElementById('search-workout-logs')?.addEventListener('input', (e) => {
    state.searchTerm = e.target.value.trim();
    renderDashboard();
  });

  // Filter dropdown in workout history
  document.getElementById('filter-workout-mood')?.addEventListener('change', (e) => {
    state.moodFilter = e.target.value;
    renderDashboard();
  });

  // Workout details modal close buttons
  document.getElementById('close-details-modal-btn')?.addEventListener('click', () => {
    closeModal('workout-details-modal');
  });
  document.getElementById('detail-modal-close-btn')?.addEventListener('click', () => {
    closeModal('workout-details-modal');
  });

  // Delete from within details modal
  document.getElementById('detail-modal-delete-btn')?.addEventListener('click', async () => {
    if (!state.selectedWorkoutDetail) return;
    if (confirm('Delete this workout record from Supabase?')) {
      await deleteWorkout(state.selectedWorkoutDetail.id);
      state.workouts = state.workouts.filter(w => w.id !== state.selectedWorkoutDetail.id);
      closeModal('workout-details-modal');
      renderDashboard();
      renderAnalytics();
      showToast('Workout record deleted', 'info');
    }
  });

  // Active workout HUD buttons
  document.getElementById('hud-finish-btn')?.addEventListener('click', finishActiveWorkout);
  document.getElementById('hud-cancel-btn')?.addEventListener('click', cancelActiveWorkout);

  // Manual Log duration slider & display
  const slider = document.getElementById('log-duration-slider');
  const durationDisplay = document.getElementById('duration-display-val');
  if (slider && durationDisplay) {
    slider.addEventListener('input', (e) => {
      durationDisplay.textContent = e.target.value;
    });
  }

  // Quick preset duration buttons
  document.querySelectorAll('.quick-dur-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.dur;
      if (slider && durationDisplay) {
        slider.value = val;
        durationDisplay.textContent = val;
      }
    });
  });

  // Mood selector buttons
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedLogMood = btn.dataset.mood;
    });
  });

  // Manual Workout Form Submission
  document.getElementById('manual-log-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const exercise = document.getElementById('log-exercise-name').value.trim();
    const duration = parseInt(document.getElementById('log-duration-slider').value, 10) || 30;
    const notes = document.getElementById('log-notes').value.trim();
    const mood = state.selectedLogMood;

    if (!exercise) return;

    const created = await createWorkout({
      exercise,
      duration,
      notes,
      mood,
      user_id: state.user?.id || null
    });

    state.workouts = [created, ...state.workouts];
    triggerConfetti();
    showToast(`Workout "${exercise}" recorded to Supabase!`, 'success');

    // Reset form
    document.getElementById('log-exercise-name').value = '';
    document.getElementById('log-notes').value = '';

    switchView('dashboard');
  });

  // AI Workout Generator Form
  let currentGeneratedRoutine = null;
  document.getElementById('ai-generator-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-generate-ai');
    const indicator = document.getElementById('ai-generating-indicator');
    const resultBox = document.getElementById('ai-result-container');

    const params = {
      goal: document.getElementById('ai-goal').value,
      focus: document.getElementById('ai-focus').value,
      level: document.getElementById('ai-level').value,
      duration: parseInt(document.getElementById('ai-duration').value, 10) || 45,
      equipment: document.getElementById('ai-equipment').value,
      mood: document.getElementById('ai-energy').value
    };

    if (btn) btn.disabled = true;
    if (indicator) indicator.style.display = 'inline';

    try {
      const routine = await generateWorkoutRoutine(params);
      currentGeneratedRoutine = routine;

      // Populate results
      document.getElementById('ai-result-title').textContent = routine.title;
      document.getElementById('ai-result-desc').textContent = routine.description;
      document.getElementById('ai-result-badge').textContent = routine.isAI ? `Gemini 3.8 Flash (${routine.model})` : 'AI Biomechanical Engine';

      // Warmup
      const warmupUl = document.getElementById('ai-warmup-list');
      if (warmupUl) {
        warmupUl.innerHTML = (routine.warmup || []).map(step => `<li>${escapeHtml(step)}</li>`).join('');
      }

      // Exercises cards
      const cardsBox = document.getElementById('ai-exercise-cards');
      if (cardsBox) {
        cardsBox.innerHTML = (routine.exercises || []).map(ex => `
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
            <div style="font-weight: 700; color: #FFFFFF; font-size: 0.95rem;">${escapeHtml(ex.name)}</div>
            <div style="display: flex; gap: 10px; margin: 6px 0; font-size: 0.8rem; color: var(--accent-cyan); font-weight: 600;">
              <span>${ex.sets} sets</span> • <span>${escapeHtml(ex.reps)}</span> • <span>Rest: ${escapeHtml(ex.rest || '60s')}</span>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4;">💡 ${escapeHtml(ex.cues || 'Maintain proper form and brace core.')}</p>
          </div>
        `).join('');
      }

      // Cooldown
      const cooldownUl = document.getElementById('ai-cooldown-list');
      if (cooldownUl) {
        cooldownUl.innerHTML = (routine.cooldown || [
          '2 minutes standing hamstring & calf stretch',
          '2 minutes doorway chest stretch & lat hang'
        ]).map(step => `<li>${escapeHtml(step)}</li>`).join('');
      }

      // Quote
      const quoteBox = document.getElementById('ai-quote-box');
      if (quoteBox) {
        quoteBox.textContent = routine.coachingQuote || '“Every rep brings you closer to your athletic potential.”';
      }

      if (resultBox) resultBox.style.display = 'block';
      showToast('AI workout generated successfully!', 'success');
      resultBox.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      showToast('Generation error: ' + err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
      if (indicator) indicator.style.display = 'none';
    }
  });

  // Save AI routine to Supabase
  document.getElementById('ai-save-routine-btn')?.addEventListener('click', async () => {
    if (!currentGeneratedRoutine) return;

    const saved = await createRoutine({
      title: currentGeneratedRoutine.title,
      description: currentGeneratedRoutine.description,
      exercises: currentGeneratedRoutine.exercises,
      user_id: state.user?.id || null
    });

    state.routines = [saved, ...state.routines];
    showToast(`Routine "${saved.title}" saved to Supabase routines library!`, 'success');
    renderRoutines();
    renderDashboard();
  });

  // Start AI routine right away
  document.getElementById('ai-start-workout-btn')?.addEventListener('click', () => {
    if (!currentGeneratedRoutine) return;
    startActiveWorkout(currentGeneratedRoutine.title);
  });

  // Routine Builder Modal
  document.getElementById('btn-open-create-routine-modal')?.addEventListener('click', () => {
    openModal('create-routine-modal');
  });
  document.getElementById('close-routine-modal-btn')?.addEventListener('click', () => {
    closeModal('create-routine-modal');
  });

  // Add exercise row in routine builder
  document.getElementById('btn-add-exercise-row')?.addEventListener('click', () => {
    const list = document.getElementById('routine-exercises-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'exercise-builder-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 8px; align-items: center;';
    row.innerHTML = `
      <input type="text" class="form-control ex-name" placeholder="Exercise Name" required />
      <input type="number" class="form-control ex-sets" placeholder="Sets" value="3" min="1" required />
      <input type="text" class="form-control ex-reps" placeholder="Reps" value="12 reps" required />
      <button type="button" class="btn btn-ghost remove-row-btn" style="padding: 6px;">✕</button>
    `;
    list.appendChild(row);
  });

  // Remove row handler (delegated)
  document.getElementById('routine-exercises-list')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-row-btn')) {
      const rows = document.querySelectorAll('.exercise-builder-row');
      if (rows.length > 1) {
        e.target.closest('.exercise-builder-row').remove();
      } else {
        showToast('A routine requires at least one exercise', 'info');
      }
    }
  });

  // Submit Custom Routine
  document.getElementById('create-routine-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('custom-routine-title').value.trim();
    const desc = document.getElementById('custom-routine-desc').value.trim();

    const exercises = [];
    document.querySelectorAll('.exercise-builder-row').forEach(row => {
      const name = row.querySelector('.ex-name').value.trim();
      const sets = parseInt(row.querySelector('.ex-sets').value, 10) || 3;
      const reps = row.querySelector('.ex-reps').value.trim() || '10 reps';
      if (name) {
        exercises.push({ name, sets, reps, rest: '60s' });
      }
    });

    if (!title || exercises.length === 0) return;

    const saved = await createRoutine({
      title,
      description: desc,
      exercises,
      user_id: state.user?.id || null
    });

    state.routines = [saved, ...state.routines];
    closeModal('create-routine-modal');
    showToast(`Routine "${title}" saved to Supabase!`, 'success');
    renderRoutines();
    renderDashboard();
  });

  // User Profile / Auth Modal Triggers
  document.getElementById('user-profile-trigger')?.addEventListener('click', () => {
    openModal('auth-modal');
  });
  document.getElementById('btn-api-key-config')?.addEventListener('click', () => {
    openModal('auth-modal');
    document.getElementById('tab-auth-api')?.click();
  });
  document.getElementById('close-auth-modal-btn')?.addEventListener('click', () => {
    closeModal('auth-modal');
  });

  // Auth Modal Tabs
  const tabLogin = document.getElementById('tab-auth-login');
  const tabProfile = document.getElementById('tab-auth-profile');
  const tabApi = document.getElementById('tab-auth-api');

  const authTabContent = document.getElementById('auth-tab-content');
  const profileTabContent = document.getElementById('profile-tab-content');
  const apiTabContent = document.getElementById('api-tab-content');

  function resetTabs() {
    [tabLogin, tabProfile, tabApi].forEach(t => {
      if (t) {
        t.classList.remove('active');
        t.style.borderBottom = 'none';
      }
    });
    if (authTabContent) authTabContent.style.display = 'none';
    if (profileTabContent) profileTabContent.style.display = 'none';
    if (apiTabContent) apiTabContent.style.display = 'none';
  }

  tabLogin?.addEventListener('click', () => {
    resetTabs();
    tabLogin.classList.add('active');
    tabLogin.style.borderBottom = '2px solid var(--accent-cyan)';
    authTabContent.style.display = 'block';
  });

  tabProfile?.addEventListener('click', () => {
    resetTabs();
    tabProfile.classList.add('active');
    tabProfile.style.borderBottom = '2px solid var(--accent-cyan)';
    profileTabContent.style.display = 'block';
  });

  tabApi?.addEventListener('click', () => {
    resetTabs();
    tabApi.classList.add('active');
    tabApi.style.borderBottom = '2px solid var(--accent-cyan)';
    apiTabContent.style.display = 'block';

    const input = document.getElementById('gemini-key-input');
    if (input && hasGeminiApiKey()) {
      input.value = localStorage.getItem('gemini_api_key') || '';
    }
  });

  // Supabase Sign In
  document.getElementById('btn-auth-signin')?.addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-password').value.trim();
    if (!email || !pass) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    try {
      const { user } = await signInWithEmail(email, pass);
      state.user = user;
      updateUserUI(user);
      closeModal('auth-modal');
      showToast('Signed in successfully to Supabase!', 'success');
      state.workouts = await getWorkouts(user.id);
      state.routines = await getRoutines(user.id);
      renderDashboard();
      renderRoutines();
      renderAnalytics();
    } catch (err) {
      showToast('Sign in failed: ' + err.message, 'error');
    }
  });

  // Supabase Sign Up
  document.getElementById('btn-auth-signup')?.addEventListener('click', async () => {
    const name = document.getElementById('auth-name').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-password').value.trim();
    if (!email || !pass) {
      showToast('Please provide both email and password', 'error');
      return;
    }

    try {
      const { user } = await signUpWithEmail(email, pass, name);
      state.user = user;
      updateUserUI(user);
      closeModal('auth-modal');
      showToast('Account created! Profile synced to Supabase.', 'success');
    } catch (err) {
      showToast('Sign up failed: ' + err.message, 'error');
    }
  });

  // Supabase Sign Out
  document.getElementById('btn-auth-signout')?.addEventListener('click', async () => {
    try {
      await signOutUser();
      state.user = null;
      updateUserUI(null);
      closeModal('auth-modal');
      showToast('Signed out of Supabase', 'info');
      state.workouts = await getWorkouts(null);
      state.routines = await getRoutines(null);
      renderDashboard();
      renderRoutines();
      renderAnalytics();
    } catch (err) {
      showToast('Sign out error: ' + err.message, 'error');
    }
  });

  // Save Gemini API Key
  document.getElementById('btn-save-gemini-key')?.addEventListener('click', () => {
    const key = document.getElementById('gemini-key-input').value;
    setGeminiApiKey(key);
    closeModal('auth-modal');
    showToast(key ? 'Gemini 3.8 Flash key saved!' : 'Custom key cleared. Running algorithmic engine.', 'success');
  });
}

// Start Application
window.addEventListener('DOMContentLoaded', initApp);
