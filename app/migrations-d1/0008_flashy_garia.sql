PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_candidates` (
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
	`current_stage` text DEFAULT 'intake' NOT NULL,
	`cv_file_id` text,
	`cv_text` text,
	`parsed` text,
	`ai_score` real,
	`ai_breakdown` text,
	`ai_scored_at` text,
	`ai_screening_status` text DEFAULT 'pending' NOT NULL,
	`ai_screening_error` text,
	`rejection_reason` text,
	`ai_summary` text,
	`ai_summary_at` text,
	`notes` text,
	`offer_token` text,
	`offer_token_expires_at` text,
	`offer_response` text,
	`offer_responded_at` text,
	`offer_response_note` text,
	`expected_start_date` text,
	`consent_at` text,
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
INSERT INTO `__new_candidates`("id", "job_id", "person_id", "full_name", "email", "phone", "dob", "gender", "location", "source", "source_meta", "referrer_user_id", "current_stage", "cv_file_id", "cv_text", "parsed", "ai_score", "ai_breakdown", "ai_scored_at", "ai_screening_status", "ai_screening_error", "rejection_reason", "ai_summary", "ai_summary_at", "notes", "offer_token", "offer_token_expires_at", "offer_response", "offer_responded_at", "offer_response_note", "expected_start_date", "consent_at", "is_archived", "created_by", "created_at", "updated_at") SELECT "id", "job_id", "person_id", "full_name", "email", "phone", "dob", "gender", "location", "source", "source_meta", "referrer_user_id", "current_stage", "cv_file_id", "cv_text", "parsed", "ai_score", "ai_breakdown", "ai_scored_at", "ai_screening_status", "ai_screening_error", "rejection_reason", "ai_summary", "ai_summary_at", "notes", "offer_token", "offer_token_expires_at", "offer_response", "offer_responded_at", "offer_response_note", "expected_start_date", "consent_at", "is_archived", "created_by", "created_at", "updated_at" FROM `candidates`;--> statement-breakpoint
DROP TABLE `candidates`;--> statement-breakpoint
ALTER TABLE `__new_candidates` RENAME TO `candidates`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_candidates_offer_token` ON `candidates` (`offer_token`);--> statement-breakpoint
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
-- ── Renovation R1 data migration: collapse 16 legacy stages → 8 ──
UPDATE `candidates` SET `current_stage` = CASE `current_stage`
  WHEN 'new' THEN 'intake' WHEN 'screening' THEN 'intake' WHEN 'screened' THEN 'intake'
  WHEN 'interview_scheduled' THEN 'evaluating' WHEN 'interviewed' THEN 'evaluating'
  WHEN 'test_sent' THEN 'evaluating' WHEN 'test_done' THEN 'evaluating'
  WHEN 'recommended' THEN 'approving' WHEN 'salary_deal' THEN 'approving'
  WHEN 'bod_review' THEN 'approving' WHEN 'tap_doan_review' THEN 'approving'
  WHEN 'offer_sent' THEN 'offer'
  ELSE `current_stage` END;--> statement-breakpoint
UPDATE `stage_history` SET `from_stage` = CASE `from_stage`
  WHEN 'new' THEN 'intake' WHEN 'screening' THEN 'intake' WHEN 'screened' THEN 'intake'
  WHEN 'interview_scheduled' THEN 'evaluating' WHEN 'interviewed' THEN 'evaluating'
  WHEN 'test_sent' THEN 'evaluating' WHEN 'test_done' THEN 'evaluating'
  WHEN 'recommended' THEN 'approving' WHEN 'salary_deal' THEN 'approving'
  WHEN 'bod_review' THEN 'approving' WHEN 'tap_doan_review' THEN 'approving'
  WHEN 'offer_sent' THEN 'offer'
  ELSE `from_stage` END
WHERE `from_stage` IS NOT NULL;--> statement-breakpoint
UPDATE `stage_history` SET `to_stage` = CASE `to_stage`
  WHEN 'new' THEN 'intake' WHEN 'screening' THEN 'intake' WHEN 'screened' THEN 'intake'
  WHEN 'interview_scheduled' THEN 'evaluating' WHEN 'interviewed' THEN 'evaluating'
  WHEN 'test_sent' THEN 'evaluating' WHEN 'test_done' THEN 'evaluating'
  WHEN 'recommended' THEN 'approving' WHEN 'salary_deal' THEN 'approving'
  WHEN 'bod_review' THEN 'approving' WHEN 'tap_doan_review' THEN 'approving'
  WHEN 'offer_sent' THEN 'offer'
  ELSE `to_stage` END;--> statement-breakpoint
-- Collapse now-degenerate intra-group rows (e.g. new→screening = intake→intake).
-- The initial row has from_stage IS NULL and survives (anchors funnel + daysWaiting).
DELETE FROM `stage_history` WHERE `from_stage` = `to_stage`;--> statement-breakpoint
-- Backfill rejection_reason for already-rejected rows.
UPDATE `candidates` SET `rejection_reason` = 'offer_declined'
  WHERE `current_stage` = 'rejected' AND `offer_response` = 'declined';--> statement-breakpoint
UPDATE `candidates` SET `rejection_reason` = 'not_approved'
  WHERE `current_stage` = 'rejected' AND `rejection_reason` IS NULL
    AND `id` IN (SELECT `candidate_id` FROM `approvals` WHERE `status` = 'rejected');--> statement-breakpoint
UPDATE `candidates` SET `rejection_reason` = 'other'
  WHERE `current_stage` = 'rejected' AND `rejection_reason` IS NULL;
