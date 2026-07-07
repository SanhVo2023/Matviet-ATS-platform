CREATE TABLE `cv_markdowns` (
	`id` text PRIMARY KEY NOT NULL,
	`cv_file_id` text NOT NULL,
	`candidate_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`md` text,
	`engine` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cv_file_id`) REFERENCES `cv_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cv_markdowns_file` ON `cv_markdowns` (`cv_file_id`);--> statement-breakpoint
CREATE INDEX `idx_cv_markdowns_candidate` ON `cv_markdowns` (`candidate_id`);