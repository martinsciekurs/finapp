/**
 * Supabase Database Types
 *
 * PLACEHOLDER — This file will be replaced by running:
 *   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 *
 * Hand-written to match the current schema so development can proceed.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          currency: string
          role: Database["public"]["Enums"]["user_role"]
          hero_banner: Json | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          stripe_customer_id: string | null
          theme_preference: Database["public"]["Enums"]["theme_preference"]
          onboarding_completed_steps: Json
          onboarding_completed_at: string | null
          tour_completed_steps: Json
          tour_completed_at: string | null
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string
          currency?: string
          role?: Database["public"]["Enums"]["user_role"]
          hero_banner?: Json | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          stripe_customer_id?: string | null
          theme_preference?: Database["public"]["Enums"]["theme_preference"]
          onboarding_completed_steps?: Json
          onboarding_completed_at?: string | null
          tour_completed_steps?: Json
          tour_completed_at?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          currency?: string
          role?: Database["public"]["Enums"]["user_role"]
          hero_banner?: Json | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          stripe_customer_id?: string | null
          theme_preference?: Database["public"]["Enums"]["theme_preference"]
          onboarding_completed_steps?: Json
          onboarding_completed_at?: string | null
          tour_completed_steps?: Json
          tour_completed_at?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_groups: {
        Row: {
          id: string
          user_id: string
          name: string
          type: Database["public"]["Enums"]["category_type"]
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: Database["public"]["Enums"]["category_type"]
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: Database["public"]["Enums"]["category_type"]
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          user_id: string
          group_id: string
          name: string
          type: Database["public"]["Enums"]["category_type"]
          icon: string
          color: string
          sort_order: number
          budget_80_notified_at: string | null
          budget_100_notified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          group_id: string
          name: string
          type: Database["public"]["Enums"]["category_type"]
          icon?: string
          color?: string
          sort_order?: number
          budget_80_notified_at?: string | null
          budget_100_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string
          name?: string
          type?: Database["public"]["Enums"]["category_type"]
          icon?: string
          color?: string
          sort_order?: number
          budget_80_notified_at?: string | null
          budget_100_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_categories_group"
            columns: ["group_id", "user_id"]
            isOneToOne: false
            referencedRelation: "category_groups"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount: number
          type: Database["public"]["Enums"]["transaction_type"]
          description: string
          date: string
          source: Database["public"]["Enums"]["transaction_source"]
          ai_generated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          amount: number
          type: Database["public"]["Enums"]["transaction_type"]
          description?: string
          date: string
          source?: Database["public"]["Enums"]["transaction_source"]
          ai_generated?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          amount?: number
          type?: Database["public"]["Enums"]["transaction_type"]
          description?: string
          date?: string
          source?: Database["public"]["Enums"]["transaction_source"]
          ai_generated?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_category"
            columns: ["category_id", "user_id", "type"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id", "type"]
          },
        ]
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          amount: number
          due_date: string
          frequency: Database["public"]["Enums"]["reminder_frequency"]
          auto_create_transaction: boolean
          category_id: string
          last_notified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          amount: number
          due_date: string
          frequency: Database["public"]["Enums"]["reminder_frequency"]
          auto_create_transaction?: boolean
          category_id: string
          last_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          amount?: number
          due_date?: string
          frequency?: Database["public"]["Enums"]["reminder_frequency"]
          auto_create_transaction?: boolean
          category_id?: string
          last_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reminders_category"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      reminder_payments: {
        Row: {
          id: string
          reminder_id: string
          user_id: string
          due_date: string
          paid_at: string
          transaction_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reminder_id: string
          user_id: string
          due_date: string
          paid_at?: string
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reminder_id?: string
          user_id?: string
          due_date?: string
          paid_at?: string
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reminder_payments_reminder_user"
            columns: ["reminder_id", "user_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "reminder_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reminder_payments_transaction"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      debts: {
        Row: {
          id: string
          user_id: string
          counterparty: string
          type: Database["public"]["Enums"]["debt_type"]
          category_id: string | null
          debt_date: string
          original_amount: number
          remaining_amount: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          counterparty: string
          type: Database["public"]["Enums"]["debt_type"]
          category_id?: string | null
          debt_date?: string
          original_amount: number
          remaining_amount: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          counterparty?: string
          type?: Database["public"]["Enums"]["debt_type"]
          category_id?: string | null
          debt_date?: string
          original_amount?: number
          remaining_amount?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_debts_category"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          id: string
          debt_id: string
          user_id: string
          amount: number
          note: string | null
          transaction_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          debt_id: string
          user_id: string
          amount: number
          note?: string | null
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          debt_id?: string
          user_id?: string
          amount?: number
          note?: string | null
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_debt_payments_debt"
            columns: ["debt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "debt_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_debt_payments_transaction"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      banner_presets: {
        Row: {
          id: string
          type: Database["public"]["Enums"]["banner_type"]
          value: string
          label: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: Database["public"]["Enums"]["banner_type"]
          value: string
          label: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: Database["public"]["Enums"]["banner_type"]
          value?: string
          label?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          status: string
          current_period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          status: string
          current_period_end: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string
          status?: string
          current_period_end?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_usage: {
        Row: {
          user_id: string
          credits_used: number
          date: string
        }
        Insert: {
          user_id: string
          credits_used?: number
          date: string
        }
        Update: {
          user_id?: string
          credits_used?: number
          date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memories: {
        Row: {
          id: string
          user_id: string
          rule: string
          source: Database["public"]["Enums"]["ai_memory_source"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          rule: string
          source?: Database["public"]["Enums"]["ai_memory_source"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          rule?: string
          source?: Database["public"]["Enums"]["ai_memory_source"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          id: string
          user_id: string
          record_type: Database["public"]["Enums"]["attachment_record_type"]
          record_id: string
          file_path: string
          file_name: string
          file_size: number
          mime_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          record_type: Database["public"]["Enums"]["attachment_record_type"]
          record_id: string
          file_path: string
          file_name: string
          file_size: number
          mime_type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          record_type?: Database["public"]["Enums"]["attachment_record_type"]
          record_id?: string
          file_path?: string
          file_name?: string
          file_size?: number
          mime_type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_sessions: {
        Row: {
          chat_id: number
          user_id: string
          messages: Json
          pending_action: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          chat_id: number
          user_id: string
          messages?: Json
          pending_action?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          chat_id?: number
          user_id?: string
          messages?: Json
          pending_action?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      category_budgets: {
        Row: {
          id: string
          category_id: string
          user_id: string
          year_month: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          user_id: string
          year_month: string
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          user_id?: string
          year_month?: string
          amount?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_category_budgets_category"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "category_budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_income_targets: {
        Row: {
          id: string
          user_id: string
          year_month: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year_month: string
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          year_month?: string
          amount?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_income_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          is_read: boolean
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          is_read?: boolean
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          message?: string
          is_read?: boolean
          data?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_onboarding_step: {
        Args: {
          profile_id: string
          step: string
        }
        Returns: undefined
      }
      batch_reorder_categories: {
        Args: { p_items: Json }
        Returns: undefined
      }
      batch_reorder_groups: {
        Args: { p_items: Json }
        Returns: undefined
      }
      create_category_auto_sort: {
        Args: {
          p_group_id: string
          p_name: string
          p_type: string
          p_icon: string
          p_color: string
        }
        Returns: string
      }
      create_group_auto_sort: {
        Args: { p_name: string; p_type: string }
        Returns: string
      }
      delete_debt_payment_atomic: {
        Args: { p_payment_id: string }
        Returns: Json
      }
      delete_category_with_reassign: {
        Args: { p_category_id: string; p_reassign_to?: string }
        Returns: undefined
      }
      delete_group_with_reassign: {
        Args: { p_group_id: string; p_reassign_to?: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      record_debt_payment_atomic: {
        Args: {
          p_debt_id: string
          p_amount: number
          p_note?: string | null
          p_payment_date?: string
        }
        Returns: Json
      }
      update_debt_atomic: {
        Args: {
          p_debt_id: string
          p_counterparty: string
          p_type: string
          p_category_id?: string | null
          p_debt_date?: string
          p_original_amount?: number
          p_description?: string | null
        }
        Returns: Json
      }
      update_debt_payment_atomic: {
        Args: {
          p_payment_id: string
          p_amount: number
          p_note?: string | null
          p_payment_date?: string
        }
        Returns: Json
      }
    }
    Enums: {
      user_role: "admin" | "user"
      subscription_tier: "free" | "pro"
      theme_preference: "system" | "light" | "dark"
      category_type: "expense" | "income"
      transaction_type: "expense" | "income"
      transaction_source: "web" | "telegram" | "voice"
      reminder_frequency: "monthly" | "weekly" | "yearly" | "one_time"
      debt_type: "i_owe" | "they_owe"
      banner_type: "color" | "gradient" | "image"
      ai_memory_source: "auto" | "manual"
      attachment_record_type: "transaction" | "debt" | "reminder"
      notification_type:
        | "budget_80"
        | "budget_100"
        | "reminder_due"
        | "debt_settled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ──────────────────────────────────────────────
// Helper types (mirrors supabase-js helpers)
// ──────────────────────────────────────────────

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
