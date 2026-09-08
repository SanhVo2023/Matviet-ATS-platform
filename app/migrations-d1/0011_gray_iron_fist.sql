CREATE TABLE `leave_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`type` text DEFAULT 'annual' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`days` real NOT NULL,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`decided_by` text,
	`decided_at` text,
	`decision_note` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_leave_employee` ON `leave_requests` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_status` ON `leave_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_leave_dates` ON `leave_requests` (`start_date`,`end_date`);