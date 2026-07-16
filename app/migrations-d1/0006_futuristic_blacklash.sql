CREATE TABLE `agent_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`candidate_id` text,
	`kind` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`summary` text NOT NULL,
	`reasoning` text,
	`payload` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`created_at` text NOT NULL,
	`decided_by` text,
	`decided_at` text,
	`executed_ref` text,
	`error` text,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_proposals_status` ON `agent_proposals` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_proposals_job` ON `agent_proposals` (`job_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_proposals_dedupe` ON `agent_proposals` (`dedupe_key`,`status`);--> statement-breakpoint
CREATE INDEX `idx_proposals_candidate` ON `agent_proposals` (`candidate_id`,`status`);