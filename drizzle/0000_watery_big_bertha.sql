CREATE TABLE `bookmark_to_user` (
	`user_id` varchar(191) NOT NULL,
	`highlight_id` varchar(191) NOT NULL,
	CONSTRAINT `bookmark_to_user_highlight_id_user_id` PRIMARY KEY(`highlight_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `followers` (
	`follower_id` varchar(191) NOT NULL,
	`followed_id` varchar(191) NOT NULL,
	CONSTRAINT `followers_followed_id_follower_id` PRIMARY KEY(`followed_id`,`follower_id`)
);
--> statement-breakpoint
CREATE TABLE `Highlight` (
	`id` varchar(191) PRIMARY KEY NOT NULL,
	`s3bucket` varchar(255),
	`s3region` varchar(255),
	`raspberryPiId` varchar(255),
	`wristbandId` varchar(255),
	`timestampUTC` bigint,
	`duration` float,
	`aspectRatioNumerator` smallint,
	`aspectRatioDenominator` smallint,
	`poolId` bigint,
	`thumbnail` varchar(191)
);
--> statement-breakpoint
CREATE TABLE `HighlightPool` (
	`id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(191),
	`ownerId` varchar(191) NOT NULL,
	`public` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `pools_to_followers` (
	`user_id` varchar(191) NOT NULL,
	`pool_id` bigint NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pools_to_followers_pool_id_user_id` PRIMARY KEY(`pool_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `pools_to_mods` (
	`user_id` varchar(191) NOT NULL,
	`pool_id` bigint NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pools_to_mods_pool_id_user_id` PRIMARY KEY(`pool_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `pools_to_requested` (
	`user_id` varchar(191) NOT NULL,
	`pool_id` bigint NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pools_to_requested_pool_id_user_id` PRIMARY KEY(`pool_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`requester_id` varchar(191) NOT NULL,
	`requested_id` varchar(191) NOT NULL,
	CONSTRAINT `requests_requested_id_requester_id` PRIMARY KEY(`requested_id`,`requester_id`)
);
--> statement-breakpoint
CREATE TABLE `upvote_to_user` (
	`user_id` varchar(191) NOT NULL,
	`highlight_id` varchar(191) NOT NULL,
	CONSTRAINT `upvote_to_user_highlight_id_user_id` PRIMARY KEY(`highlight_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` varchar(191) PRIMARY KEY NOT NULL,
	`name` varchar(191),
	`image` varchar(191),
	`username` varchar(191),
	`public` tinyint
);
--> statement-breakpoint
CREATE INDEX `Highlight_timestampUTC_idx` ON `Highlight` (`timestampUTC`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `HighlightPool` (`createdAt`);--> statement-breakpoint
CREATE INDEX `updated_at_idx` ON `pools_to_followers` (`updatedAt`);--> statement-breakpoint
CREATE INDEX `updated_at_idx` ON `pools_to_mods` (`updatedAt`);--> statement-breakpoint
CREATE INDEX `updated_at_idx` ON `pools_to_requested` (`updatedAt`);