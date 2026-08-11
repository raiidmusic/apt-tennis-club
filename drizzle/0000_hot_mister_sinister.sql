CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`whatsapp` text NOT NULL,
	`age` integer NOT NULL,
	`city` text NOT NULL,
	`profession` text NOT NULL,
	`class_level` text NOT NULL,
	`referrer` text NOT NULL,
	`answers_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invite_token` text,
	`email_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_invite_token_unique` ON `applications` (`invite_token`);--> statement-breakpoint
CREATE TABLE `member_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`cpf_last4` text NOT NULL,
	`asaas_checkout_id` text,
	`status` text DEFAULT 'pending_configuration' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_registrations_application_id_unique` ON `member_registrations` (`application_id`);