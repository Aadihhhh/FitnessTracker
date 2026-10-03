import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hcscumsjcglzonzjvzvx.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// UUID v4 generator compliant with Postgres UUID columns
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Local cache keys for offline/fallback resilience
const STORAGE_PREFIX = 'fitnesstracker_local_';

export const fallbackStorage = {
  get: (key, defaultVal = []) => {
    try {
      const data = localStorage.getItem(STORAGE_PREFIX + key);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }
};

// Initial sample routines if storage is empty
export function initSeedData() {
  const routines = fallbackStorage.get('routines', null);
  if (!routines || routines.length === 0) {
    const defaultRoutines = [
      {
        id: generateUUID(),
        title: 'Full Body Functional Blitz',
        description: 'High-intensity dynamic routine targeting core, chest, back, and lower body with compound movements.',
        created_at: new Date().toISOString(),
        exercises: [
          { name: 'Goblet Squats', sets: 4, reps: '12 reps', rest: '60s' },
          { name: 'Push-Ups (Diamond/Standard)', sets: 3, reps: '15 reps', rest: '45s' },
          { name: 'Dumbbell Renegade Rows', sets: 3, reps: '10 reps/side', rest: '60s' },
          { name: 'Kettlebell Romanian Deadlifts', sets: 3, reps: '12 reps', rest: '60s' },
          { name: 'Plank with Shoulder Taps', sets: 3, reps: '45 sec', rest: '30s' }
        ]
      },
      {
        id: generateUUID(),
        title: 'Upper Body Power & Hypertrophy',
        description: 'Sculpt shoulders, chest, and arms with controlled time under tension.',
        created_at: new Date().toISOString(),
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 4, reps: '10 reps', rest: '90s' },
          { name: 'Pull-Ups / Lat Pulldown', sets: 4, reps: '8-10 reps', rest: '90s' },
          { name: 'Overhead Dumbbell Press', sets: 3, reps: '12 reps', rest: '60s' },
          { name: 'Incline Bicep Curls', sets: 3, reps: '12 reps', rest: '45s' },
          { name: 'Overhead Tricep Extensions', sets: 3, reps: '15 reps', rest: '45s' }
        ]
      },
      {
        id: generateUUID(),
        title: 'HIIT Cardio & Core Shred',
        description: 'Rapid calorie burn and core strengthening with minimal rest intervals.',
        created_at: new Date().toISOString(),
        exercises: [
          { name: 'Burpees to Jump', sets: 4, reps: '45 sec', rest: '20s' },
          { name: 'Mountain Climbers', sets: 4, reps: '45 sec', rest: '20s' },
          { name: 'Jump Rope / High Knees', sets: 4, reps: '60 sec', rest: '30s' },
          { name: 'Hanging Leg Raises / V-Ups', sets: 3, reps: '15 reps', rest: '30s' },
          { name: 'Russian Twists', sets: 3, reps: '30 reps', rest: '30s' }
        ]
      }
    ];
    fallbackStorage.set('routines', defaultRoutines);
  }

  const workouts = fallbackStorage.get('workouts', null);
  if (!workouts || workouts.length === 0) {
    const now = new Date();
    const defaultWorkouts = [
      {
        id: generateUUID(),
        exercise: 'Upper Body Power & Hypertrophy',
        duration: 48,
        timestamp: new Date(now.getTime() - 86400000 * 2).toISOString(),
        notes: 'Felt strong on the incline press. Increased weight by 2.5kg.',
        mood: '🔥 Crushed It'
      },
      {
        id: generateUUID(),
        exercise: 'Morning 5K Trail Run',
        duration: 27,
        timestamp: new Date(now.getTime() - 86400000 * 4).toISOString(),
        notes: 'Paced at 5:24/km. Heart rate average 154bpm.',
        mood: '⚡ Energized'
      },
      {
        id: generateUUID(),
        exercise: 'Full Body Functional Blitz',
        duration: 52,
        timestamp: new Date(now.getTime() - 86400000 * 6).toISOString(),
        notes: 'Sweaty session! Core felt engaged throughout.',
        mood: '💪 Feeling Strong'
      }
    ];
    fallbackStorage.set('workouts', defaultWorkouts);
  }
}

// Check Supabase connection health
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      console.warn('Supabase testConnection notice:', error.message);
      return { connected: false, error: error.message };
    }
    return { connected: true, data };
  } catch (err) {
    return { connected: false, error: err?.message || 'Connection error' };
  }
}

// ----------------- Auth Operations -----------------
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch (e) {
    return null;
  }
}

export function subscribeAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session?.user || null);
  });
}

export async function signUpWithEmail(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: name || email.split('@')[0] }
    }
  });
  if (error) throw error;
  if (data?.user) {
    await upsertProfile({
      id: data.user.id,
      name: name || email.split('@')[0],
      email: email
    }).catch(e => console.warn('Profile sync warn:', e));
  }
  return data;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  if (data?.user) {
    await upsertProfile({
      id: data.user.id,
      name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Athlete',
      email: data.user.email
    }).catch(e => console.warn('Profile sync on login:', e));
  }
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ----------------- Profiles Table -----------------
export async function getProfile(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (data) fallbackStorage.set('profile', data);
    return data || fallbackStorage.get('profile', null);
  } catch (e) {
    console.warn('Supabase getProfile fallback:', e);
    return fallbackStorage.get('profile', null);
  }
}

export async function upsertProfile(profile) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) fallbackStorage.set('profile', data);
    return data || profile;
  } catch (e) {
    console.warn('Supabase upsertProfile fallback:', e);
    fallbackStorage.set('profile', profile);
    return profile;
  }
}

// ----------------- Workouts Table -----------------
export async function getWorkouts(userId) {
  try {
    let query = supabase.from('workouts').select(`
      id,
      user_id,
      exercise,
      duration,
      timestamp,
      logs (
        id,
        notes,
        mood,
        created_at
      )
    `).order('timestamp', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Flatten logs if joined
    const formatted = (data || []).map(w => {
      const primaryLog = (w.logs && w.logs.length > 0) ? w.logs[0] : {};
      return {
        ...w,
        notes: primaryLog.notes || '',
        mood: primaryLog.mood || '💪 Feeling Strong'
      };
    });

    fallbackStorage.set('workouts', formatted);
    return formatted;
  } catch (e) {
    console.warn('Supabase getWorkouts fallback to local cache:', e);
    return fallbackStorage.get('workouts', []);
  }
}

export async function createWorkout(workoutData) {
  const { exercise, duration, notes, mood, user_id } = workoutData;
  const newId = generateUUID();
  const nowIso = new Date().toISOString();

  // Optimistic local item
  const localItem = {
    id: newId,
    user_id: user_id || null,
    exercise,
    duration: parseInt(duration, 10) || 0,
    timestamp: nowIso,
    notes: notes || '',
    mood: mood || '💪 Feeling Strong'
  };

  const currentLocal = fallbackStorage.get('workouts', []);
  fallbackStorage.set('workouts', [localItem, ...currentLocal]);

  try {
    const insertPayload = {
      id: newId,
      exercise,
      duration: parseInt(duration, 10) || 0,
      timestamp: nowIso
    };
    if (user_id) {
      insertPayload.user_id = user_id;
    }

    const { data: woData, error: woError } = await supabase
      .from('workouts')
      .insert(insertPayload)
      .select()
      .single();

    if (woError) {
      console.warn('Supabase insert workout error:', woError.message);
      return localItem;
    }

    const createdWorkoutId = woData?.id || newId;

    // Insert associated log row in logs table
    if (notes || mood) {
      const logPayload = {
        id: generateUUID(),
        workout_id: createdWorkoutId,
        notes: notes || '',
        mood: mood || '💪 Feeling Strong',
        created_at: nowIso
      };

      const { error: logError } = await supabase.from('logs').insert(logPayload);
      if (logError) {
        console.warn('Supabase log insert warn:', logError.message);
      }
    }

    return { ...woData, notes, mood };
  } catch (e) {
    console.warn('createWorkout network/db issue, preserved in local storage:', e);
    return localItem;
  }
}

export async function deleteWorkout(workoutId) {
  // Update local cache
  const workouts = fallbackStorage.get('workouts', []).filter(w => w.id !== workoutId);
  fallbackStorage.set('workouts', workouts);

  try {
    // Delete dependent logs first
    await supabase.from('logs').delete().eq('workout_id', workoutId);
    await supabase.from('workouts').delete().eq('id', workoutId);
  } catch (e) {
    console.warn('deleteWorkout Supabase error:', e);
  }
}

// ----------------- Routines Table -----------------
export async function getRoutines(userId) {
  try {
    let query = supabase.from('routines').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;

    const parsed = (data || []).map(r => {
      let exercises = [];
      let description = r.description || '';
      try {
        if (description.startsWith('{') || description.startsWith('[')) {
          const parsedObj = JSON.parse(description);
          if (Array.isArray(parsedObj)) {
            exercises = parsedObj;
          } else if (parsedObj.exercises) {
            exercises = parsedObj.exercises;
            description = parsedObj.description || '';
          }
        }
      } catch (_) {}
      return { ...r, description, exercises };
    });

    fallbackStorage.set('routines', parsed);
    return parsed;
  } catch (e) {
    console.warn('Supabase getRoutines fallback:', e);
    return fallbackStorage.get('routines', []);
  }
}

export async function createRoutine(routineData) {
  const { title, description, exercises = [], user_id } = routineData;
  const newId = generateUUID();
  const nowIso = new Date().toISOString();

  // Store rich metadata (exercises) inside description JSON
  const payloadDescription = exercises.length > 0
    ? JSON.stringify({ description: description || '', exercises })
    : (description || '');

  const localRoutine = {
    id: newId,
    user_id: user_id || null,
    title,
    description: description || '',
    exercises,
    created_at: nowIso
  };

  const currentRoutines = fallbackStorage.get('routines', []);
  fallbackStorage.set('routines', [localRoutine, ...currentRoutines]);

  try {
    const insertPayload = {
      id: newId,
      title,
      description: payloadDescription,
      created_at: nowIso
    };
    if (user_id) {
      insertPayload.user_id = user_id;
    }

    const { data, error } = await supabase
      .from('routines')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.warn('Supabase createRoutine error:', error.message);
      return localRoutine;
    }
    return { ...data, exercises, description };
  } catch (e) {
    console.warn('createRoutine fallback to local:', e);
    return localRoutine;
  }
}

export async function deleteRoutine(routineId) {
  const routines = fallbackStorage.get('routines', []).filter(r => r.id !== routineId);
  fallbackStorage.set('routines', routines);

  try {
    await supabase.from('routines').delete().eq('id', routineId);
  } catch (e) {
    console.warn('deleteRoutine Supabase error:', e);
  }
}

// ----------------- Logs Table -----------------
export async function getLogs(workoutId) {
  try {
    let query = supabase.from('logs').select('*').order('created_at', { ascending: false });
    if (workoutId) {
      query = query.eq('workout_id', workoutId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('Supabase getLogs fallback:', e);
    return [];
  }
}
