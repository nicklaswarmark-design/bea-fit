export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      exercise_sets: {
        Row: {
          completed: boolean
          created_at: string
          exercise_id: string
          exercise_order: number
          id: string
          rep_max: number | null
          rep_min: number | null
          reps: number
          session_id: string
          set_index: number
          too_hard: boolean
          user_id: string
          weight: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercise_id: string
          exercise_order?: number
          id?: string
          rep_max?: number | null
          rep_min?: number | null
          reps?: number
          session_id: string
          set_index?: number
          too_hard?: boolean
          user_id: string
          weight?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercise_id?: string
          exercise_order?: number
          id?: string
          rep_max?: number | null
          rep_min?: number | null
          reps?: number
          session_id?: string
          set_index?: number
          too_hard?: boolean
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          alternatives: string[]
          equipment: string[]
          id: string
          instructions: string
          media_url: string | null
          mistakes: string[]
          muscles: string[]
          name: string
        }
        Insert: {
          alternatives?: string[]
          equipment?: string[]
          id: string
          instructions?: string
          media_url?: string | null
          mistakes?: string[]
          muscles?: string[]
          name: string
        }
        Update: {
          alternatives?: string[]
          equipment?: string[]
          id?: string
          instructions?: string
          media_url?: string | null
          mistakes?: string[]
          muscles?: string[]
          name?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          achieved: boolean
          created_at: string
          distance_km: number | null
          exercise_id: string | null
          id: string
          kind: string
          notes: string
          start_value: number | null
          target_date: string | null
          target_time_seconds: number | null
          target_value: number | null
          title: string
          user_id: string
        }
        Insert: {
          achieved?: boolean
          created_at?: string
          distance_km?: number | null
          exercise_id?: string | null
          id?: string
          kind?: string
          notes?: string
          start_value?: number | null
          target_date?: string | null
          target_time_seconds?: number | null
          target_value?: number | null
          title?: string
          user_id: string
        }
        Update: {
          achieved?: boolean
          created_at?: string
          distance_km?: number | null
          exercise_id?: string | null
          id?: string
          kind?: string
          notes?: string
          start_value?: number | null
          target_date?: string | null
          target_time_seconds?: number | null
          target_value?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          achieved_at: string
          id: string
          key: string
          seen: boolean
          user_id: string
        }
        Insert: {
          achieved_at?: string
          id?: string
          key: string
          seen?: boolean
          user_id: string
        }
        Update: {
          achieved_at?: string
          id?: string
          key?: string
          seen?: boolean
          user_id?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string
          est_1rm: number
          exercise_id: string
          id: string
          reps: number
          session_id: string | null
          user_id: string
          weight: number
        }
        Insert: {
          achieved_at?: string
          est_1rm: number
          exercise_id: string
          id?: string
          reps: number
          session_id?: string | null
          user_id: string
          weight: number
        }
        Update: {
          achieved_at?: string
          est_1rm?: number
          exercise_id?: string
          id?: string
          reps?: number
          session_id?: string | null
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avoid_movements: string
          created_at: string
          equipment: string[]
          goal: string
          id: string
          level: string
          name: string
          onboarded: boolean
          program_start: string
          reminder_time: string
          reminders_enabled: boolean
          run_ability: string
          runs_per_week: number
          session_minutes: number
          strength_per_week: number
          training_days: number[]
          updated_at: string
          weight_increment: number
        }
        Insert: {
          avoid_movements?: string
          created_at?: string
          equipment?: string[]
          goal?: string
          id: string
          level?: string
          name?: string
          onboarded?: boolean
          program_start?: string
          reminder_time?: string
          reminders_enabled?: boolean
          run_ability?: string
          runs_per_week?: number
          session_minutes?: number
          strength_per_week?: number
          training_days?: number[]
          updated_at?: string
          weight_increment?: number
        }
        Update: {
          avoid_movements?: string
          created_at?: string
          equipment?: string[]
          goal?: string
          id?: string
          level?: string
          name?: string
          onboarded?: boolean
          program_start?: string
          reminder_time?: string
          reminders_enabled?: boolean
          run_ability?: string
          runs_per_week?: number
          session_minutes?: number
          strength_per_week?: number
          training_days?: number[]
          updated_at?: string
          weight_increment?: number
        }
        Relationships: []
      }
      running_sessions: {
        Row: {
          created_at: string
          distance_km: number
          duration_seconds: number
          effort: number | null
          id: string
          intervals: boolean
          notes: string
          run_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance_km: number
          duration_seconds: number
          effort?: number | null
          id?: string
          intervals?: boolean
          notes?: string
          run_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance_km?: number
          duration_seconds?: number
          effort?: number | null
          id?: string
          intervals?: boolean
          notes?: string
          run_date?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_sessions: {
        Row: {
          created_at: string
          id: string
          note: string
          original_date: string | null
          planned_date: string
          status: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          original_date?: string | null
          planned_date: string
          status?: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          original_date?: string | null
          planned_date?: string
          status?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          effort: number | null
          ended_at: string | null
          id: string
          kind: string
          name: string
          notes: string
          reduced_volume: boolean
          started_at: string
          state: Json | null
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          effort?: number | null
          ended_at?: string | null
          id?: string
          kind?: string
          name: string
          notes?: string
          reduced_volume?: boolean
          started_at?: string
          state?: Json | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          effort?: number | null
          ended_at?: string | null
          id?: string
          kind?: string
          name?: string
          notes?: string
          reduced_volume?: boolean
          started_at?: string
          state?: Json | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          day_of_week: number | null
          duration: string
          id: string
          items: Json
          kind: string
          name: string
          sort: number
          subtitle: string
          user_id: string
          warmup: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          duration?: string
          id?: string
          items?: Json
          kind?: string
          name: string
          sort?: number
          subtitle?: string
          user_id: string
          warmup?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          duration?: string
          id?: string
          items?: Json
          kind?: string
          name?: string
          sort?: number
          subtitle?: string
          user_id?: string
          warmup?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_my_data: { Args: never; Returns: undefined }
      reset_my_program: { Args: never; Returns: undefined }
      seed_default_program: { Args: { _uid: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
