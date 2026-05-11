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
      agenda_imports: {
        Row: {
          created_at: string
          date: string
          id: string
          image_path: string | null
          notes: string | null
          raw_extraction: Json
          sessions_created: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          image_path?: string | null
          notes?: string | null
          raw_extraction?: Json
          sessions_created?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          image_path?: string | null
          notes?: string | null
          raw_extraction?: Json
          sessions_created?: number
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          created_at: string
          date: string
          dismissed: boolean
          id: string
          kind: string
          payload: Json
          scope: string
        }
        Insert: {
          created_at?: string
          date?: string
          dismissed?: boolean
          id?: string
          kind: string
          payload?: Json
          scope?: string
        }
        Update: {
          created_at?: string
          date?: string
          dismissed?: boolean
          id?: string
          kind?: string
          payload?: Json
          scope?: string
        }
        Relationships: []
      }
      audience_analyses: {
        Row: {
          angle: string
          author: string | null
          comments: string
          created_at: string
          id: string
          ideas: Json
          my_perspective: string
          patterns: Json
          title: string | null
          transcript: string
          updated_at: string
        }
        Insert: {
          angle?: string
          author?: string | null
          comments?: string
          created_at?: string
          id?: string
          ideas?: Json
          my_perspective?: string
          patterns?: Json
          title?: string | null
          transcript?: string
          updated_at?: string
        }
        Update: {
          angle?: string
          author?: string | null
          comments?: string
          created_at?: string
          id?: string
          ideas?: Json
          my_perspective?: string
          patterns?: Json
          title?: string | null
          transcript?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_statement_entries: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          date: string
          description: string | null
          fitid: string | null
          id: string
          matched_transaction_id: string | null
          raw: Json
          status: string
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          date: string
          description?: string | null
          fitid?: string | null
          id?: string
          matched_transaction_id?: string | null
          raw?: Json
          status?: string
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          fitid?: string | null
          id?: string
          matched_transaction_id?: string | null
          raw?: Json
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_entries_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      book_notes: {
        Row: {
          book_id: string
          content: string
          content_idea_id: string | null
          created_at: string
          id: string
          kind: string
          page_ref: number | null
          sent_to_content: boolean
        }
        Insert: {
          book_id: string
          content: string
          content_idea_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          page_ref?: number | null
          sent_to_content?: boolean
        }
        Update: {
          book_id?: string
          content?: string
          content_idea_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          page_ref?: number | null
          sent_to_content?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "book_notes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          area_id: string | null
          author: string | null
          cover_url: string | null
          created_at: string
          current_page: number | null
          favorite_quotes: Json
          finished_at: string | null
          id: string
          pages: number | null
          pages_per_session: number | null
          plan_notes: string | null
          rating: number | null
          recommend: boolean | null
          session_minutes: number | null
          started_at: string | null
          status: string
          summary: string | null
          takeaways: string | null
          target_finish_date: string | null
          time_of_day: string | null
          title: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          area_id?: string | null
          author?: string | null
          cover_url?: string | null
          created_at?: string
          current_page?: number | null
          favorite_quotes?: Json
          finished_at?: string | null
          id?: string
          pages?: number | null
          pages_per_session?: number | null
          plan_notes?: string | null
          rating?: number | null
          recommend?: boolean | null
          session_minutes?: number | null
          started_at?: string | null
          status?: string
          summary?: string | null
          takeaways?: string | null
          target_finish_date?: string | null
          time_of_day?: string | null
          title: string
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          area_id?: string | null
          author?: string | null
          cover_url?: string | null
          created_at?: string
          current_page?: number | null
          favorite_quotes?: Json
          finished_at?: string | null
          id?: string
          pages?: number | null
          pages_per_session?: number | null
          plan_notes?: string | null
          rating?: number | null
          recommend?: boolean | null
          session_minutes?: number | null
          started_at?: string | null
          status?: string
          summary?: string | null
          takeaways?: string | null
          target_finish_date?: string | null
          time_of_day?: string | null
          title?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "books_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_dump_items: {
        Row: {
          area_id: string | null
          content: string
          converted_id: string | null
          converted_to: string | null
          created_at: string
          id: string
          processed: boolean
        }
        Insert: {
          area_id?: string | null
          content: string
          converted_id?: string | null
          converted_to?: string | null
          created_at?: string
          id?: string
          processed?: boolean
        }
        Update: {
          area_id?: string | null
          content?: string
          converted_id?: string | null
          converted_to?: string | null
          created_at?: string
          id?: string
          processed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "brain_dump_items_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
        ]
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
      challenge_logs: {
        Row: {
          challenge_id: string
          created_at: string
          date: string
          done: boolean
          id: string
          note: string | null
        }
        Insert: {
          challenge_id: string
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          note?: string | null
        }
        Update: {
          challenge_id?: string
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_logs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          area_id: string | null
          created_at: string
          daily_action: string | null
          description: string | null
          duration_days: number
          end_date: string | null
          id: string
          name: string
          reflection: string | null
          reward: string | null
          start_date: string
          status: Database["public"]["Enums"]["challenge_status"]
          time_of_day: string | null
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          daily_action?: string | null
          description?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          name: string
          reflection?: string | null
          reward?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          time_of_day?: string | null
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          area_id?: string | null
          created_at?: string
          daily_action?: string | null
          description?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          name?: string
          reflection?: string | null
          reward?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          time_of_day?: string | null
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "challenges_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_logs: {
        Row: {
          cleaning_task_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
        }
        Insert: {
          cleaning_task_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
        }
        Update: {
          cleaning_task_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_logs_cleaning_task_id_fkey"
            columns: ["cleaning_task_id"]
            isOneToOne: false
            referencedRelation: "cleaning_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_tasks: {
        Row: {
          active: boolean
          area: string | null
          area_id: string | null
          created_at: string
          frequency: string
          id: string
          last_done: string | null
          name: string
          notes: string | null
          time_of_day: string | null
          weekdays: number[]
        }
        Insert: {
          active?: boolean
          area?: string | null
          area_id?: string | null
          created_at?: string
          frequency?: string
          id?: string
          last_done?: string | null
          name: string
          notes?: string | null
          time_of_day?: string | null
          weekdays?: number[]
        }
        Update: {
          active?: boolean
          area?: string | null
          area_id?: string | null
          created_at?: string
          frequency?: string
          id?: string
          last_done?: string | null
          name?: string
          notes?: string | null
          time_of_day?: string | null
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_tasks_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      content_ideas: {
        Row: {
          archived_at: string | null
          clinical_anchor: string | null
          context: string | null
          created_at: string
          id: string
          idea_status: string
          notes: string | null
          preferred_format: string | null
          scope: Database["public"]["Enums"]["scope_type"]
          source: string | null
          suggested_format: Database["public"]["Enums"]["content_format"] | null
          theme: string | null
          title: string
          urgency: string
          used: boolean
        }
        Insert: {
          archived_at?: string | null
          clinical_anchor?: string | null
          context?: string | null
          created_at?: string
          id?: string
          idea_status?: string
          notes?: string | null
          preferred_format?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          source?: string | null
          suggested_format?:
            | Database["public"]["Enums"]["content_format"]
            | null
          theme?: string | null
          title: string
          urgency?: string
          used?: boolean
        }
        Update: {
          archived_at?: string | null
          clinical_anchor?: string | null
          context?: string | null
          created_at?: string
          id?: string
          idea_status?: string
          notes?: string | null
          preferred_format?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          source?: string | null
          suggested_format?:
            | Database["public"]["Enums"]["content_format"]
            | null
          theme?: string | null
          title?: string
          urgency?: string
          used?: boolean
        }
        Relationships: []
      }
      content_metrics: {
        Row: {
          comments: number
          created_at: string
          engagement_rate: number
          id: string
          likes: number
          measured_at: string
          notes: string | null
          piece_id: string
          reach: number
          saves: number
          shares: number
          views: number
        }
        Insert: {
          comments?: number
          created_at?: string
          engagement_rate?: number
          id?: string
          likes?: number
          measured_at?: string
          notes?: string | null
          piece_id: string
          reach?: number
          saves?: number
          shares?: number
          views?: number
        }
        Update: {
          comments?: number
          created_at?: string
          engagement_rate?: number
          id?: string
          likes?: number
          measured_at?: string
          notes?: string | null
          piece_id?: string
          reach?: number
          saves?: number
          shares?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_metrics_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pieces: {
        Row: {
          appointments_booked: number
          audience_context: string | null
          booked_appointment: boolean
          checklist: Json
          clinical_anchor: string | null
          created_at: string
          cta: string | null
          cta_type: string | null
          format: Database["public"]["Enums"]["content_format"]
          generated_dms: number
          goal_id: string | null
          hook: string | null
          id: string
          idea_id: string | null
          notes: string | null
          pipeline_stage: string
          planned_date: string | null
          platform: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          production_notes: string | null
          published_at: string | null
          saves: number
          scope: Database["public"]["Enums"]["scope_type"]
          script: string | null
          status: Database["public"]["Enums"]["content_status"]
          target_publish_at: string | null
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          appointments_booked?: number
          audience_context?: string | null
          booked_appointment?: boolean
          checklist?: Json
          clinical_anchor?: string | null
          created_at?: string
          cta?: string | null
          cta_type?: string | null
          format?: Database["public"]["Enums"]["content_format"]
          generated_dms?: number
          goal_id?: string | null
          hook?: string | null
          id?: string
          idea_id?: string | null
          notes?: string | null
          pipeline_stage?: string
          planned_date?: string | null
          platform?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          production_notes?: string | null
          published_at?: string | null
          saves?: number
          scope?: Database["public"]["Enums"]["scope_type"]
          script?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          target_publish_at?: string | null
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          appointments_booked?: number
          audience_context?: string | null
          booked_appointment?: boolean
          checklist?: Json
          clinical_anchor?: string | null
          created_at?: string
          cta?: string | null
          cta_type?: string | null
          format?: Database["public"]["Enums"]["content_format"]
          generated_dms?: number
          goal_id?: string | null
          hook?: string | null
          id?: string
          idea_id?: string | null
          notes?: string | null
          pipeline_stage?: string
          planned_date?: string | null
          platform?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          production_notes?: string | null
          published_at?: string | null
          saves?: number
          scope?: Database["public"]["Enums"]["scope_type"]
          script?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          target_publish_at?: string | null
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_pieces_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_pieces_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "content_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      content_project_stages: {
        Row: {
          ai_reasoning: string | null
          created_at: string
          id: string
          input: Json
          output: Json
          project_id: string
          stage: number
          status: string
          updated_at: string
          user_decisions: Json
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string
          id?: string
          input?: Json
          output?: Json
          project_id: string
          stage: number
          status?: string
          updated_at?: string
          user_decisions?: Json
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string
          id?: string
          input?: Json
          output?: Json
          project_id?: string
          stage?: number
          status?: string
          updated_at?: string
          user_decisions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "content_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_project_versions: {
        Row: {
          created_at: string
          diff_from_previous: Json | null
          id: string
          label: string | null
          payload: Json
          project_id: string
          stage: number
        }
        Insert: {
          created_at?: string
          diff_from_previous?: Json | null
          id?: string
          label?: string | null
          payload?: Json
          project_id: string
          stage: number
        }
        Update: {
          created_at?: string
          diff_from_previous?: Json | null
          id?: string
          label?: string | null
          payload?: Json
          project_id?: string
          stage?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "content_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_projects: {
        Row: {
          context: Json
          created_at: string
          current_stage: number
          id: string
          intent: string | null
          linked_piece_id: string | null
          scope: string
          source_idea_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          context?: Json
          created_at?: string
          current_stage?: number
          id?: string
          intent?: string | null
          linked_piece_id?: string | null
          scope?: string
          source_idea_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          context?: Json
          created_at?: string
          current_stage?: number
          id?: string
          intent?: string | null
          linked_piece_id?: string | null
          scope?: string
          source_idea_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_references: {
        Row: {
          adapted_format: Database["public"]["Enums"]["content_format"] | null
          adapted_hook: string | null
          adapted_outline: string | null
          adapted_title: string | null
          analysis: Json
          created_at: string
          id: string
          piece_id: string | null
          scope: Database["public"]["Enums"]["scope_type"]
          source_author: string | null
          source_text: string | null
          source_url: string | null
          used: boolean
        }
        Insert: {
          adapted_format?: Database["public"]["Enums"]["content_format"] | null
          adapted_hook?: string | null
          adapted_outline?: string | null
          adapted_title?: string | null
          analysis?: Json
          created_at?: string
          id?: string
          piece_id?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          source_author?: string | null
          source_text?: string | null
          source_url?: string | null
          used?: boolean
        }
        Update: {
          adapted_format?: Database["public"]["Enums"]["content_format"] | null
          adapted_hook?: string | null
          adapted_outline?: string | null
          adapted_title?: string | null
          analysis?: Json
          created_at?: string
          id?: string
          piece_id?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          source_author?: string | null
          source_text?: string | null
          source_url?: string | null
          used?: boolean
        }
        Relationships: []
      }
      content_stories: {
        Row: {
          created_at: string
          date: string
          description: string | null
          done: boolean
          done_at: string | null
          id: string
          notes: string | null
          scope: Database["public"]["Enums"]["scope_type"]
          slot: Database["public"]["Enums"]["story_slot"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: string
          notes?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          slot?: Database["public"]["Enums"]["story_slot"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: string
          notes?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          slot?: Database["public"]["Enums"]["story_slot"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_story_sequences: {
        Row: {
          created_at: string
          id: string
          objective: string
          piece_id: string | null
          scheduled_date: string | null
          stories: Json
          theme: string | null
          tone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          objective?: string
          piece_id?: string | null
          scheduled_date?: string | null
          stories?: Json
          theme?: string | null
          tone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          objective?: string
          piece_id?: string | null
          scheduled_date?: string | null
          stories?: Json
          theme?: string | null
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_story_sequences_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_strategy: {
        Row: {
          created_at: string
          forbidden_topics: string | null
          goals: string | null
          icp: string | null
          id: string
          niche: string | null
          notes: string | null
          offer: string | null
          pillars: Json
          posting_cadence: string | null
          reference_brands: string | null
          scope: Database["public"]["Enums"]["scope_type"]
          signature_format: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          forbidden_topics?: string | null
          goals?: string | null
          icp?: string | null
          id?: string
          niche?: string | null
          notes?: string | null
          offer?: string | null
          pillars?: Json
          posting_cadence?: string | null
          reference_brands?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          signature_format?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          forbidden_topics?: string | null
          goals?: string | null
          icp?: string | null
          id?: string
          niche?: string | null
          notes?: string | null
          offer?: string | null
          pillars?: Json
          posting_cadence?: string | null
          reference_brands?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          signature_format?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string
          date: string
          day_rating: number | null
          energy: Database["public"]["Enums"]["mood_level"]
          for_tomorrow: string | null
          id: string
          mood: Database["public"]["Enums"]["mood_level"]
          noticed: string | null
          sleep_hours: number | null
          stress: Database["public"]["Enums"]["mood_level"]
          what_struggled: Json
          what_went_well: Json
        }
        Insert: {
          created_at?: string
          date?: string
          day_rating?: number | null
          energy?: Database["public"]["Enums"]["mood_level"]
          for_tomorrow?: string | null
          id?: string
          mood?: Database["public"]["Enums"]["mood_level"]
          noticed?: string | null
          sleep_hours?: number | null
          stress?: Database["public"]["Enums"]["mood_level"]
          what_struggled?: Json
          what_went_well?: Json
        }
        Update: {
          created_at?: string
          date?: string
          day_rating?: number | null
          energy?: Database["public"]["Enums"]["mood_level"]
          for_tomorrow?: string | null
          id?: string
          mood?: Database["public"]["Enums"]["mood_level"]
          noticed?: string | null
          sleep_hours?: number | null
          stress?: Database["public"]["Enums"]["mood_level"]
          what_struggled?: Json
          what_went_well?: Json
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
      dreamboard_items: {
        Row: {
          achieved: boolean
          achieved_at: string | null
          area_id: string | null
          category: string | null
          created_at: string
          description: string | null
          goal_id: string | null
          id: string
          image_url: string | null
          position: number
          title: string
        }
        Insert: {
          achieved?: boolean
          achieved_at?: string | null
          area_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string | null
          id?: string
          image_url?: string | null
          position?: number
          title: string
        }
        Update: {
          achieved?: boolean
          achieved_at?: string | null
          area_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string | null
          id?: string
          image_url?: string | null
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dreamboard_items_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dreamboard_items_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_lines: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          plan: Json
          scope: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          plan?: Json
          scope?: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          plan?: Json
          scope?: string
          updated_at?: string
          week_start?: string
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
      focus_pins: {
        Row: {
          icon: string | null
          id: string
          link: string | null
          pinned_at: string
          position: number
          source_id: string
          source_table: string
          subtitle: string | null
          title: string
        }
        Insert: {
          icon?: string | null
          id?: string
          link?: string | null
          pinned_at?: string
          position?: number
          source_id: string
          source_table: string
          subtitle?: string | null
          title: string
        }
        Update: {
          icon?: string | null
          id?: string
          link?: string | null
          pinned_at?: string
          position?: number
          source_id?: string
          source_table?: string
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          actual_minutes: number | null
          completed: boolean
          created_at: string
          ended_at: string | null
          id: string
          interruptions: number
          kind: string
          notes: string | null
          planned_minutes: number
          project_id: string | null
          started_at: string
          task_id: string | null
        }
        Insert: {
          actual_minutes?: number | null
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          interruptions?: number
          kind?: string
          notes?: string | null
          planned_minutes?: number
          project_id?: string | null
          started_at?: string
          task_id?: string | null
        }
        Update: {
          actual_minutes?: number | null
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          interruptions?: number
          kind?: string
          notes?: string | null
          planned_minutes?: number
          project_id?: string | null
          started_at?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
          area_id: string | null
          created_at: string
          current_value: number | null
          deadline: string | null
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["goal_kind"]
          locked: boolean
          name: string
          scope: Database["public"]["Enums"]["scope_type"]
          status: Database["public"]["Enums"]["goal_status"]
          target_tasks: number | null
          target_value: number | null
          weight_financial: number | null
          weight_tasks: number | null
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["goal_kind"]
          locked?: boolean
          name: string
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["goal_status"]
          target_tasks?: number | null
          target_value?: number | null
          weight_financial?: number | null
          weight_tasks?: number | null
        }
        Update: {
          area_id?: string | null
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["goal_kind"]
          locked?: boolean
          name?: string
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["goal_status"]
          target_tasks?: number | null
          target_value?: number | null
          weight_financial?: number | null
          weight_tasks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      gratitude_entries: {
        Row: {
          created_at: string
          date: string
          id: string
          items: Json
          reflection: string | null
          tiny_joys: Json
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          items?: Json
          reflection?: string | null
          tiny_joys?: Json
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          items?: Json
          reflection?: string | null
          tiny_joys?: Json
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
          area_id: string | null
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
          time_of_day: string | null
          unit: string | null
          weekdays: number[]
        }
        Insert: {
          active?: boolean
          archived?: boolean
          area_id?: string | null
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
          time_of_day?: string | null
          unit?: string | null
          weekdays?: number[]
        }
        Update: {
          active?: boolean
          archived?: boolean
          area_id?: string | null
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
          time_of_day?: string | null
          unit?: string | null
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "habits_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_refinement_chats: {
        Row: {
          analysis_id: string | null
          context: Json
          created_at: string
          id: string
          idea_index: number | null
          idea_title: string | null
          messages: Json
          refined_idea: Json | null
          updated_at: string
        }
        Insert: {
          analysis_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          idea_index?: number | null
          idea_title?: string | null
          messages?: Json
          refined_idea?: Json | null
          updated_at?: string
        }
        Update: {
          analysis_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          idea_index?: number | null
          idea_title?: string | null
          messages?: Json
          refined_idea?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_refinement_chats_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "audience_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_snapshots: {
        Row: {
          appointments_booked: number
          created_at: string
          dms_received: number
          followers: number
          followers_gained: number
          followers_lost: number
          id: string
          impressions: number
          notes: string | null
          profile_visits: number
          reach: number
          scope: Database["public"]["Enums"]["scope_type"]
          updated_at: string
          website_clicks: number
          week_start: string
        }
        Insert: {
          appointments_booked?: number
          created_at?: string
          dms_received?: number
          followers?: number
          followers_gained?: number
          followers_lost?: number
          id?: string
          impressions?: number
          notes?: string | null
          profile_visits?: number
          reach?: number
          scope?: Database["public"]["Enums"]["scope_type"]
          updated_at?: string
          website_clicks?: number
          week_start: string
        }
        Update: {
          appointments_booked?: number
          created_at?: string
          dms_received?: number
          followers?: number
          followers_gained?: number
          followers_lost?: number
          id?: string
          impressions?: number
          notes?: string | null
          profile_visits?: number
          reach?: number
          scope?: Database["public"]["Enums"]["scope_type"]
          updated_at?: string
          website_clicks?: number
          week_start?: string
        }
        Relationships: []
      }
      life_areas: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          kind: Database["public"]["Enums"]["life_area_kind"]
          name: string
          position: number
          target_weight: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          kind: Database["public"]["Enums"]["life_area_kind"]
          name: string
          position?: number
          target_weight?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["life_area_kind"]
          name?: string
          position?: number
          target_weight?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          breakfast: string | null
          created_at: string
          date: string
          dinner: string | null
          id: string
          lunch: string | null
          notes: string | null
          shopping_list: Json
          snack: string | null
          updated_at: string
        }
        Insert: {
          breakfast?: string | null
          created_at?: string
          date: string
          dinner?: string | null
          id?: string
          lunch?: string | null
          notes?: string | null
          shopping_list?: Json
          snack?: string | null
          updated_at?: string
        }
        Update: {
          breakfast?: string | null
          created_at?: string
          date?: string
          dinner?: string | null
          id?: string
          lunch?: string | null
          notes?: string | null
          shopping_list?: Json
          snack?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          created_at: string
          deadline: string | null
          done: boolean
          goal_id: string
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          done?: boolean
          goal_id: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          deadline?: string | null
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
      patients: {
        Row: {
          birth_date: string | null
          created_at: string
          default_duration_minutes: number | null
          default_session_price: number | null
          email: string | null
          external_ref: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          tags: Json
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          default_duration_minutes?: number | null
          default_session_price?: number | null
          email?: string | null
          external_ref?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: Json
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          default_duration_minutes?: number | null
          default_session_price?: number | null
          email?: string | null
          external_ref?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: Json
          updated_at?: string
        }
        Relationships: []
      }
      performance_adjustments: {
        Row: {
          area: string
          created_at: string
          decided_at: string | null
          goal_id: string | null
          id: string
          kind: string
          payload: Json
          rationale: string
          scope: string
          status: string
        }
        Insert: {
          area: string
          created_at?: string
          decided_at?: string | null
          goal_id?: string | null
          id?: string
          kind: string
          payload?: Json
          rationale: string
          scope?: string
          status?: string
        }
        Update: {
          area?: string
          created_at?: string
          decided_at?: string | null
          goal_id?: string | null
          id?: string
          kind?: string
          payload?: Json
          rationale?: string
          scope?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_adjustments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_profiles: {
        Row: {
          abandonment_rate: number
          avg_tasks_per_day: number
          consistency_score: number
          created_at: string
          execution_rate: number
          id: string
          insights: Json
          narrative: string | null
          overload_score: number
          productive_days: number
          profile: string
          recommended_load: number
          scope: string
          unproductive_days: number
          week_start: string
          window_days: number
        }
        Insert: {
          abandonment_rate?: number
          avg_tasks_per_day?: number
          consistency_score?: number
          created_at?: string
          execution_rate?: number
          id?: string
          insights?: Json
          narrative?: string | null
          overload_score?: number
          productive_days?: number
          profile: string
          recommended_load?: number
          scope?: string
          unproductive_days?: number
          week_start: string
          window_days?: number
        }
        Update: {
          abandonment_rate?: number
          avg_tasks_per_day?: number
          consistency_score?: number
          created_at?: string
          execution_rate?: number
          id?: string
          insights?: Json
          narrative?: string | null
          overload_score?: number
          productive_days?: number
          profile?: string
          recommended_load?: number
          scope?: string
          unproductive_days?: number
          week_start?: string
          window_days?: number
        }
        Relationships: []
      }
      project_okrs: {
        Row: {
          created_at: string
          id: string
          key_results: Json
          objective: string
          position: number
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_results?: Json
          objective: string
          position?: number
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_results?: Json
          objective?: string
          position?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_okrs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          area_id: string | null
          budget: number | null
          created_at: string
          deadline: string | null
          description: string | null
          end_date: string | null
          goal_id: string | null
          id: string
          kpis: Json
          milestones_text: string | null
          name: string
          next_step: string | null
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          progress: number
          resources: Json
          risks: Json
          scope: Database["public"]["Enums"]["scope_type"]
          stakeholders: Json
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          success_criteria: string | null
          updated_at: string
          vision: string | null
        }
        Insert: {
          area_id?: string | null
          budget?: number | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          end_date?: string | null
          goal_id?: string | null
          id?: string
          kpis?: Json
          milestones_text?: string | null
          name: string
          next_step?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          resources?: Json
          risks?: Json
          scope?: Database["public"]["Enums"]["scope_type"]
          stakeholders?: Json
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          success_criteria?: string | null
          updated_at?: string
          vision?: string | null
        }
        Update: {
          area_id?: string | null
          budget?: number | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          end_date?: string | null
          goal_id?: string | null
          id?: string
          kpis?: Json
          milestones_text?: string | null
          name?: string
          next_step?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          resources?: Json
          risks?: Json
          scope?: Database["public"]["Enums"]["scope_type"]
          stakeholders?: Json
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          success_criteria?: string | null
          updated_at?: string
          vision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_goal_id_fkey"
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
      session_analyses: {
        Row: {
          created_at: string
          depth: string
          id: string
          kind: string
          patient_id: string
          result: Json
          session_ids: Json
          title: string | null
          transcript: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          depth?: string
          id?: string
          kind?: string
          patient_id: string
          result?: Json
          session_ids?: Json
          title?: string | null
          transcript: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          depth?: string
          id?: string
          kind?: string
          patient_id?: string
          result?: Json
          session_ids?: Json
          title?: string | null
          transcript?: string
          updated_at?: string
        }
        Relationships: []
      }
      strategic_scripts: {
        Row: {
          approved: boolean
          conflict: string | null
          created_at: string
          cta: string | null
          decision: Json
          format: string | null
          hook: string | null
          id: string
          insight: string | null
          intent: string | null
          raw: Json
          saved_as_idea_id: string | null
          scope: string
          score: number
          script: string | null
          theme: string | null
          trigger: string | null
          updated_at: string
        }
        Insert: {
          approved?: boolean
          conflict?: string | null
          created_at?: string
          cta?: string | null
          decision?: Json
          format?: string | null
          hook?: string | null
          id?: string
          insight?: string | null
          intent?: string | null
          raw?: Json
          saved_as_idea_id?: string | null
          scope?: string
          score?: number
          script?: string | null
          theme?: string | null
          trigger?: string | null
          updated_at?: string
        }
        Update: {
          approved?: boolean
          conflict?: string | null
          created_at?: string
          cta?: string | null
          decision?: Json
          format?: string | null
          hook?: string | null
          id?: string
          insight?: string | null
          intent?: string | null
          raw?: Json
          saved_as_idea_id?: string | null
          scope?: string
          score?: number
          script?: string | null
          theme?: string | null
          trigger?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          area_id: string | null
          category_id: string | null
          completed_at: string | null
          content_piece_id: string | null
          created_at: string
          due_date: string | null
          eisenhower: Database["public"]["Enums"]["eisenhower_quadrant"] | null
          energy: Database["public"]["Enums"]["energy_level"] | null
          execution_minutes: number | null
          goal_id: string | null
          id: string
          is_135: string | null
          kanban_column: Database["public"]["Enums"]["kanban_column"]
          milestone_id: string | null
          notes: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          recurrence_source_id: string | null
          recurrence_source_table: string | null
          scope: Database["public"]["Enums"]["scope_type"]
          status: Database["public"]["Enums"]["task_status"]
          therapy_session_id: string | null
          title: string
        }
        Insert: {
          area_id?: string | null
          category_id?: string | null
          completed_at?: string | null
          content_piece_id?: string | null
          created_at?: string
          due_date?: string | null
          eisenhower?: Database["public"]["Enums"]["eisenhower_quadrant"] | null
          energy?: Database["public"]["Enums"]["energy_level"] | null
          execution_minutes?: number | null
          goal_id?: string | null
          id?: string
          is_135?: string | null
          kanban_column?: Database["public"]["Enums"]["kanban_column"]
          milestone_id?: string | null
          notes?: string | null
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence_source_id?: string | null
          recurrence_source_table?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["task_status"]
          therapy_session_id?: string | null
          title: string
        }
        Update: {
          area_id?: string | null
          category_id?: string | null
          completed_at?: string | null
          content_piece_id?: string | null
          created_at?: string
          due_date?: string | null
          eisenhower?: Database["public"]["Enums"]["eisenhower_quadrant"] | null
          energy?: Database["public"]["Enums"]["energy_level"] | null
          execution_minutes?: number | null
          goal_id?: string | null
          id?: string
          is_135?: string | null
          kanban_column?: Database["public"]["Enums"]["kanban_column"]
          milestone_id?: string | null
          notes?: string | null
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence_source_id?: string | null
          recurrence_source_table?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["task_status"]
          therapy_session_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_content_piece_id_fkey"
            columns: ["content_piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_therapy_session_id_fkey"
            columns: ["therapy_session_id"]
            isOneToOne: false
            referencedRelation: "therapy_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      therapy_sessions: {
        Row: {
          account_id: string | null
          chart_updated: boolean
          chart_updated_at: string | null
          created_at: string
          date: string
          duration_minutes: number | null
          id: string
          internal_notes: string | null
          modality: string | null
          paid_at: string | null
          patient_id: string
          payment_method: string | null
          payment_status: string
          price: number | null
          start_time: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          chart_updated?: boolean
          chart_updated_at?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          internal_notes?: string | null
          modality?: string | null
          paid_at?: string | null
          patient_id: string
          payment_method?: string | null
          payment_status?: string
          price?: number | null
          start_time?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          chart_updated?: boolean
          chart_updated_at?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          internal_notes?: string | null
          modality?: string | null
          paid_at?: string | null
          patient_id?: string
          payment_method?: string | null
          payment_status?: string
          price?: number | null
          start_time?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapy_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapy_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapy_sessions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          area_id: string | null
          bank_ref: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          external_ref: string | null
          goal_id: string | null
          id: string
          nature: Database["public"]["Enums"]["txn_nature"]
          reconciled: boolean
          reconciled_at: string | null
          scope: Database["public"]["Enums"]["scope_type"]
          status: Database["public"]["Enums"]["txn_status"]
          to_account_id: string | null
          type: Database["public"]["Enums"]["txn_type"]
        }
        Insert: {
          account_id: string
          amount: number
          area_id?: string | null
          bank_ref?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          external_ref?: string | null
          goal_id?: string | null
          id?: string
          nature?: Database["public"]["Enums"]["txn_nature"]
          reconciled?: boolean
          reconciled_at?: string | null
          scope?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["txn_status"]
          to_account_id?: string | null
          type: Database["public"]["Enums"]["txn_type"]
        }
        Update: {
          account_id?: string
          amount?: number
          area_id?: string | null
          bank_ref?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          external_ref?: string | null
          goal_id?: string | null
          id?: string
          nature?: Database["public"]["Enums"]["txn_nature"]
          reconciled?: boolean
          reconciled_at?: string | null
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
            foreignKeyName: "transactions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
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
      wishlist_items: {
        Row: {
          acquired: boolean
          acquired_at: string | null
          area_id: string | null
          category: string | null
          created_at: string
          estimated_price: number | null
          id: string
          name: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          url: string | null
        }
        Insert: {
          acquired?: boolean
          acquired_at?: string | null
          area_id?: string | null
          category?: string | null
          created_at?: string
          estimated_price?: number | null
          id?: string
          name: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          url?: string | null
        }
        Update: {
          acquired?: boolean
          acquired_at?: string | null
          area_id?: string | null
          category?: string | null
          created_at?: string
          estimated_price?: number | null
          id?: string
          name?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
        ]
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
      challenge_status: "ativo" | "concluido" | "abandonado"
      content_format:
        | "reels"
        | "carrossel"
        | "texto"
        | "stories"
        | "video"
        | "podcast"
        | "newsletter"
      content_status:
        | "ideia"
        | "em_producao"
        | "pronto"
        | "publicado"
        | "arquivado"
      eisenhower_quadrant:
        | "urgente_importante"
        | "importante_nao_urgente"
        | "urgente_nao_importante"
        | "nao_urgente_nao_importante"
      energy_level: "leve" | "media" | "pesada"
      goal_kind: "tarefas" | "financeiro" | "marcos" | "hibrida" | "conteudo"
      goal_status: "ativa" | "concluida" | "pausada"
      habit_frequency: "diaria" | "semanal"
      kanban_column: "todo" | "in_progress" | "review" | "done"
      life_area_kind:
        | "carreira"
        | "financas"
        | "saude"
        | "relacionamentos"
        | "familia"
        | "desenvolvimento"
        | "espiritualidade"
        | "lazer"
        | "contribuicao"
        | "ambiente"
      mood_level: "muito_baixo" | "baixo" | "neutro" | "alto" | "muito_alto"
      project_status:
        | "planejado"
        | "em_andamento"
        | "em_revisao"
        | "concluido"
        | "pausado"
        | "arquivado"
      recurrence_freq: "diaria" | "semanal" | "mensal" | "anual"
      scope_type: "pessoal" | "profissional"
      story_slot:
        | "bastidores"
        | "rotina"
        | "pergunta"
        | "interacao"
        | "reflexao"
        | "dica"
        | "divulgacao"
        | "outro"
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
      challenge_status: ["ativo", "concluido", "abandonado"],
      content_format: [
        "reels",
        "carrossel",
        "texto",
        "stories",
        "video",
        "podcast",
        "newsletter",
      ],
      content_status: [
        "ideia",
        "em_producao",
        "pronto",
        "publicado",
        "arquivado",
      ],
      eisenhower_quadrant: [
        "urgente_importante",
        "importante_nao_urgente",
        "urgente_nao_importante",
        "nao_urgente_nao_importante",
      ],
      energy_level: ["leve", "media", "pesada"],
      goal_kind: ["tarefas", "financeiro", "marcos", "hibrida", "conteudo"],
      goal_status: ["ativa", "concluida", "pausada"],
      habit_frequency: ["diaria", "semanal"],
      kanban_column: ["todo", "in_progress", "review", "done"],
      life_area_kind: [
        "carreira",
        "financas",
        "saude",
        "relacionamentos",
        "familia",
        "desenvolvimento",
        "espiritualidade",
        "lazer",
        "contribuicao",
        "ambiente",
      ],
      mood_level: ["muito_baixo", "baixo", "neutro", "alto", "muito_alto"],
      project_status: [
        "planejado",
        "em_andamento",
        "em_revisao",
        "concluido",
        "pausado",
        "arquivado",
      ],
      recurrence_freq: ["diaria", "semanal", "mensal", "anual"],
      scope_type: ["pessoal", "profissional"],
      story_slot: [
        "bastidores",
        "rotina",
        "pergunta",
        "interacao",
        "reflexao",
        "dica",
        "divulgacao",
        "outro",
      ],
      task_priority: ["alta", "media", "baixa"],
      task_status: ["pendente", "em_andamento", "concluida"],
      txn_nature: ["fixo", "variavel"],
      txn_status: ["pago", "pendente", "futuro"],
      txn_type: ["entrada", "saida", "transferencia"],
    },
  },
} as const
