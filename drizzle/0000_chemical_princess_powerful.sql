CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text,
	`search_result_id` text,
	`claim` text NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `identifiers` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `persons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_results` (
	`id` text PRIMARY KEY NOT NULL,
	`search_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`url_hash` text NOT NULL,
	`description` text,
	`source` text NOT NULL,
	`source_type` text NOT NULL,
	`published_at` text,
	`collected_at` text NOT NULL,
	`excerpt` text,
	`entities` text DEFAULT '[]' NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`search_id`) REFERENCES `searches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `searches` (
	`id` text PRIMARY KEY NOT NULL,
	`query` text NOT NULL,
	`query_type` text NOT NULL,
	`person_id` text,
	`result_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
