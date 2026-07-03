CREATE TABLE `ai_usage_log` (
	`id` text PRIMARY KEY NOT NULL,
	`feature` text NOT NULL,
	`model` text NOT NULL,
	`tokens_in` integer DEFAULT 0 NOT NULL,
	`tokens_out` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_usage_created` ON `ai_usage_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_usage_feature` ON `ai_usage_log` (`feature`,`created_at`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
