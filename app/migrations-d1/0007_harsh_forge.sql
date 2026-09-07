CREATE TABLE `login_attempts` (
	`email` text PRIMARY KEY NOT NULL,
	`fail_count` integer DEFAULT 0 NOT NULL,
	`last_fail_at` text,
	`locked_until` text
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limits_key` ON `rate_limits` (`key`);--> statement-breakpoint
CREATE INDEX `idx_rate_limits_last` ON `rate_limits` (`last_request`);--> statement-breakpoint
UPDATE `users` SET `banned` = 1, `ban_reason` = 'Vô hiệu hóa bởi quản trị viên' WHERE `is_active` = 0 AND `banned` = 0;