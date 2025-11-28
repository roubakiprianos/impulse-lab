/**
 * Supabase Client - supabase.js
 *
 * Handles authentication and database operations for Focus Lab
 *
 * SETUP REQUIRED:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Replace SUPABASE_URL and SUPABASE_ANON_KEY below with your project credentials
 * 3. Create the focus_lab_results table (SQL provided below)
 */

// ===== CONFIGURATION =====
// TODO: Replace these with your Supabase project credentials
const SUPABASE_URL = 'https://gfgumogbgwfhhqsrbmyx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZ3Vtb2diZ3dmaGhxc3JibXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDY3MTEsImV4cCI6MjA3OTkyMjcxMX0.R73CKcP3LDdw77iEeZa_nYQQ0gem575x21SDNCwAavg';

// Initialize Supabase client
let supabase = null;

/**
 * Initialize the Supabase client
 * Call this once when the app loads
 */
function initSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('Supabase not configured. Please add your credentials to supabase.js');
    return false;
  }

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (e) {
    console.error('Failed to initialize Supabase:', e);
    return false;
  }
}

/**
 * Check if Supabase is properly configured
 */
function isSupabaseConfigured() {
  return supabase !== null;
}

// ===== AUTHENTICATION =====

/**
 * Get the current logged-in user
 * @returns {Object|null} User object or null if not logged in
 */
async function getCurrentUser() {
  if (!supabase) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (e) {
    console.error('Error getting user:', e);
    return null;
  }
}

/**
 * Sign up a new user with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Object} { user, error }
 */
async function signUp(email, password) {
  if (!supabase) return { user: null, error: 'Supabase not configured' };

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return { user: data.user, error: null };
  } catch (e) {
    return { user: null, error: e.message };
  }
}

/**
 * Sign in an existing user
 * @param {string} email
 * @param {string} password
 * @returns {Object} { user, error }
 */
async function signIn(email, password) {
  if (!supabase) return { user: null, error: 'Supabase not configured' };

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { user: data.user, error: null };
  } catch (e) {
    return { user: null, error: e.message };
  }
}

/**
 * Sign out the current user
 */
async function signOut() {
  if (!supabase) return;

  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Error signing out:', e);
  }
}

/**
 * Listen for auth state changes
 * @param {Function} callback - Called with (event, session) when auth state changes
 */
function onAuthStateChange(callback) {
  if (!supabase) return;

  supabase.auth.onAuthStateChange(callback);
}

// ===== DATABASE OPERATIONS =====

/**
 * Save a game session result
 * @param {Object} result - The session result to save
 * @returns {Object} { data, error }
 */
async function saveGameResult(result) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const user = await getCurrentUser();
  if (!user) return { data: null, error: 'Not logged in' };

  try {
    const { data, error } = await supabase
      .from('game_results')
      .insert({
        user_id: user.id,
        game_mode: result.gameMode,       // 'campaign', 'focusLab', 'freeplay'
        mode: result.mode,                 // 'tapOnBlue', 'blueCircle', etc.
        difficulty: result.difficulty,
        level: result.level || null,       // Campaign level (if applicable)
        score: result.score,
        hits: result.hits,
        misses: result.misses,
        false_taps: result.falseTaps,
        avg_reaction_time: result.avgReactionTime,
        total_targets: result.totalTargets,
        quarter_scores: result.quarterScores,
        quarter_rts: result.quarterRts
      })
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (e) {
    console.error('Error saving result:', e);
    return { data: null, error: e.message };
  }
}

// Alias for backwards compatibility
async function saveFocusLabResult(result) {
  return saveGameResult({ ...result, gameMode: 'focusLab' });
}

/**
 * Get game results for the current user
 * @param {string} range - 'today', 'week', 'month', or 'all'
 * @param {string} gameMode - Optional filter: 'campaign', 'focusLab', 'freeplay', or null for all
 * @returns {Object} { data, error }
 */
async function getGameResults(range = 'all', gameMode = null) {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const user = await getCurrentUser();
  if (!user) return { data: [], error: 'Not logged in' };

  try {
    let query = supabase
      .from('game_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter by game mode if specified
    if (gameMode) {
      query = query.eq('game_mode', gameMode);
    }

    // Apply date filter
    const now = new Date();
    if (range === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      query = query.gte('created_at', startOfDay);
    } else if (range === 'week') {
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', startOfWeek);
    } else if (range === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.gte('created_at', startOfMonth);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (e) {
    console.error('Error fetching results:', e);
    return { data: [], error: e.message };
  }
}

// Alias for backwards compatibility
async function getFocusLabResults(range = 'all') {
  return getGameResults(range, 'focusLab');
}

/**
 * Get statistics for the current user
 * @param {string} range - 'today', 'week', 'month', or 'all'
 * @param {string} gameMode - Optional filter: 'campaign', 'focusLab', 'freeplay', or null for all
 * @returns {Object} { sessions, avgScore, bestTimeOfDay }
 */
async function getGameStats(range = 'all', gameMode = null) {
  const { data, error } = await getGameResults(range, gameMode);

  if (error || data.length === 0) {
    return { sessions: 0, avgScore: null, bestTimeOfDay: null };
  }

  // Calculate average score
  const avgScore = Math.round(data.reduce((sum, r) => sum + r.score, 0) / data.length);

  // Find best time of day
  const hourScores = {};
  data.forEach(r => {
    const hour = new Date(r.created_at).getHours();
    if (!hourScores[hour]) {
      hourScores[hour] = { total: 0, count: 0 };
    }
    hourScores[hour].total += r.score;
    hourScores[hour].count++;
  });

  let bestHour = null;
  let bestAvg = 0;
  for (const hour in hourScores) {
    const avg = hourScores[hour].total / hourScores[hour].count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestHour = parseInt(hour);
    }
  }

  // Format best time of day
  let bestTimeOfDay = null;
  if (bestHour !== null) {
    const ampm = bestHour >= 12 ? 'PM' : 'AM';
    const hour12 = bestHour % 12 || 12;
    bestTimeOfDay = `${hour12} ${ampm}`;
  }

  return {
    sessions: data.length,
    avgScore,
    bestTimeOfDay
  };
}

// Alias for backwards compatibility
async function getFocusLabStats(range = 'all') {
  return getGameStats(range, 'focusLab');
}

/*
 * ===== DATABASE SETUP =====
 *
 * Run this SQL in your Supabase SQL Editor to create the required table:
 *
 * CREATE TABLE game_results (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   game_mode TEXT NOT NULL,        -- 'campaign', 'focusLab', 'freeplay'
 *   mode TEXT,                       -- 'tapOnBlue', 'blueCircle', 'multiTarget', 'focusLab'
 *   difficulty TEXT NOT NULL,
 *   level INTEGER,                   -- Campaign level (null for non-campaign)
 *   score INTEGER NOT NULL,
 *   hits INTEGER NOT NULL,
 *   misses INTEGER NOT NULL,
 *   false_taps INTEGER NOT NULL,
 *   avg_reaction_time INTEGER,
 *   total_targets INTEGER,
 *   quarter_scores JSONB,
 *   quarter_rts JSONB
 * );
 *
 * -- Enable Row Level Security
 * ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
 *
 * -- Create policy: users can only see their own data
 * CREATE POLICY "Users can view own results" ON game_results
 *   FOR SELECT USING (auth.uid() = user_id);
 *
 * -- Create policy: users can insert their own data
 * CREATE POLICY "Users can insert own results" ON game_results
 *   FOR INSERT WITH CHECK (auth.uid() = user_id);
 *
 */
