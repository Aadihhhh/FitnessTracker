# Product Requirements Document (PRD) — FitnessTracker

## Overview
FitnessTracker is a customizable fitness tracking app with Supabase backend and AI‑assisted frontend. It allows users to log workouts, track progress, and manage routines.

---

## Tables

### profiles
- id (uuid, primary key)
- name (text)
- email (text, unique)
- created_at (timestamp, default now)

### workouts
- id (uuid, primary key)
- user_id (uuid, foreign key → profiles.id)
- exercise (text)
- duration (integer, minutes)
- timestamp (timestamp, default now)

### routines
- id (uuid, primary key)
- user_id (uuid, foreign key → profiles.id)
- title (text)
- description (text)
- created_at (timestamp, default now)

### logs
- id (uuid, primary key)
- workout_id (uuid, foreign key → workouts.id)
- notes (text)
- mood (text)
- created_at (timestamp, default now)

---

## Features
- User authentication via Supabase
- AI‑assisted workout suggestions (Gemini)
- Routine builder with customizable exercises
- Progress tracking with logs and analytics
- Deployment target: Web (Vercel), later Android APK

---

## Constraints
- Backend provider: Supabase
- Frontend: FlutterFlow / Vite
- AI integration: Gemini + Antigravity MCP
