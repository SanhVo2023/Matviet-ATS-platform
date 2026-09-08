CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_announcements_created` ON `announcements` (`pinned`,`created_at`);--> statement-breakpoint
CREATE TABLE `hr_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`storage_path` text NOT NULL,
	`original_name` text NOT NULL,
	`mime` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_hr_documents_created` ON `hr_documents` (`created_at`);