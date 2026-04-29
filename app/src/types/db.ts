export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_screenings: {
        Row: {
          candidate_id: string;
          cost_usd: number | null;
          created_at: string;
          criteria: Json;
          duration_ms: number | null;
          error: string | null;
          id: string;
          model: string;
          pass1_raw: Json | null;
          pass2_raw: Json | null;
          prompt_hash: string | null;
          tokens_in: number | null;
          tokens_out: number | null;
          total: number;
          weights_snapshot: Json;
        };
        Insert: {
          candidate_id: string;
          cost_usd?: number | null;
          created_at?: string;
          criteria: Json;
          duration_ms?: number | null;
          error?: string | null;
          id?: string;
          model: string;
          pass1_raw?: Json | null;
          pass2_raw?: Json | null;
          prompt_hash?: string | null;
          tokens_in?: number | null;
          tokens_out?: number | null;
          total: number;
          weights_snapshot: Json;
        };
        Update: {
          candidate_id?: string;
          cost_usd?: number | null;
          created_at?: string;
          criteria?: Json;
          duration_ms?: number | null;
          error?: string | null;
          id?: string;
          model?: string;
          pass1_raw?: Json | null;
          pass2_raw?: Json | null;
          prompt_hash?: string | null;
          tokens_in?: number | null;
          tokens_out?: number | null;
          total?: number;
          weights_snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "ai_screenings_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
        ];
      };
      approvals: {
        Row: {
          actor_user_id: string | null;
          candidate_id: string;
          created_at: string;
          decided_at: string | null;
          id: string;
          notes: string | null;
          status: Database["public"]["Enums"]["approval_status"];
          step_index: number;
          step_kind: Database["public"]["Enums"]["approval_step_kind"];
          updated_at: string;
        };
        Insert: {
          actor_user_id?: string | null;
          candidate_id: string;
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["approval_status"];
          step_index: number;
          step_kind: Database["public"]["Enums"]["approval_step_kind"];
          updated_at?: string;
        };
        Update: {
          actor_user_id?: string | null;
          candidate_id?: string;
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["approval_status"];
          step_index?: number;
          step_kind?: Database["public"]["Enums"]["approval_step_kind"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approvals_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approvals_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_invite_tokens: {
        Row: {
          assessment_id: string;
          candidate_id: string;
          created_at: string;
          expires_at: string;
          submission_id: string | null;
          token: string;
          used_at: string | null;
        };
        Insert: {
          assessment_id: string;
          candidate_id: string;
          created_at?: string;
          expires_at: string;
          submission_id?: string | null;
          token: string;
          used_at?: string | null;
        };
        Update: {
          assessment_id?: string;
          candidate_id?: string;
          created_at?: string;
          expires_at?: string;
          submission_id?: string | null;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_invite_tokens_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_invite_tokens_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_invite_tokens_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "assessment_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_submissions: {
        Row: {
          assessment_id: string;
          candidate_id: string;
          created_at: string;
          email_message_id: string | null;
          graded_at: string | null;
          graded_by: string | null;
          id: string;
          notes: string | null;
          score: number | null;
          submission_storage_path: string | null;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          assessment_id: string;
          candidate_id: string;
          created_at?: string;
          email_message_id?: string | null;
          graded_at?: string | null;
          graded_by?: string | null;
          id?: string;
          notes?: string | null;
          score?: number | null;
          submission_storage_path?: string | null;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string;
          candidate_id?: string;
          created_at?: string;
          email_message_id?: string | null;
          graded_at?: string | null;
          graded_by?: string | null;
          id?: string;
          notes?: string | null;
          score?: number | null;
          submission_storage_path?: string | null;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_submissions_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_submissions_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_submissions_graded_by_fkey";
            columns: ["graded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subs_email_message_fk";
            columns: ["email_message_id"];
            isOneToOne: false;
            referencedRelation: "email_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          instructions: string | null;
          is_active: boolean;
          job_id: string;
          original_name: string | null;
          test_storage_path: string | null;
          time_limit_min: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          job_id: string;
          original_name?: string | null;
          test_storage_path?: string | null;
          time_limit_min?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          job_id?: string;
          original_name?: string | null;
          test_storage_path?: string | null;
          time_limit_min?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_user_id: string | null;
          after: Json | null;
          at: string;
          before: Json | null;
          entity: string;
          entity_id: string | null;
          id: string;
          meta: Json | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: string;
          meta?: Json | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          meta?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      candidates: {
        Row: {
          ai_breakdown: Json | null;
          ai_score: number | null;
          ai_scored_at: string | null;
          ai_screening_error: string | null;
          ai_screening_status: Database["public"]["Enums"]["ai_screening_status"];
          created_at: string;
          created_by: string | null;
          current_stage: Database["public"]["Enums"]["pipeline_stage"];
          cv_file_id: string | null;
          cv_text: string | null;
          dob: string | null;
          email: string | null;
          full_name: string;
          gender: string | null;
          id: string;
          is_archived: boolean;
          job_id: string;
          location: string | null;
          notes: string | null;
          parsed: Json | null;
          phone: string | null;
          referrer_user_id: string | null;
          source: Database["public"]["Enums"]["candidate_source"];
          source_meta: Json;
          updated_at: string;
        };
        Insert: {
          ai_breakdown?: Json | null;
          ai_score?: number | null;
          ai_scored_at?: string | null;
          ai_screening_error?: string | null;
          ai_screening_status?: Database["public"]["Enums"]["ai_screening_status"];
          created_at?: string;
          created_by?: string | null;
          current_stage?: Database["public"]["Enums"]["pipeline_stage"];
          cv_file_id?: string | null;
          cv_text?: string | null;
          dob?: string | null;
          email?: string | null;
          full_name: string;
          gender?: string | null;
          id?: string;
          is_archived?: boolean;
          job_id: string;
          location?: string | null;
          notes?: string | null;
          parsed?: Json | null;
          phone?: string | null;
          referrer_user_id?: string | null;
          source?: Database["public"]["Enums"]["candidate_source"];
          source_meta?: Json;
          updated_at?: string;
        };
        Update: {
          ai_breakdown?: Json | null;
          ai_score?: number | null;
          ai_scored_at?: string | null;
          ai_screening_error?: string | null;
          ai_screening_status?: Database["public"]["Enums"]["ai_screening_status"];
          created_at?: string;
          created_by?: string | null;
          current_stage?: Database["public"]["Enums"]["pipeline_stage"];
          cv_file_id?: string | null;
          cv_text?: string | null;
          dob?: string | null;
          email?: string | null;
          full_name?: string;
          gender?: string | null;
          id?: string;
          is_archived?: boolean;
          job_id?: string;
          location?: string | null;
          notes?: string | null;
          parsed?: Json | null;
          phone?: string | null;
          referrer_user_id?: string | null;
          source?: Database["public"]["Enums"]["candidate_source"];
          source_meta?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidates_cv_file_id_fkey";
            columns: ["cv_file_id"];
            isOneToOne: false;
            referencedRelation: "cv_files";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidates_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidates_referrer_user_id_fkey";
            columns: ["referrer_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cv_files: {
        Row: {
          created_at: string;
          id: string;
          mime: string;
          original_name: string;
          pdf_storage_path: string | null;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mime: string;
          original_name: string;
          pdf_storage_path?: string | null;
          size_bytes: number;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          mime?: string;
          original_name?: string;
          pdf_storage_path?: string | null;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cv_files_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          code: string | null;
          created_at: string;
          head_user_id: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          head_user_id?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          head_user_id?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_head_fk";
            columns: ["head_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      email_messages: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          body_html: string | null;
          body_text: string | null;
          candidate_id: string | null;
          cc_emails: string[];
          conversation_id: string | null;
          created_at: string;
          created_by: string | null;
          direction: Database["public"]["Enums"]["email_direction"];
          error: string | null;
          from_email: string | null;
          graph_message_id: string | null;
          id: string;
          in_reply_to: string | null;
          interview_id: string | null;
          job_id: string | null;
          received_at: string | null;
          scheduled_send_at: string | null;
          sent_at: string | null;
          status: Database["public"]["Enums"]["email_status"];
          subject: string;
          template_code: string | null;
          to_emails: string[];
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          body_html?: string | null;
          body_text?: string | null;
          candidate_id?: string | null;
          cc_emails?: string[];
          conversation_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          direction: Database["public"]["Enums"]["email_direction"];
          error?: string | null;
          from_email?: string | null;
          graph_message_id?: string | null;
          id?: string;
          in_reply_to?: string | null;
          interview_id?: string | null;
          job_id?: string | null;
          received_at?: string | null;
          scheduled_send_at?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_status"];
          subject: string;
          template_code?: string | null;
          to_emails?: string[];
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          body_html?: string | null;
          body_text?: string | null;
          candidate_id?: string | null;
          cc_emails?: string[];
          conversation_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          direction?: Database["public"]["Enums"]["email_direction"];
          error?: string | null;
          from_email?: string | null;
          graph_message_id?: string | null;
          id?: string;
          in_reply_to?: string | null;
          interview_id?: string | null;
          job_id?: string | null;
          received_at?: string | null;
          scheduled_send_at?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_status"];
          subject?: string;
          template_code?: string | null;
          to_emails?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_messages_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_messages_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_messages_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_messages_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_messages_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_messages_template_code_fkey";
            columns: ["template_code"];
            isOneToOne: false;
            referencedRelation: "email_templates";
            referencedColumns: ["code"];
          },
        ];
      };
      email_templates: {
        Row: {
          body_html: string;
          body_md: string | null;
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name_vi: string;
          requires_approval: boolean;
          subject_vi: string;
          updated_at: string;
          variables: Json;
        };
        Insert: {
          body_html: string;
          body_md?: string | null;
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name_vi: string;
          requires_approval?: boolean;
          subject_vi: string;
          updated_at?: string;
          variables?: Json;
        };
        Update: {
          body_html?: string;
          body_md?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name_vi?: string;
          requires_approval?: boolean;
          subject_vi?: string;
          updated_at?: string;
          variables?: Json;
        };
        Relationships: [];
      };
      inbox_attachments: {
        Row: {
          created_at: string;
          cv_file_id: string | null;
          email_message_id: string;
          id: string;
          is_cv: boolean;
          mime: string | null;
          original_name: string | null;
          size_bytes: number | null;
          storage_path: string | null;
        };
        Insert: {
          created_at?: string;
          cv_file_id?: string | null;
          email_message_id: string;
          id?: string;
          is_cv?: boolean;
          mime?: string | null;
          original_name?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
        };
        Update: {
          created_at?: string;
          cv_file_id?: string | null;
          email_message_id?: string;
          id?: string;
          is_cv?: boolean;
          mime?: string | null;
          original_name?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inbox_attachments_cv_file_id_fkey";
            columns: ["cv_file_id"];
            isOneToOne: false;
            referencedRelation: "cv_files";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbox_attachments_email_message_id_fkey";
            columns: ["email_message_id"];
            isOneToOne: false;
            referencedRelation: "email_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_attendees: {
        Row: {
          created_at: string;
          id: string;
          interview_id: string;
          role: Database["public"]["Enums"]["interviewer_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          interview_id: string;
          role?: Database["public"]["Enums"]["interviewer_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          interview_id?: string;
          role?: Database["public"]["Enums"]["interviewer_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_attendees_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_attendees_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_evaluations: {
        Row: {
          concerns: string | null;
          created_at: string;
          evaluator_user_id: string;
          id: string;
          internal_notes: string | null;
          interview_id: string;
          proposed_salary: number | null;
          recommendation: Database["public"]["Enums"]["recommendation"] | null;
          scores: Json;
          strengths: string | null;
          updated_at: string;
        };
        Insert: {
          concerns?: string | null;
          created_at?: string;
          evaluator_user_id: string;
          id?: string;
          internal_notes?: string | null;
          interview_id: string;
          proposed_salary?: number | null;
          recommendation?: Database["public"]["Enums"]["recommendation"] | null;
          scores: Json;
          strengths?: string | null;
          updated_at?: string;
        };
        Update: {
          concerns?: string | null;
          created_at?: string;
          evaluator_user_id?: string;
          id?: string;
          internal_notes?: string | null;
          interview_id?: string;
          proposed_salary?: number | null;
          recommendation?: Database["public"]["Enums"]["recommendation"] | null;
          scores?: Json;
          strengths?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_evaluations_evaluator_user_id_fkey";
            columns: ["evaluator_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_evaluations_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
      interviews: {
        Row: {
          candidate_id: string;
          created_at: string;
          created_by: string | null;
          duration_min: number;
          graph_event_id: string | null;
          id: string;
          job_id: string;
          location_or_link: string | null;
          notes: string | null;
          scheduled_at: string;
          status: Database["public"]["Enums"]["interview_status"];
          teams_link: string | null;
          type: Database["public"]["Enums"]["interview_type"];
          updated_at: string;
        };
        Insert: {
          candidate_id: string;
          created_at?: string;
          created_by?: string | null;
          duration_min?: number;
          graph_event_id?: string | null;
          id?: string;
          job_id: string;
          location_or_link?: string | null;
          notes?: string | null;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["interview_status"];
          teams_link?: string | null;
          type?: Database["public"]["Enums"]["interview_type"];
          updated_at?: string;
        };
        Update: {
          candidate_id?: string;
          created_at?: string;
          created_by?: string | null;
          duration_min?: number;
          graph_event_id?: string | null;
          id?: string;
          job_id?: string;
          location_or_link?: string | null;
          notes?: string | null;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["interview_status"];
          teams_link?: string | null;
          type?: Database["public"]["Enums"]["interview_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interviews_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interviews_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_assignments: {
        Row: {
          created_at: string;
          id: string;
          job_id: string;
          manager_user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          job_id: string;
          manager_user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          job_id?: string;
          manager_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_assignments_manager_user_id_fkey";
            columns: ["manager_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          closed_at: string | null;
          code: string | null;
          created_at: string;
          created_by: string | null;
          department_id: string | null;
          description: string | null;
          flow_type: Database["public"]["Enums"]["flow_type"];
          headcount: number;
          id: string;
          is_archived: boolean;
          location: string | null;
          posted_at: string | null;
          requirements: Json;
          role_family: Database["public"]["Enums"]["role_family"];
          salary_max: number | null;
          salary_min: number | null;
          status: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at: string;
          weights: Json;
        };
        Insert: {
          closed_at?: string | null;
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          department_id?: string | null;
          description?: string | null;
          flow_type?: Database["public"]["Enums"]["flow_type"];
          headcount?: number;
          id?: string;
          is_archived?: boolean;
          location?: string | null;
          posted_at?: string | null;
          requirements?: Json;
          role_family?: Database["public"]["Enums"]["role_family"];
          salary_max?: number | null;
          salary_min?: number | null;
          status?: Database["public"]["Enums"]["job_status"];
          title: string;
          updated_at?: string;
          weights?: Json;
        };
        Update: {
          closed_at?: string | null;
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          department_id?: string | null;
          description?: string | null;
          flow_type?: Database["public"]["Enums"]["flow_type"];
          headcount?: number;
          id?: string;
          is_archived?: boolean;
          location?: string | null;
          posted_at?: string | null;
          requirements?: Json;
          role_family?: Database["public"]["Enums"]["role_family"];
          salary_max?: number | null;
          salary_min?: number | null;
          status?: Database["public"]["Enums"]["job_status"];
          title?: string;
          updated_at?: string;
          weights?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          department_id: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          department_id?: string | null;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          department_id?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      referrals: {
        Row: {
          candidate_id: string;
          created_at: string;
          id: string;
          notes: string | null;
          referrer_user_id: string;
          relationship: string | null;
        };
        Insert: {
          candidate_id: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          referrer_user_id: string;
          relationship?: string | null;
        };
        Update: {
          candidate_id?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          referrer_user_id?: string;
          relationship?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "referrals_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey";
            columns: ["referrer_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      scoring_queue: {
        Row: {
          attempts: number;
          candidate_id: string;
          completed_at: string | null;
          enqueued_at: string;
          id: string;
          last_error: string | null;
          next_retry_at: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["scoring_job_status"];
          triggered_by: string | null;
        };
        Insert: {
          attempts?: number;
          candidate_id: string;
          completed_at?: string | null;
          enqueued_at?: string;
          id?: string;
          last_error?: string | null;
          next_retry_at?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["scoring_job_status"];
          triggered_by?: string | null;
        };
        Update: {
          attempts?: number;
          candidate_id?: string;
          completed_at?: string | null;
          enqueued_at?: string;
          id?: string;
          last_error?: string | null;
          next_retry_at?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["scoring_job_status"];
          triggered_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scoring_queue_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_queue_triggered_by_fkey";
            columns: ["triggered_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      stage_history: {
        Row: {
          actor_user_id: string | null;
          at: string;
          candidate_id: string;
          from_stage: Database["public"]["Enums"]["pipeline_stage"] | null;
          id: string;
          notes: string | null;
          to_stage: Database["public"]["Enums"]["pipeline_stage"];
        };
        Insert: {
          actor_user_id?: string | null;
          at?: string;
          candidate_id: string;
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null;
          id?: string;
          notes?: string | null;
          to_stage: Database["public"]["Enums"]["pipeline_stage"];
        };
        Update: {
          actor_user_id?: string | null;
          at?: string;
          candidate_id?: string;
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null;
          id?: string;
          notes?: string | null;
          to_stage?: Database["public"]["Enums"]["pipeline_stage"];
        };
        Relationships: [
          {
            foreignKeyName: "stage_history_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stage_history_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
        ];
      };
      weight_templates: {
        Row: {
          family: Database["public"]["Enums"]["role_family"];
          id: string;
          is_default: boolean;
          name_vi: string;
          updated_at: string;
          weights: Json;
        };
        Insert: {
          family: Database["public"]["Enums"]["role_family"];
          id?: string;
          is_default?: boolean;
          name_vi: string;
          updated_at?: string;
          weights: Json;
        };
        Update: {
          family?: Database["public"]["Enums"]["role_family"];
          id?: string;
          is_default?: boolean;
          name_vi?: string;
          updated_at?: string;
          weights?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      funnel_stats: {
        Row: {
          candidate_count: number | null;
          job_id: string | null;
          month_bucket: string | null;
          role_family: Database["public"]["Enums"]["role_family"] | null;
          stage: Database["public"]["Enums"]["pipeline_stage"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      time_to_hire_stats: {
        Row: {
          candidate_id: string | null;
          days_to_hire: number | null;
          hired_at: string | null;
          job_id: string | null;
          month_bucket: string | null;
          role_family: Database["public"]["Enums"]["role_family"] | null;
          started_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stage_history_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      current_dept: { Args: never; Returns: string };
      current_role_v: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      is_admin: { Args: never; Returns: boolean };
      is_hr: { Args: never; Returns: boolean };
      is_manager_for_job: { Args: { _job_id: string }; Returns: boolean };
      pick_scoring_job: {
        Args: never;
        Returns: {
          attempts: number;
          candidate_id: string;
          completed_at: string | null;
          enqueued_at: string;
          id: string;
          last_error: string | null;
          next_retry_at: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["scoring_job_status"];
          triggered_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "scoring_queue";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reaggregate_job_scores: {
        Args: { _job_id: string; _new_weights: Json };
        Returns: number;
      };
      report_score_distribution: {
        Args: { _from?: string; _job_id?: string; _to?: string };
        Returns: {
          bucket_lower: number;
          candidate_count: number;
        }[];
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      unaccent: { Args: { "": string }; Returns: string };
    };
    Enums: {
      ai_screening_status: "pending" | "success" | "failed";
      approval_status: "pending" | "approved" | "rejected";
      approval_step_kind: "hr_recommend" | "manager_recommend" | "salary_deal" | "bod" | "tap_doan";
      candidate_source: "manual_upload" | "email_inbox" | "csv_import" | "topcv_api" | "referral";
      email_direction: "outbound" | "inbound";
      email_status: "queued" | "pending_approval" | "sent" | "delivered" | "failed" | "received";
      flow_type: "staff" | "management";
      interview_status: "scheduled" | "completed" | "cancelled" | "no_show";
      interview_type: "in_person" | "phone" | "video";
      interviewer_role: "interviewer" | "observer";
      job_status: "draft" | "open" | "paused" | "closed" | "filled";
      pipeline_stage:
        | "new"
        | "screening"
        | "screened"
        | "interview_scheduled"
        | "interviewed"
        | "test_sent"
        | "test_done"
        | "recommended"
        | "salary_deal"
        | "bod_review"
        | "tap_doan_review"
        | "offer_sent"
        | "offer_accepted"
        | "hired"
        | "rejected"
        | "withdrew";
      recommendation: "strong_yes" | "yes" | "maybe" | "no";
      role_family: "sales" | "optician" | "office" | "manager" | "custom";
      scoring_job_status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
      user_role: "admin" | "hr" | "hiring_manager" | "bod" | "tap_doan";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      ai_screening_status: ["pending", "success", "failed"],
      approval_status: ["pending", "approved", "rejected"],
      approval_step_kind: ["hr_recommend", "manager_recommend", "salary_deal", "bod", "tap_doan"],
      candidate_source: ["manual_upload", "email_inbox", "csv_import", "topcv_api", "referral"],
      email_direction: ["outbound", "inbound"],
      email_status: ["queued", "pending_approval", "sent", "delivered", "failed", "received"],
      flow_type: ["staff", "management"],
      interview_status: ["scheduled", "completed", "cancelled", "no_show"],
      interview_type: ["in_person", "phone", "video"],
      interviewer_role: ["interviewer", "observer"],
      job_status: ["draft", "open", "paused", "closed", "filled"],
      pipeline_stage: [
        "new",
        "screening",
        "screened",
        "interview_scheduled",
        "interviewed",
        "test_sent",
        "test_done",
        "recommended",
        "salary_deal",
        "bod_review",
        "tap_doan_review",
        "offer_sent",
        "offer_accepted",
        "hired",
        "rejected",
        "withdrew",
      ],
      recommendation: ["strong_yes", "yes", "maybe", "no"],
      role_family: ["sales", "optician", "office", "manager", "custom"],
      scoring_job_status: ["queued", "running", "succeeded", "failed", "cancelled"],
      user_role: ["admin", "hr", "hiring_manager", "bod", "tap_doan"],
    },
  },
} as const;
