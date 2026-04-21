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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          color: string | null
          created_at: string
          id: string
          initial_balance: number
          name: string
          scope: Database["public"]["Enums"]["scope_type"]
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          name: string
          scope?: Database["public"]["Enums"]["scope_type"]
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          name?: string
          scope?: Database["public"]["Enums"]["scope_type"]
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kind: string
          name: string
          scope: Database["public"]["Enums"]["scope_type"]
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          scope?: Database["public"]["Enums"]["scope_type"]
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          scope?: Database["public"]["Enums"]["scope_type"]
        }
        Relationships: []
      }
      daily_plans: {
        Row: {
          created_at: string
          date: string
          id: string
          notes_drawing: string | null
          notes_rich: string | null
          reflection: string | null
          top_priorities: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes_drawing?: string | null
          notes_rich?: string | null
          reflection?: string | null
          top_priorities?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes_drawing?: string | null
          notes_rich?: string | null
          reflection?: string | null
          top_priorities?: Json
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean
          color: string | null
          created_at: string
          date: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          scope: Database["public"]["Enums"]["scope_type"]
          start_time: string | null
          title: string
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          date: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          start_time?: string | null
          title: string
        }
        Update: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          start_time?: string | null
          title?: string
        }
        Relationships: []
      }
      free_notes: {
        Row: {
          content_drawing: string | null
          content_rich: string | null
          created_at: string
          id: string
          pinned: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          content_drawing?: string | null
          content_rich?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          content_drawing?: string | null
          content_rich?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_value: number | null
          deadline: string | null
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["goal_kind"]
          name: string
          scope: Database["public"]["Enums"]["scope_type"]
          status: Database["public"]["Enums"]["goal_status"]
          target_tasks: number | null
          target_value: number | null
          weight_financial: number | null
          weight_tasks: number | null
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["goal_kind"]
          name: string
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["goal_status"]
          target_tasks?: number | null
          target_value?: number | null
          weight_financial?: number | null
          weight_tasks?: number | null
        }
        Update: {
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["goal_kind"]
          name?: string
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["goal_status"]
          target_tasks?: number | null
          target_value?: number | null
          weight_financial?: number | null
          weight_tasks?: number | null
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          created_at: string
          date: string
          done: boolean
          habit_id: string
          id: string
          note: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          done?: boolean
          habit_id: string
          id?: string
          note?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          done?: boolean
          habit_id?: string
          id?: string
          note?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean
          archived: boolean
          color: string | null
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["habit_frequency"]
          goal_id: string | null
          id: string
          name: string
          scope: Database["public"]["Enums"]["scope_type"]
          target_per_week: number | null
          target_value: number | null
          unit: string | null
        }
        Insert: {
          active?: boolean
          archived?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["habit_frequency"]
          goal_id?: string | null
          id?: string
          name: string
          scope?: Database["public"]["Enums"]["scope_type"]
          target_per_week?: number | null
          target_value?: number | null
          unit?: string | null
        }
        Update: {
          active?: boolean
          archived?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["habit_frequency"]
          goal_id?: string | null
          id?: string
          name?: string
          scope?: Database["public"]["Enums"]["scope_type"]
          target_per_week?: number | null
          target_value?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          done: boolean
          goal_id: string
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          done?: boolean
          goal_id: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          done?: boolean
          goal_id?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrences: {
        Row: {
          account_id: string
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          day_of_month: number | null
          description: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurrence_freq"]
          id: string
          scope: Database["public"]["Enums"]["scope_type"]
          start_date: string
          type: Database["public"]["Enums"]["txn_type"]
        }
        Insert: {
          account_id: string
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_freq"]
          id?: string
          scope?: Database["public"]["Enums"]["scope_type"]
          start_date?: string
          type: Database["public"]["Enums"]["txn_type"]
        }
        Update: {
          account_id?: string
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_freq"]
          id?: string
          scope?: Database["public"]["Enums"]["scope_type"]
          start_date?: string
          type?: Database["public"]["Enums"]["txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "recurrences_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          goal_id: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          scope: Database["public"]["Enums"]["scope_type"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          goal_id?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          goal_id?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          external_ref: string | null
          goal_id: string | null
          id: string
          nature: Database["public"]["Enums"]["txn_nature"]
          scope: Database["public"]["Enums"]["scope_type"]
          status: Database["public"]["Enums"]["txn_status"]
          to_account_id: string | null
          type: Database["public"]["Enums"]["txn_type"]
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          external_ref?: string | null
          goal_id?: string | null
          id?: string
          nature?: Database["public"]["Enums"]["txn_nature"]
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["txn_status"]
          to_account_id?: string | null
          type: Database["public"]["Enums"]["txn_type"]
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          external_ref?: string | null
          goal_id?: string | null
          id?: string
          nature?: Database["public"]["Enums"]["txn_nature"]
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["txn_status"]
          to_account_id?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          balance_financial: string | null
          balance_health: string | null
          balance_personal: string | null
          balance_professional: string | null
          created_at: string
          focus: string | null
          id: string
          notes: string | null
          objectives: Json
          priorities: Json
          updated_at: string
          week_start: string
        }
        Insert: {
          balance_financial?: string | null
          balance_health?: string | null
          balance_personal?: string | null
          balance_professional?: string | null
          created_at?: string
          focus?: string | null
          id?: string
          notes?: string | null
          objectives?: Json
          priorities?: Json
          updated_at?: string
          week_start: string
        }
        Update: {
          balance_financial?: string | null
          balance_health?: string | null
          balance_personal?: string | null
          balance_professional?: string | null
          created_at?: string
          focus?: string | null
          id?: string
          notes?: string | null
          objectives?: Json
          priorities?: Json
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          biggest_lesson: string | null
          biggest_mistake: string | null
          consistency: number | null
          created_at: string
          id: string
          important_decisions: string | null
          next_week_changes: string | null
          productivity: number | null
          rating: number | null
          updated_at: string
          week_start: string
          what_didnt: string | null
          what_worked: string | null
        }
        Insert: {
          biggest_lesson?: string | null
          biggest_mistake?: string | null
          consistency?: number | null
          created_at?: string
          id?: string
          important_decisions?: string | null
          next_week_changes?: string | null
          productivity?: number | null
          rating?: number | null
          updated_at?: string
          week_start: string
          what_didnt?: string | null
          what_worked?: string | null
        }
        Update: {
          biggest_lesson?: string | null
          biggest_mistake?: string | null
          consistency?: number | null
          created_at?: string
          id?: string
          important_decisions?: string | null
          next_week_changes?: string | null
          productivity?: number | null
          rating?: number | null
          updated_at?: string
          week_start?: string
          what_didnt?: string | null
          what_worked?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_balance: {
        Args: { p_account: string; p_until?: string }
        Returns: number
      }
    }
    Enums: {
      goal_kind: "tarefas" | "financeiro" | "marcos" | "hibrida"
      goal_status: "ativa" | "concluida" | "pausada"
      habit_frequency: "diaria" | "semanal"
      recurrence_freq: "diaria" | "semanal" | "mensal" | "anual"
      scope_type: "pessoal" | "profissional"
      task_priority: "alta" | "media" | "baixa"
      task_status: "pendente" | "em_andamento" | "concluida"
      txn_nature: "fixo" | "variavel"
      txn_status: "pago" | "pendente" | "futuro"
      txn_type: "entrada" | "saida" | "transferencia"
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
  public: {
    Enums: {
      goal_kind: ["tarefas", "financeiro", "marcos", "hibrida"],
      goal_status: ["ativa", "concluida", "pausada"],
      habit_frequency: ["diaria", "semanal"],
      recurrence_freq: ["diaria", "semanal", "mensal", "anual"],
      scope_type: ["pessoal", "profissional"],
      task_priority: ["alta", "media", "baixa"],
      task_status: ["pendente", "em_andamento", "concluida"],
      txn_nature: ["fixo", "variavel"],
      txn_status: ["pago", "pendente", "futuro"],
      txn_type: ["entrada", "saida", "transferencia"],
    },
  },
} as const
