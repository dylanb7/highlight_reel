import {
  mysqlTable,
  varchar,
  index,
  bigint,
  smallint,
  tinyint,
  primaryKey,
  float,
  serial,
  timestamp,
} from "drizzle-orm/mysql-core";
import type { InferModel } from "drizzle-orm";
import { relations } from "drizzle-orm";

export type User = InferModel<typeof users>;

export type Highlight = InferModel<typeof highlight>;

export type HighlightPool = InferModel<typeof highlightPool>;

export type NewHighlightPool = InferModel<typeof highlightPool, "insert">;

export type SelectHighlightPool = InferModel<typeof highlightPool, "select">;

export const highlight = mysqlTable(
  "Highlight",
  {
    id: varchar("id", { length: 191 }).notNull().primaryKey(),
    s3Bucket: varchar("s3bucket", { length: 255 }),
    s3Region: varchar("s3region", { length: 255 }),
    raspberryPiId: varchar("raspberryPiId", { length: 255 }),
    wristbandId: varchar("wristbandId", { length: 255 }),
    timestampUtc: bigint("timestampUTC", { mode: "number" }),
    duration: float("duration"),
    aspectRatioNumerator: smallint("aspectRatioNumerator"),
    aspectRatioDenominator: smallint("aspectRatioDenominator"),
    poolId: bigint("poolId", { mode: "number" }),
    thumbnail: varchar("thumbnail", { length: 191 }),
  },
  (table) => {
    return {
      timestampUtcIdx: index("Highlight_timestampUTC_idx").on(
        table.timestampUtc
      ),
    };
  }
);

export const highlightPool = mysqlTable(
  "HighlightPool",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 191 }),
    ownerId: varchar("ownerId", { length: 191 }).notNull(),
    public: tinyint("public").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => {
    return {
      createdAtIdx: index("created_at_idx").on(table.createdAt),
    };
  }
);

export const users = mysqlTable("User", {
  id: varchar("id", { length: 191 }).notNull().primaryKey(),
  name: varchar("name", { length: 191 }),
  image: varchar("image", { length: 191 }),
  username: varchar("username", { length: 191 }),
  public: tinyint("public"),
});

export const poolsToMods = mysqlTable(
  "pools_to_mods",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    poolId: bigint("pool_id", { mode: "number" }).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey(table.userId, table.poolId),
    updatedAtIndex: index("updated_at_idx").on(table.updatedAt),
  })
);

export const poolsToFollowers = mysqlTable(
  "pools_to_followers",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    poolId: bigint("pool_id", { mode: "number" }).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey(table.userId, table.poolId),
    updatedAtIndex: index("updated_at_idx").on(table.updatedAt),
  })
);

export const poolsToRequested = mysqlTable(
  "pools_to_requested",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    poolId: bigint("pool_id", { mode: "number" }).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey(table.userId, table.poolId),
    updatedAtIndex: index("updated_at_idx").on(table.updatedAt),
  })
);

export const bookmarkedHighlightToUser = mysqlTable(
  "bookmark_to_user",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    highlightId: varchar("highlight_id", { length: 191 }).notNull(),
  },
  (table) => ({
    pk: primaryKey(table.userId, table.highlightId),
  })
);

export const upvotedHighlightToUser = mysqlTable(
  "upvote_to_user",
  {
    userId: varchar("user_id", { length: 191 }).notNull(),
    highlightId: varchar("highlight_id", { length: 191 }).notNull(),
  },
  (table) => ({
    pk: primaryKey(table.userId, table.highlightId),
  })
);

export const follows = mysqlTable(
  "followers",
  {
    followerId: varchar("follower_id", { length: 191 }).notNull(),
    followedId: varchar("followed_id", { length: 191 }).notNull(),
  },
  (table) => ({
    pk: primaryKey(table.followerId, table.followedId),
  })
);

export const requests = mysqlTable(
  "requests",
  {
    requesterId: varchar("requester_id", { length: 191 }).notNull(),
    requestedId: varchar("requested_id", { length: 191 }).notNull(),
  },
  (table) => ({
    pk: primaryKey(table.requesterId, table.requestedId),
  })
);

export const userRelations = relations(users, ({ many }) => ({
  bookmarkedHighlights: many(bookmarkedHighlightToUser),
  upvotedHighlights: many(upvotedHighlightToUser),
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
  pool: one(highlightPool, {
    fields: [highlight.poolId],
    references: [highlightPool.id],
  }),
  userBookmarks: many(bookmarkedHighlightToUser),
  userUpvotes: many(upvotedHighlightToUser),
}));

export const highlightPoolRelations = relations(
  highlightPool,
  ({ many, one }) => ({
    highlights: many(highlight),
    mods: many(poolsToMods),
    owner: one(users, {
      fields: [highlightPool.ownerId],
      references: [users.id],
    }),
    poolFollowers: many(poolsToFollowers),
    poolRequests: many(poolsToRequested),
  })
);

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
