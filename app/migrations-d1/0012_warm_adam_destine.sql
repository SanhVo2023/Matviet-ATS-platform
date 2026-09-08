CREATE TABLE `offboarding_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`done_at` text,
	`done_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`done_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_offboarding_employee` ON `offboarding_tasks` (`employee_id`);--> statement-breakpoint
ALTER TABLE `employees` ADD `last_working_day` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `termination_reason` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `terminated_at` text;