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
      actions_audit: {
        Row: {
          actor: string
          actor_id: string | null
          branch: string
          correlation_id: string
          created_at: string
          id: string
          workflow_id: string
        }
        Insert: {
          actor: string
          actor_id?: string | null
          branch: string
          correlation_id: string
          created_at?: string
          id?: string
          workflow_id: string
        }
        Update: {
          actor?: string
          actor_id?: string | null
          branch?: string
          correlation_id?: string
          created_at?: string
          id?: string
          workflow_id?: string
        }
        Relationships: []
      }
      actions_cache: {
        Row: {
          expires_at: string
          key: string
          value: Json
        }
        Insert: {
          expires_at: string
          key: string
          value: Json
        }
        Update: {
          expires_at?: string
          key?: string
          value?: Json
        }
        Relationships: []
      }
      automation_tracker: {
        Row: {
          created_at: string
          feature: string | null
          id: string
          last_run_date: string | null
          notes: string | null
          status: string
          test_file: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature?: string | null
          id?: string
          last_run_date?: string | null
          notes?: string | null
          status?: string
          test_file?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature?: string | null
          id?: string
          last_run_date?: string | null
          notes?: string | null
          status?: string
          test_file?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jira_cards: {
        Row: {
          assignee: string | null
          assignee_avatar: string | null
          bug_type: string | null
          created_at: string
          description: string | null
          id: string
          issue_links: Json
          jira_synced: boolean
          key: string
          priority: string
          status: string
          time_indicator: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          assignee_avatar?: string | null
          bug_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_links?: Json
          jira_synced?: boolean
          key: string
          priority?: string
          status?: string
          time_indicator?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          assignee_avatar?: string | null
          bug_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_links?: Json
          jira_synced?: boolean
          key?: string
          priority?: string
          status?: string
          time_indicator?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          category: string
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          jira_card_ref: string | null
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          jira_card_ref?: string | null
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          jira_card_ref?: string | null
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_entries: {
        Row: {
          created_at: string
          documentation: string | null
          environment: string
          feature_description: string | null
          id: string
          links: string[] | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documentation?: string | null
          environment?: string
          feature_description?: string | null
          id?: string
          links?: string[] | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documentation?: string | null
          environment?: string
          feature_description?: string | null
          id?: string
          links?: string[] | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_results: {
        Row: {
          attempts: number
          created_at: string
          describe_path: string[]
          duration_ms: number | null
          error_message: string | null
          error_stack: string | null
          full_title: string
          id: string
          run_id: string
          screenshot: string | null
          source_line: number | null
          spec: string
          status: string
          title: string
          updated_at: string
          video: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          describe_path?: string[]
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          full_title: string
          id?: string
          run_id: string
          screenshot?: string | null
          source_line?: number | null
          spec: string
          status?: string
          title: string
          updated_at?: string
          video?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          describe_path?: string[]
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          full_title?: string
          id?: string
          run_id?: string
          screenshot?: string | null
          source_line?: number | null
          spec?: string
          status?: string
          title?: string
          updated_at?: string
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          actor_id: string | null
          branch: string
          commit_sha: string | null
          correlation_id: string
          created_at: string
          duration_ms: number | null
          environment: string
          failed: number | null
          failures: Json
          finished_at: string | null
          github_run_id: string | null
          id: string
          jobs: Json
          passed: number | null
          report_url: string | null
          skipped: number | null
          spec: string | null
          started_at: string | null
          status: string
          total: number | null
          triggered_by: string
          workflow_id: string | null
          workflow_name: string | null
        }
        Insert: {
          actor_id?: string | null
          branch: string
          commit_sha?: string | null
          correlation_id: string
          created_at?: string
          duration_ms?: number | null
          environment: string
          failed?: number | null
          failures?: Json
          finished_at?: string | null
          github_run_id?: string | null
          id?: string
          jobs?: Json
          passed?: number | null
          report_url?: string | null
          skipped?: number | null
          spec?: string | null
          started_at?: string | null
          status?: string
          total?: number | null
          triggered_by: string
          workflow_id?: string | null
          workflow_name?: string | null
        }
        Update: {
          actor_id?: string | null
          branch?: string
          commit_sha?: string | null
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          environment?: string
          failed?: number | null
          failures?: Json
          finished_at?: string | null
          github_run_id?: string | null
          id?: string
          jobs?: Json
          passed?: number | null
          report_url?: string | null
          skipped?: number | null
          spec?: string | null
          started_at?: string | null
          status?: string
          total?: number | null
          triggered_by?: string
          workflow_id?: string | null
          workflow_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bind_workflow_run: {
        Args: { local_id: string; run_id: string }
        Returns: undefined
      }
      cleanup_old_completed_reminders: { Args: never; Returns: undefined }
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
