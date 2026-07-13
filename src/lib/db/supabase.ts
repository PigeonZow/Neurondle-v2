import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client (uses anon key)
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Server-side Supabase client (uses service role key for admin operations)
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase server environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Database types (matches schema from SPECS.md section 5)
export interface Database {
  public: {
    Tables: {
      explanations: {
        Row: {
          id: string
          model_id: string
          layer: string
          feature_index: number
          description: string
          explanation_model_name: string | null
          type_name: string | null
          synced_at: string
        }
        Insert: Omit<Database['public']['Tables']['explanations']['Row'], 'id' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['explanations']['Insert']>
      }
      puzzles: {
        Row: {
          id: string
          date: string
          round_number: number
          model_id: string
          layer: string
          feature_index: number
          ground_truth_label: string
          answer_x: number
          answer_y: number
          hints: unknown // JSONB
          explanation_score: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['puzzles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['puzzles']['Insert']>
      }
      sessions: {
        Row: {
          id: string
          session_token: string
          date: string
          current_round: number
          total_score: number
          completed: boolean
          research_consent: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sessions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['sessions']['Insert']>
      }
      round_attempts: {
        Row: {
          id: string
          session_id: string
          puzzle_id: string
          round_number: number
          game_id: string | null
          pin_x: number
          pin_y: number
          distance: number
          score: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['round_attempts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['round_attempts']['Insert']>
      }
      activation_tests: {
        Row: {
          id: string
          session_id: string
          puzzle_id: string
          round_number: number
          game_id: string | null
          text_length: number
          max_activation: number
          token_count: number
          token_activations: unknown | null // JSONB
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activation_tests']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activation_tests']['Insert']>
      }
      used_features: {
        Row: {
          id: number
          feature_keys: string[]
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['used_features']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['used_features']['Insert']>
      }
    }
  }
}
