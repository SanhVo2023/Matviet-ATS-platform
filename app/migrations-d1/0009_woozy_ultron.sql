PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_employees` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`employee_code` text,
	`department_id` text,
	`position_id` text,
	`hired_at` text,
	`status` text DEFAULT 'probation' NOT NULL,
	`manager_id` text,
	`store_location` text,
	`employment_type` text DEFAULT 'full_time' NOT NULL,
	`start_date` text,
	`work_email` text,
	`bank_account` text,
	`bank_name` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`source_candidate_id` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_employees`("id", "person_id", "employee_code", "department_id", "position_id", "hired_at", "status", "manager_id", "store_location", "employment_type", "start_date", "work_email", "bank_account", "bank_name", "emergency_contact_name", "emergency_contact_phone", "source_candidate_id", "notes", "created_at", "updated_at") SELECT "id", "person_id", "employee_code", "department_id", "position_id", "hired_at", "status", "manager_id", "store_location", "employment_type", "start_date", "work_email", "bank_account", "bank_name", "emergency_contact_name", "emergency_contact_phone", "source_candidate_id", "notes", "created_at", "updated_at" FROM `employees`;--> statement-breakpoint
DROP TABLE `employees`;--> statement-breakpoint
ALTER TABLE `__new_employees` RENAME TO `employees`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `employees_employee_code_unique` ON `employees` (`employee_code`);--> statement-breakpoint
CREATE INDEX `idx_employees_person` ON `employees` (`person_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_department` ON `employees` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_manager` ON `employees` (`manager_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_status` ON `employees` (`status`);--> statement-breakpoint
ALTER TABLE `people` ADD `bhxh_no` text;--> statement-breakpoint
ALTER TABLE `people` ADD `tax_no` text;--> statement-breakpoint
ALTER TABLE `people` ADD `permanent_address` text;