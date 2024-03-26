import {
  pgTable,
  index,
  bigint,
  smallint,
  primaryKey,
  timestamp,
  text,
  varchar,
  integer,
  bigserial,
  doublePrecision,
  boolean,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { relations } from "drizzle-orm";

export type User = InferSelectModel<typeof users>;

export type Highlight = InferSelectModel<typeof highlight>;

export type HighlightPool = InferSelectModel<typeof highlightPool>;

export type NewHighlightPool = InferInsertModel<typeof highlightPool>;

export type SelectHighlightPool = InferSelectModel<typeof highlightPool>;

export const highlight = pgTable(
  "Highlight",
  {
    id: varchar("id", { length: 191 }).notNull().primaryKey(),
    s3Bucket: varchar("s3bucket", { length: 255 }),
    s3Region: varchar("s3region", { length: 255 }),
    raspberryPiId: varchar("raspberryPiId", { length: 255 }),
    wristbandId: varchar("wristbandId", { length: 255 }),
    timestampUtc: bigint("timestampUTC", { mode: "number" }),
    duration: doublePrecision("duration"),
    aspectRatioNumerator: smallint("aspectRatioNumerator"),
    aspectRatioDenominator: smallint("aspectRatioDenominator"),
    cameraId: bigint("cameraId", { mode: "number" }),
    thumbnail: varchar("thumbnail", { length: 191 }),
    upvotesCount: integer("likesCount").default(0),
    viewsCount: integer("viewsCount").default(0),
  },
  (table) => {
    return {
      timestampUtcIdx: index("Highlight_timestampUTC_idx").on(
        table.timestampUtc
      ),
    };
  }
);

/*export const highlightRelations = relations(highlight, ({ one, many }) => ({
  camera: one(cameraAngle, {
    fields: [highlight.cameraId],
    references: [cameraAngle.id],
  }),
  viewer: many(viewedHighlightToUser),
  userBookmarks: many(bookmarkedHighlightToUser),
  userUpvotes: many(upvotedHighlightToUser),
}));*/

export const highlightPool = pgTable(
  "HighlightPool",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 191 }),
    ownerId: varchar("ownerId", { length: 191 }).notNull(),
    public: boolean("public").default(false).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .default(new Date())
      .notNull(),
    bio: text("bioText"),
    icon: varchar("thumbnail", { length: 191 }),
    followersCount: integer("followersCount").default(0),
  },
  (table) => {
    return {
      createdAtIdx: index("pool_created_at_idx").on(table.createdAt),
    };
  }
);

export const cameraAngle = pgTable("CameraAngle", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  poolId: bigint("poolId", { mode: "number" }),
  highlightsCount: integer("highlightCount").default(0),
});

export const users = pgTable("User", {
  id: varchar("id", { length: 191 }).notNull().primaryKey(),
  name: varchar("name", { length: 191 }),
  image: varchar("image", { length: 191 }),
  username: varchar("username", { length: 191 }),
  public: boolean("public"),
  followersCount: integer("followersCount").default(0),
  followingCount: integer("followingCount").default(0),
});

/*export const userRelations = relations(users, ({ many }) => ({
  bookmarkedHighlights: many(bookmarkedHighlightToUser),
  upvotedHighlights: many(upvotedHighlightToUser),
  views: many(viewedHighlightToUser),
  followedPools: many(poolsToFollowers),
  requestedPools: many(poolsToRequested),
  ownedPools: many(highlightPool),
  moddedPools: many(poolsToMods),
  follows: many(follows, { relationName: "followed" }),
  followers: many(follows, { relationName: "follower" }),
  requests: many(requests, { relationName: "requests" }),
  pending: many(requests, { relationName: "pending" }),
}));*/

export const poolsToMods = pgTable(
  "pools_to_mods",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    poolId: bigint("pool_id", { mode: "number" }).notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .default(new Date())
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.poolId] }),
    updatedAtIndex: index("pool_mod_updated_at_idx").on(table.updatedAt),
  })
);

export const poolsToFollowers = pgTable(
  "pools_to_followers",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    poolId: bigint("pool_id", { mode: "number" }).notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .default(new Date())
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.poolId] }),
    updatedAtIndex: index("pool_follow_updated_at_idx").on(table.updatedAt),
  })
);

export const poolsToRequested = pgTable(
  "pools_to_requested",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    poolId: bigint("pool_id", { mode: "number" }).notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .default(new Date())
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.poolId] }),
    updatedAtIndex: index("pool_requested_updated_at_idx").on(table.updatedAt),
  })
);

export const viewedHighlightToUser = pgTable(
  "view_to_user",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    highlightId: varchar("highlight_id", { length: 191 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.highlightId] }),
  })
);

export const bookmarkedHighlightToUser = pgTable(
  "bookmark_to_user",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    highlightId: varchar("highlight_id", { length: 191 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.highlightId] }),
  })
);

export const upvotedHighlightToUser = pgTable(
  "upvote_to_user",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    highlightId: varchar("highlight_id", { length: 191 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.highlightId] }),
  })
);

export const follows = pgTable(
  "followers",
  {
    followerId: varchar("follower_id", { length: 191 }).notNull(),
    followedId: varchar("followed_id", { length: 191 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.followerId, table.followedId] }),
  })
);

export const requests = pgTable(
  "requests",
  {
    requesterId: varchar("requester_id", { length: 191 }).notNull(),
    requestedId: varchar("requested_id", { length: 191 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.requesterId, table.requestedId] }),
  })
);

export const userRelations = relations(users, ({ many }) => ({
  bookmarkedHighlights: many(bookmarkedHighlightToUser),
  upvotedHighlights: many(upvotedHighlightToUser),
  views: many(viewedHighlightToUser),
  followedPools: many(poolsToFollowers),
  requestedPools: many(poolsToRequested),
  ownedPools: many(highlightPool),
  moddedPools: many(poolsToMods),
  follows: many(follows, { relationName: "followed" }),
  followers: many(follows, { relationName: "follower" }),
  requests: many(requests, { relationName: "requests" }),
  pending: many(requests, { relationName: "pending" }),
}));

export const highlightRelations = relations(highlight, ({ one, many }) => ({
  camera: one(cameraAngle, {
    fields: [highlight.cameraId],
    references: [cameraAngle.id],
  }),
  viewer: many(viewedHighlightToUser),
  userBookmarks: many(bookmarkedHighlightToUser),
  userUpvotes: many(upvotedHighlightToUser),
}));

export const highlightPoolRelations = relations(
  highlightPool,
  ({ many, one }) => ({
    cameras: many(cameraAngle),
    mods: many(poolsToMods),
    owner: one(users, {
      fields: [highlightPool.ownerId],
      references: [users.id],
    }),
    poolFollowers: many(poolsToFollowers),
    poolRequests: many(poolsToRequested),
  })
);

export const cameraRelations = relations(cameraAngle, ({ one, many }) => ({
  highlightPool: one(highlightPool, {
    fields: [cameraAngle.poolId],
    references: [highlightPool.id],
  }),
  highlights: many(highlight),
}));

export const followerRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  followed: one(users, {
    fields: [follows.followedId],
    references: [users.id],
    relationName: "followed",
  }),
}));

export const requestRelations = relations(requests, ({ one }) => ({
  requester: one(users, {
    fields: [requests.requesterId],
    references: [users.id],
    relationName: "requests",
  }),
  requested: one(users, {
    fields: [requests.requestedId],
    references: [users.id],
    relationName: "pending",
  }),
}));

export const poolsToModsRelation = relations(poolsToMods, ({ one }) => ({
  user: one(users, {
    fields: [poolsToMods.userId],
    references: [users.id],
  }),
  pool: one(highlightPool, {
    fields: [poolsToMods.poolId],
    references: [highlightPool.id],
  }),
}));

export const highlightsToViewers = relations(
  viewedHighlightToUser,
  ({ one }) => ({
    user: one(users, {
      fields: [viewedHighlightToUser.userId],
      references: [users.id],
    }),
    highlight: one(highlight, {
      fields: [viewedHighlightToUser.highlightId],
      references: [highlight.id],
    }),
  })
);

export const poolsToFollowersRelation = relations(
  poolsToFollowers,
  ({ one }) => ({
    user: one(users, {
      fields: [poolsToFollowers.userId],
      references: [users.id],
    }),
    pool: one(highlightPool, {
      fields: [poolsToFollowers.poolId],
      references: [highlightPool.id],
    }),
  })
);

export const poolsToRequestedRelation = relations(
  poolsToRequested,
  ({ one }) => ({
    user: one(users, {
      fields: [poolsToRequested.userId],
      references: [users.id],
    }),
    pool: one(highlightPool, {
      fields: [poolsToRequested.poolId],
      references: [highlightPool.id],
    }),
  })
);

export const bookmarkedHighlightToUserRelation = relations(
  bookmarkedHighlightToUser,
  ({ one }) => ({
    user: one(users, {
      fields: [bookmarkedHighlightToUser.userId],
      references: [users.id],
    }),
    highlight: one(highlight, {
      fields: [bookmarkedHighlightToUser.highlightId],
      references: [highlight.id],
    }),
  })
);

export const upvotededHighlightToUserRelation = relations(
  upvotedHighlightToUser,
  ({ one }) => ({
    user: one(users, {
      fields: [upvotedHighlightToUser.userId],
      references: [users.id],
    }),
    highlight: one(highlight, {
      fields: [upvotedHighlightToUser.highlightId],
      references: [highlight.id],
    }),
  })
);
