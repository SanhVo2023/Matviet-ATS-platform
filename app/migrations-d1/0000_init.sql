CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_user` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `ai_screenings` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`model` text NOT NULL,
	`total` real NOT NULL,
	`criteria` text NOT NULL,
	`weights_snapshot` text NOT NULL,
	`pass1_raw` text,
	`pass2_raw` text,
	`prompt_hash` text,
	`tokens_in` integer,
	`tokens_out` integer,
	`cost_usd` real,
	`duration_ms` integer,
	`error` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_screenings_candidate` ON `ai_screenings` (`candidate_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`step_kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`actor_user_id` text,
	`notes` text,
	`decided_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_approvals_candidate` ON `approvals` (`candidate_id`,`step_index`);--> statement-breakpoint
CREATE INDEX `idx_approvals_status` ON `approvals` (`status`);--> statement-breakpoint
CREATE INDEX `idx_approvals_decided_at` ON `approvals` (`decided_at`);--> statement-breakpoint
CREATE TABLE `assessment_invite_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`submission_id` text,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submission_id`) REFERENCES `assessment_submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_assessment_tokens_candidate` ON `assessment_invite_tokens` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `assessment_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`submission_storage_path` text,
	`submitted_at` text,
	`email_message_id` text,
	`score` real,
	`notes` text,
	`graded_by` text,
	`graded_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`graded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_assessment_subs_candidate_assessment` ON `assessment_submissions` (`candidate_id`,`assessment_id`);--> statement-breakpoint
CREATE INDEX `idx_subs_candidate` ON `assessment_submissions` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`test_storage_path` text,
	`original_name` text,
	`instructions` text,
	`time_limit_min` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_assessments_job_active` ON `assessments` (`job_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`action` text NOT NULL,
	`actor_user_id` text,
	`before` text,
	`after` text,
	`meta` text,
	`at` text NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_log` (`entity`,`entity_id`,`at`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor` ON `audit_log` (`actor_user_id`,`at`);--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`person_id` text,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`dob` text,
	`gender` text,
	`location` text,
	`source` text DEFAULT 'manual_upload' NOT NULL,
	`source_meta` text DEFAULT '{}' NOT NULL,
	`referrer_user_id` text,
	`current_stage` text DEFAULT 'new' NOT NULL,
	`cv_file_id` text,
	`cv_text` text,
	`parsed` text,
	`ai_score` real,
	`ai_breakdown` text,
	`ai_scored_at` text,
	`ai_screening_status` text DEFAULT 'pending' NOT NULL,
	`ai_screening_error` text,
	`notes` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`referrer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cv_file_id`) REFERENCES `cv_files`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_candidates_job` ON `candidates` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_candidates_stage` ON `candidates` (`current_stage`);--> statement-breakpoint
CREATE INDEX `idx_candidates_score` ON `candidates` (`ai_score`);--> statement-breakpoint
CREATE INDEX `idx_candidates_email` ON `candidates` (`email`);--> statement-breakpoint
CREATE INDEX `idx_candidates_phone` ON `candidates` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_candidates_screening_status` ON `candidates` (`ai_screening_status`);--> statement-breakpoint
CREATE INDEX `idx_candidates_created_at` ON `candidates` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_candidates_job_created` ON `candidates` (`job_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_candidates_source_created` ON `candidates` (`source`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_candidates_person` ON `candidates` (`person_id`);--> statement-breakpoint
CREATE TABLE `cv_files` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_path` text NOT NULL,
	`pdf_storage_path` text,
	`original_name` text NOT NULL,
	`mime` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`parent_id` text,
	`head_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`head_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_code_unique` ON `departments` (`code`);--> statement-breakpoint
CREATE TABLE `email_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`direction` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`candidate_id` text,
	`job_id` text,
	`interview_id` text,
	`template_code` text,
	`subject` text NOT NULL,
	`body_html` text,
	`body_text` text,
	`from_email` text,
	`to_emails` text DEFAULT '[]' NOT NULL,
	`cc_emails` text DEFAULT '[]' NOT NULL,
	`graph_message_id` text,
	`conversation_id` text,
	`in_reply_to` text,
	`scheduled_send_at` text,
	`sent_at` text,
	`received_at` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`next_retry_at` text,
	`error` text,
	`approved_by` text,
	`approved_at` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`interview_id`) REFERENCES `interviews`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_emails_candidate` ON `email_messages` (`candidate_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_emails_status` ON `email_messages` (`status`);--> statement-breakpoint
CREATE INDEX `idx_emails_queue_drain` ON `email_messages` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_emails_next_retry` ON `email_messages` (`next_retry_at`);--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name_vi` text NOT NULL,
	`subject_vi` text NOT NULL,
	`body_html` text NOT NULL,
	`body_md` text,
	`variables` text DEFAULT '[]' NOT NULL,
	`requires_approval` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_templates_code_unique` ON `email_templates` (`code`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`employee_code` text,
	`department_id` text,
	`position_id` text,
	`hired_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_employee_code_unique` ON `employees` (`employee_code`);--> statement-breakpoint
CREATE INDEX `idx_employees_person` ON `employees` (`person_id`);--> statement-breakpoint
CREATE TABLE `inbox_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`email_message_id` text NOT NULL,
	`storage_path` text,
	`original_name` text,
	`mime` text,
	`size_bytes` integer,
	`is_cv` integer DEFAULT false NOT NULL,
	`cv_file_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`email_message_id`) REFERENCES `email_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cv_file_id`) REFERENCES `cv_files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `interview_attendees` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'interviewer' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `interviews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_attendees_interview_user` ON `interview_attendees` (`interview_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_attendees_user` ON `interview_attendees` (`user_id`);--> statement-breakpoint
CREATE TABLE `interview_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`evaluator_user_id` text NOT NULL,
	`scores` text NOT NULL,
	`recommendation` text,
	`strengths` text,
	`concerns` text,
	`proposed_salary` real,
	`internal_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `interviews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evaluator_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_evals_interview_evaluator` ON `interview_evaluations` (`interview_id`,`evaluator_user_id`);--> statement-breakpoint
CREATE INDEX `idx_evals_interview` ON `interview_evaluations` (`interview_id`);--> statement-breakpoint
CREATE TABLE `interviews` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`job_id` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`duration_min` integer DEFAULT 60 NOT NULL,
	`type` text DEFAULT 'in_person' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`location_or_link` text,
	`teams_link` text,
	`graph_event_id` text,
	`notes` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_interviews_candidate` ON `interviews` (`candidate_id`);--> statement-breakpoint
CREATE INDEX `idx_interviews_scheduled` ON `interviews` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `idx_interviews_status` ON `interviews` (`status`);--> statement-breakpoint
CREATE TABLE `job_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`manager_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_assignments_job_manager` ON `job_assignments` (`job_id`,`manager_user_id`);--> statement-breakpoint
CREATE INDEX `idx_assignments_manager` ON `job_assignments` (`manager_user_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`code` text,
	`department_id` text,
	`location` text,
	`description` text,
	`requirements` text DEFAULT '[]' NOT NULL,
	`weights` text DEFAULT '{}' NOT NULL,
	`role_family` text DEFAULT 'custom' NOT NULL,
	`flow_type` text DEFAULT 'staff' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`headcount` integer DEFAULT 1 NOT NULL,
	`salary_min` real,
	`salary_max` real,
	`posted_at` text,
	`closed_at` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_code_unique` ON `jobs` (`code`);--> statement-breakpoint
CREATE INDEX `idx_jobs_status` ON `jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_jobs_dept` ON `jobs` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_jobs_posted_at` ON `jobs` (`posted_at`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`dob` text,
	`gender` text,
	`national_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_people_email` ON `people` (`email`);--> statement-breakpoint
CREATE INDEX `idx_people_phone` ON `people` (`phone`);--> statement-breakpoint
CREATE TABLE `positions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`department_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`referrer_user_id` text NOT NULL,
	`relationship` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referrer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scoring_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`next_retry_at` text,
	`triggered_by` text,
	`enqueued_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`triggered_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_scoring_queue_pending` ON `scoring_queue` (`status`,`enqueued_at`);--> statement-breakpoint
CREATE INDEX `idx_scoring_queue_candidate` ON `scoring_queue` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `stage_history` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`from_stage` text,
	`to_stage` text NOT NULL,
	`actor_user_id` text,
	`notes` text,
	`at` text NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_stage_history_candidate` ON `stage_history` (`candidate_id`,`at`);--> statement-breakpoint
CREATE INDEX `idx_stage_history_to_stage_at` ON `stage_history` (`to_stage`,`at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`role` text DEFAULT 'hr' NOT NULL,
	`phone` text,
	`department_id` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_users_dept` ON `users` (`department_id`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `weight_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`family` text NOT NULL,
	`name_vi` text NOT NULL,
	`weights` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weight_templates_family_unique` ON `weight_templates` (`family`);