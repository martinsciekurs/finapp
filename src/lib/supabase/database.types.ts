export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_memories: {
        Row: {
          created_at: string
          id: string
          rule: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rule: string
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rule?: string
          source?: string
          updated_at?: string
          user_id?: string
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
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          record_id: string
          record_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          record_id: string
          record_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          record_id?: string
          record_type?: string
          updated_at?: string
          user_id?: string
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
      banner_presets: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          type: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          type: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          type?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          budget_100_notified_at: string | null
          budget_80_notified_at: string | null
          color: string
          created_at: string
          group_id: string
          icon: string
          id: string
          name: string
          sort_order: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_100_notified_at?: string | null
          budget_80_notified_at?: string | null
          color?: string
          created_at?: string
          group_id: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_100_notified_at?: string | null
          budget_80_notified_at?: string | null
          color?: string
          created_at?: string
          group_id?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          type?: string
          updated_at?: string
          user_id?: string
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
      category_budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          year_month: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          year_month: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_category_budgets_category"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      category_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          type?: string
          updated_at?: string
          user_id?: string
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
      daily_usage: {
        Row: {
          created_at: string
          credits_used: number
          date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          date?: string
          updated_at?: string
          user_id?: string
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
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string
          id: string
          note: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          debt_id: string
          id?: string
          note?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string
          id?: string
          note?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_debt_payments_debt"
            columns: ["debt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id", "user_id"]
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
      debts: {
        Row: {
          category_id: string | null
          counterparty: string
          created_at: string
          debt_date: string
          description: string | null
          id: string
          original_amount: number
          remaining_amount: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          counterparty: string
          created_at?: string
          debt_date?: string
          description?: string | null
          id?: string
          original_amount: number
          remaining_amount: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          counterparty?: string
          created_at?: string
          debt_date?: string
          description?: string | null
          id?: string
          original_amount?: number
          remaining_amount?: number
          type?: string
          updated_at?: string
          user_id?: string
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
      monthly_income_targets: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          year_month: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          year_month: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          year_month?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
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
      profiles: {
        Row: {
          created_at: string
          currency: string
          display_name: string | null
          hero_banner: Json
          id: string
          notification_preferences: Json
          onboarding_completed_at: string | null
          onboarding_completed_steps: Json
          role: string
          stripe_customer_id: string | null
          subscription_tier: string
          theme_preference: string
          tour_completed_at: string | null
          tour_completed_steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name?: string | null
          hero_banner?: Json
          id: string
          notification_preferences?: Json
          onboarding_completed_at?: string | null
          onboarding_completed_steps?: Json
          role?: string
          stripe_customer_id?: string | null
          subscription_tier?: string
          theme_preference?: string
          tour_completed_at?: string | null
          tour_completed_steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string | null
          hero_banner?: Json
          id?: string
          notification_preferences?: Json
          onboarding_completed_at?: string | null
          onboarding_completed_steps?: Json
          role?: string
          stripe_customer_id?: string | null
          subscription_tier?: string
          theme_preference?: string
          tour_completed_at?: string | null
          tour_completed_steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      reminder_payments: {
        Row: {
          created_at: string
          due_date: string
          id: string
          paid_at: string
          reminder_id: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          paid_at?: string
          reminder_id: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          paid_at?: string
          reminder_id?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "fk_reminder_payments_transaction"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "reminder_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          amount: number
          auto_create_transaction: boolean
          category_id: string
          created_at: string
          due_date: string
          frequency: string
          id: string
          last_notified_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          auto_create_transaction?: boolean
          category_id: string
          created_at?: string
          due_date: string
          frequency: string
          id?: string
          last_notified_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_create_transaction?: boolean
          category_id?: string
          created_at?: string
          due_date?: string
          frequency?: string
          id?: string
          last_notified_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reminders_category"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          id: string
          status: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end: string
          id?: string
          status: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          id?: string
          status?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
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
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
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
          created_at: string
          messages: Json
          pending_action: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          messages?: Json
          pending_action?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          messages?: Json
          pending_action?: Json | null
          updated_at?: string
          user_id?: string
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
      transaction_tags: {
        Row: {
          created_at: string
          tag_id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_user_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          ai_generated: boolean
          amount: number
          category_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          source: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          amount: number
          category_id: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          source?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          amount?: number
          category_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          source?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_category"
            columns: ["category_id", "user_id", "type"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id", "type"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
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
        Args: { profile_id: string; step: string }
        Returns: undefined
      }
      append_tour_step: {
        Args: { profile_id: string; step: string }
        Returns: undefined
      }
      batch_reorder_categories: { Args: { p_items: Json }; Returns: undefined }
      batch_reorder_groups: { Args: { p_items: Json }; Returns: undefined }
      create_category_auto_sort: {
        Args: {
          p_color: string
          p_group_id: string
          p_icon: string
          p_name: string
          p_type: string
        }
        Returns: string
      }
      create_group_auto_sort: {
        Args: { p_name: string; p_type: string }
        Returns: string
      }
      delete_category_with_reassign: {
        Args: { p_category_id: string; p_reassign_to?: string }
        Returns: undefined
      }
      delete_debt_atomic: {
        Args: { p_debt_id: string; p_delete_linked_transactions?: boolean }
        Returns: Json
      }
      delete_debt_payment_atomic: {
        Args: { p_payment_id: string }
        Returns: Json
      }
      delete_group_with_reassign: {
        Args: { p_group_id: string; p_reassign_to?: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      record_debt_payment_atomic: {
        Args: {
          p_amount: number
          p_debt_id: string
          p_note?: string
          p_payment_date?: string
        }
        Returns: Json
      }
      update_debt_atomic: {
        Args: {
          p_category_id?: string
          p_counterparty: string
          p_debt_date?: string
          p_debt_id: string
          p_description?: string
          p_original_amount?: number
          p_type: string
        }
        Returns: Json
      }
      update_debt_payment_atomic: {
        Args: {
          p_amount: number
          p_note?: string
          p_payment_date?: string
          p_payment_id: string
        }
        Returns: Json
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

