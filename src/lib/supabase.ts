import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      request_history: {
        Row: {
          id: string
          timestamp: string
          method: string
          url: string
          path: string
          client_ip: string
          user_agent: string | null
          request_data: any
          created_at: string
        }
        Insert: {
          id: string
          timestamp: string
          method: string
          url: string
          path: string
          client_ip: string
          user_agent?: string | null
          request_data: any
          created_at?: string
        }
        Update: {
          id?: string
          timestamp?: string
          method?: string
          url?: string
          path?: string
          client_ip?: string
          user_agent?: string | null
          request_data?: any
          created_at?: string
        }
      }
    }
  }
}