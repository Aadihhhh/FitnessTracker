# FitnessTracker — AI-Powered Training & Analytics

A customizable fitness tracking web application built with **Vite**, **Supabase backend**, and **Google Gemini 3.8 Flash AI** assistance.

---

## 🚀 Key Features

1. **AI-Assisted Workout Suggestions (Gemini 3.8 Flash)**:
   - Personalized workout architect that calibrates regimens based on training goal, fitness level, available equipment, target muscle group, duration, and fatigue level.
   - Structured JSON output with warm-up sequences, exercise circuits (sets, reps, rest periods, coaching cues), cooldown mobility, and motivational quotes.
   - **One-click "Save to My Routines"** directly saves Gemini's generation into your Supabase `routines` table.
   - **"Start Workout Now"** immediately launches the live stopwatch HUD with the generated session.
   - Resilient design: calls Gemini 3.8 Flash (`gemini-3.8-flash` / `gemini-flash-latest`) if key is configured, with an intelligent sports-science algorithmic generator fallback.

2. **Routine Builder**:
   - Interactive routine builder supporting multi-exercise configuration with sets, reps, rest intervals, and target duration.
   - Routines library with 1-click **"Start Workout"** launcher and routine management.

3. **Active Workout Mode & Live HUD**:
   - Floating stopwatch timer tracking live training duration.
   - **"Finish & Log"** button that automatically records session volume to `workouts` and `logs` tables in Supabase, accompanied by celebratory confetti animations!

4. **Workout Logging & Analytics**:
   - Quick logging interface for workouts with duration sliders, quick presets (20m, 30m, 45m, 60m), mood selectors (🔥 Crushed It, 💪 Feeling Strong, ⚡ Energized, 😴 Exhausted, 🧘 Relaxed), and training notes.
   - **Search & Filter**: Search logs by exercise or notes, and filter by training mood.
   - **Log Details Modal**: Inspect full workout record and associated logs table attributes.
   - **Cascading Delete**: Cleanly removes records from both `workouts` and `logs` tables.
   - Performance analytics with 7-day volume tracking and mood distribution breakdown.

5. **Supabase Backend Integration**:
   - Full integration with all PRD tables: `profiles`, `workouts`, `routines`, and `logs`.
   - Real-time connection status indicator pill on the top header with manual Sync button.
   - Supabase Auth support (Sign In, Sign Up, Sign Out, Profile syncing, and `onAuthStateChange` subscription).

---

## 🗄️ Database Schema (Supabase)

All 4 tables are deployed to your Supabase project (`hcscumsjcglzonzjvzvx`):

- **`profiles`**: `id` (UUID PK), `name` (TEXT), `email` (TEXT UNIQUE), `created_at` (TIMESTAMPTZ)
- **`workouts`**: `id` (UUID PK), `user_id` (UUID FK → `profiles.id`), `exercise` (TEXT), `duration` (INTEGER minutes), `timestamp` (TIMESTAMPTZ)
- **`routines`**: `id` (UUID PK), `user_id` (UUID FK → `profiles.id`), `title` (TEXT), `description` (TEXT), `created_at` (TIMESTAMPTZ)
- **`logs`**: `id` (UUID PK), `workout_id` (UUID FK → `workouts.id`), `notes` (TEXT), `mood` (TEXT), `created_at` (TIMESTAMPTZ)

---

## 🔒 Security Note: Supabase Row Level Security (RLS)

Currently, Row Level Security (RLS) is disabled on the public tables in the database project. While this allows testing in anonymous / guest mode, for production you should enable RLS. When you are ready to enable RLS, execute the following SQL migration in your Supabase SQL Editor:

```sql
-- 1. Enable RLS on all PRD tables
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."logs" ENABLE ROW LEVEL SECURITY;

-- 2. Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert/update own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- 3. Workouts policies (allows user access or guest fallback)
CREATE POLICY "Users can access own workouts" ON workouts FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- 4. Routines policies
CREATE POLICY "Users can access own routines" ON routines FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- 5. Logs policies
CREATE POLICY "Users can access logs" ON logs FOR ALL USING (
  workout_id IN (SELECT id FROM workouts WHERE auth.uid() = user_id OR user_id IS NULL)
);
```

---

## 🛠️ Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run the Vite development server
npm run dev

# 3. Open your browser
http://localhost:3000/
```

---

## 🔐 Environment Configuration (`.env`)

```env
VITE_SUPABASE_URL=https://hcscumsjcglzonzjvzvx.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
VITE_GEMINI_API_KEY=your_gemini_api_key_here  # Optional: can also be configured in the app settings UI
```

---

## 📱 Deployment Targets

- **Web (Vercel)**:
  - Configuration file `vercel.json` is included with SPA rewrites.
  - Connect your repository to Vercel, set build command to `npm run build`, output directory `dist`.
- **Android APK**:
  - Configuration file `capacitor.config.json` is included.
  - Run `npx cap init` and `npx cap add android` to build your native Android APK.
