// Gemini AI Workout Assistant Service
// Powered by Google Gemini 3.8 Flash

export const getGeminiApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '';
};

export const setGeminiApiKey = (key) => {
  if (key && key.trim()) {
    localStorage.setItem('gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('gemini_api_key');
  }
};

export const hasGeminiApiKey = () => {
  return !!getGeminiApiKey();
};

/**
 * Generates an AI-tailored workout routine using Gemini 3.8 Flash.
 * Gracefully falls back to a sports-science algorithmic generator if no API key is set or on error.
 */
export async function generateWorkoutRoutine({
  goal = 'Hypertrophy & Strength',
  level = 'Intermediate',
  duration = 45,
  equipment = 'Dumbbells & Bodyweight',
  focus = 'Full Body',
  mood = '⚡ High Energy & Ready to Push'
}) {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      return await callGeminiAPI(apiKey, { goal, level, duration, equipment, focus, mood });
    } catch (err) {
      console.warn('Gemini API call failed, falling back to algorithmic smart generator:', err.message);
    }
  }

  // Sports science algorithmic routine generator
  return generateAlgorithmicRoutine({ goal, level, duration, equipment, focus, mood });
}

async function callGeminiAPI(apiKey, params) {
  const systemPrompt = `You are an elite Certified Strength and Conditioning Specialist (CSCS) and Olympic biomechanics coach.
Create an evidence-based, safe, and motivating training session tailored specifically to the user's constraints.
You MUST return ONLY valid JSON matching this exact structure, with no markdown fences:
{
  "title": "string (Punchy, inspiring workout title)",
  "description": "string (2-3 sentences explaining the biomechanics and adaptation goal of this workout)",
  "targetArea": "${params.focus}",
  "estimatedDuration": ${params.duration},
  "difficulty": "${params.level}",
  "warmup": [
    "step 1 with duration or reps",
    "step 2",
    "step 3"
  ],
  "exercises": [
    {
      "name": "string (Exercise name)",
      "sets": 3,
      "reps": "10-12 reps",
      "rest": "60s",
      "cues": "string (Key form cue or biomechanical tip)"
    }
  ],
  "cooldown": [
    "cooldown mobility step 1",
    "cooldown mobility step 2"
  ],
  "coachingQuote": "string (Inspiring, gritty mindset quote)"
}`;

  const userQuery = `Generate a workout protocol for:
- Goal: ${params.goal}
- Target Muscle Focus: ${params.focus}
- Experience Level: ${params.level}
- Session Duration: ${params.duration} minutes
- Equipment Available: ${params.equipment}
- Current Energy State: ${params.mood}`;

  // Current recommended Gemini models
  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt + '\n\n' + userQuery }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('No candidate content received from Gemini');

      const cleaned = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        ...parsed,
        isAI: true,
        model: model
      };
    } catch (err) {
      lastError = err;
      console.warn(`Attempt with ${model} failed:`, err.message);
    }
  }

  throw lastError || new Error('All Gemini API endpoints failed');
}

// Algorithmic smart workout catalog generator
function generateAlgorithmicRoutine(params) {
  const { goal, level, duration, equipment, focus } = params;

  const exercisePool = {
    'Full Body': [
      { name: 'Goblet Squats', sets: 4, reps: '10-12 reps', rest: '60s', cues: 'Drive knees outward over toes, chest tall.' },
      { name: 'Push-Ups or Dumbbell Bench Press', sets: 4, reps: '12-15 reps', rest: '60s', cues: 'Retract scapula, slow 2-second lowering phase.' },
      { name: 'Dumbbell Romanian Deadlifts', sets: 3, reps: '10-12 reps', rest: '75s', cues: 'Hinge back with hips, preserve neutral lumbar curve.' },
      { name: 'Single-Arm Dumbbell Rows', sets: 3, reps: '10 reps/side', rest: '60s', cues: 'Drive elbow back towards the hip crease.' },
      { name: 'Plank with Alternating Shoulder Taps', sets: 3, reps: '45 seconds', rest: '45s', cues: 'Keep hips dead level without swaying.' }
    ],
    'Upper Body': [
      { name: 'Incline Dumbbell Chest Press', sets: 4, reps: '8-10 reps', rest: '90s', cues: 'Set bench to 30 degrees, controlled eccentric.' },
      { name: 'Pull-Ups or Neutral Grip Lat Pulldown', sets: 4, reps: '8-12 reps', rest: '90s', cues: 'Initiate by pulling shoulder blades down and back.' },
      { name: 'Overhead Dumbbell Shoulder Press', sets: 3, reps: '10-12 reps', rest: '75s', cues: 'Brace core and glutes to avoid hyperextending back.' },
      { name: 'Incline Dumbbell Hammer Curls', sets: 3, reps: '12 reps', rest: '45s', cues: 'Full elbow extension at bottom, squeeze peak.' },
      { name: 'Overhead Cable or Dumbbell Tricep Extension', sets: 3, reps: '15 reps', rest: '45s', cues: 'Keep elbows tucked in line with ears.' }
    ],
    'Lower Body': [
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10 reps/leg', rest: '75s', cues: 'Slight torso forward lean loading the front glute.' },
      { name: 'Dumbbell or Trap Bar Deadlifts', sets: 4, reps: '8 reps', rest: '90s', cues: 'Drive through mid-foot, brace lats against the bar.' },
      { name: 'Walking Dumbbell Lunges', sets: 3, reps: '20 steps total', rest: '60s', cues: 'Vertical shin on lead leg, 90-degree bend.' },
      { name: 'Standing Single-Leg Calf Raises', sets: 4, reps: '15 reps', rest: '45s', cues: '2-second stretch at bottom, explosive drive.' },
      { name: 'Weighted Hip Thrusts / Glute Bridges', sets: 3, reps: '12 reps', rest: '60s', cues: 'Tuck chin, lock out pelvis at parallel.' }
    ],
    'Core & HIIT': [
      { name: 'High-Knees Sprint to Mountain Climbers', sets: 4, reps: '45 sec work / 15 rest', rest: '30s', cues: 'Explosive turnover, land softly on balls of feet.' },
      { name: 'Hanging Leg Raises / V-Ups', sets: 4, reps: '12-15 reps', rest: '45s', cues: 'Posterior pelvic tilt without swinging momentum.' },
      { name: 'Dumbbell Renegade Rows', sets: 3, reps: '10 reps/side', rest: '60s', cues: 'Anti-rotational core stabilization.' },
      { name: 'Weighted Russian Twists', sets: 3, reps: '30 reps total', rest: '30s', cues: 'Rotate ribcage and shoulders, keep chest proud.' },
      { name: 'Bicycle Crunches Tempo', sets: 3, reps: '20 reps/side', rest: '45s', cues: 'Slow 2-second hold each cross.' }
    ]
  };

  const pool = exercisePool[focus] || exercisePool['Full Body'];
  const titles = [
    `${focus} ${goal} Protocol`,
    `Apex ${focus} Performance Builder`,
    `Gemini-Engineered ${focus} Surge`
  ];
  const chosenTitle = titles[Math.floor(Math.random() * titles.length)];

  return {
    title: chosenTitle,
    description: `A balanced ${duration}-minute session calibrated for ${goal.toLowerCase()} using ${equipment.toLowerCase()}. Focused on progressive mechanical tension, clean biomechanics, and metabolic efficiency.`,
    targetArea: focus,
    estimatedDuration: duration,
    difficulty: level,
    warmup: [
      '3 minutes dynamic arm circles & hip 90/90 openers',
      '2 minutes cat-cow & thoracic rotations',
      '1 minute bodyweight tempo squats with 3-sec pause at bottom'
    ],
    exercises: pool,
    cooldown: [
      '2 minutes standing hamstring & calf stretch',
      '2 minutes doorway chest stretch & lat hang'
    ],
    coachingQuote: '“Consistency beats intensity when intensity lacks consistency.” — Antigravity AI Coach',
    isAI: false
  };
}
