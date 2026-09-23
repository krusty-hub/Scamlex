import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] as string
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// Main Supabase Client Instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/* ============================================================================
   Interfaces & Types
   ============================================================================ */

export interface SaveScanParams {
  inputText: string
  result?: string
  riskScore?: number
  detectionType?: string
  metadata?: Record<string, any>
}

export interface SubmitFeedbackParams {
  rating: number
  message?: string
  category?: string
}

/* ============================================================================
   Helper Functions for Profiles, Scans, Feedback, & Analytics
   ============================================================================ */

/**
 * Fetch the currently logged-in user's profile row
 */
export async function getCurrentUserProfile() {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { profile: null, error: authError }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { profile, error }
}

/**
 * Save a new scan record to scan_history
 */
export async function saveScanRecord({
  inputText,
  result,
  riskScore,
  detectionType,
  metadata = {}
}: SaveScanParams) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // DEBUG LOGS: Check your browser console when you scan
  console.log("Auth User Check:", user?.id, authError);

  if (!user) throw new Error("User must be authenticated to save scan history")

  const { data, error } = await supabase
    .from('scan_history')
    .insert([
      {
        user_id: user.id,
        input_text: inputText,
        result: result,
        risk_score: riskScore,
        detection_type: detectionType,
        metadata: metadata
      }
    ])
    .select()
    .single()

  if (error) {
    console.error("Supabase Insert Error Details:", error);
  }

  return { data, error }
}

/**
 * Fetch scan history for the current user
 */
export async function getUserScanHistory(limit: number = 20) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { scans: [], error: null }

  const { data: scans, error } = await supabase
    .from('scan_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { scans, error }
}

/**
 * Submit user feedback
 */
export async function submitUserFeedback({
  rating,
  message,
  category
}: SubmitFeedbackParams) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('feedback')
    .insert([
      {
        user_id: user?.id || null,
        rating,
        message,
        category
      }
    ])
    .select()
    .single()

  return { data, error }
}

/**
 * Track an event in analytics_events
 */
export async function trackAnalyticsEvent(
  eventName: string,
  page?: string,
  metadata: Record<string, any> = {}
) {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('analytics_events')
    .insert([
      {
        user_id: user?.id || null,
        event_name: eventName,
        page,
        metadata
      }
    ])

  if (error) console.error("Analytics tracking error:", error.message)
}