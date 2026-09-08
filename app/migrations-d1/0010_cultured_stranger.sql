CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`type` text NOT NULL,
	`contract_no` text,
	`start_date` text,
	`end_date` text,
	`base_salary` real,
	`status` text DEFAULT 'active' NOT NULL,
	`signed_at` text,
	`notes` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_contracts_employee` ON `contracts` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_contracts_status_end` ON `contracts` (`status`,`end_date`);--> statement-breakpoint
CREATE TABLE `onboarding_tasks` (
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
CREATE INDEX `idx_onboarding_employee` ON `onboarding_tasks` (`employee_id`);--> statement-breakpoint
ALTER TABLE `agent_proposals` ADD `employee_id` text REFERENCES employees(id);--> statement-breakpoint
CREATE INDEX `idx_proposals_employee` ON `agent_proposals` (`employee_id`,`status`);