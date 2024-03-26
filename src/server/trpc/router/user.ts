/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { ProfileInfo, UserInfo } from "../../types/user-out";
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import type { ReelInfo } from "../../types/pool-out";
import type { highlightCursor } from "../../../utils/highlight-utils";
import {
  addExt,
  decodeCursor,
  packageHighlightsPaginated,
  packageThumbnailsPaginated,
} from "../../../utils/highlight-utils";
import type { HighlightReturn } from "../../types/highlight-out";

import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { User } from "../../db/schema";
import { bookmarkedHighlightToUser, highlight } from "../../db/schema";
import {
  follows,
  highlightPool,
  poolsToFollowers,
  poolsToRequested,
  requests,
  upvotedHighlightToUser,
  users,
} from "../../db/schema";
import {
  cursorWhereArgs,
  orderByArgs,
  userWhereArgs,
} from "../../../utils/drizzle-helpers";

export const userRouter = router({
  fromId: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.db.query.users.findFirst({
      where: eq(users.id, input),
    });
  }),

  finishProfile: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(25),
        public: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.insert(users).values({
        id: ctx.auth.userId,
        public: input.public,
        username: input.username,
      });
    }),

  profileQuery: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const ref = ctx.auth?.userId;
      const profile = await ctx.db.query.users.findFirst({
        where: eq(users.id, input),
        with: {
          ...(ref
            ? {
                followers: {
                  where: eq(follows.followerId, ref),
                  limit: 1,
                },
              }
            : {}),
          ...(ref
            ? {
                pending: {
                  where: eq(requests.requesterId, ref),
                  limit: 1,
                },
              }
            : {}),
        },
      });
      return profile
        ? ({
            ...profile,
            following: profile.followingCount,
            followedBy: profile.followersCount,
            ...(ref
              ? {
                  followInfo: {
                    requested: profile.pending
                      ? profile.pending.length > 0
                      : false,
                    follows: profile.followers
                      ? profile.followers.length > 0
                      : false,
                  },
                }
              : {}),
            isPublic: profile.public,
          } as ProfileInfo)
        : undefined;
    }),

  profileReelsQuery: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        type: z.enum(["followed", "modded", "owned"]),
        amount: z.number().nullish(),
        cursor: z.date().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const ref = ctx.auth?.userId;
      const { userId, type, cursor } = input;
      const amount = input.amount ?? 6;
      const owns = userId === ref;
      if (type !== "followed" && !owns) return undefined;
      let reels: ReelInfo[];
      if (type === "followed") {
        const data = await ctx.db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {},
          with: {
            followedPools: {
              where: () => {
                if (!cursor) return gte(poolsToFollowers.poolId, 0);
                return lt(poolsToFollowers.updatedAt, cursor);
              },
              columns: {
                updatedAt: true,
              },
              limit: amount + 1,
              with: {
                pool: {
                  with: {
                    cameras: {
                      columns: {
                        highlightsCount: true,
                      },
                    },
                    ...(!owns && ref
                      ? {
                          poolRequests: {
                            limit: 1,
                            where: eq(poolsToRequested.userId, ref),
                          },
                        }
                      : {}),
                    ...(!owns && ref
                      ? {
                          poolFollowers: {
                            where: eq(poolsToFollowers.userId, ref),
                            limit: 1,
                          },
                        }
                      : {}),
                  },
                },
              },
            },
          },
        });

        reels =
          data?.followedPools.map<ReelInfo>((val) => {
            const pool = val.pool;
            return {
              ...pool,
              createdAt: val.updatedAt,
              isPublic: pool.public,
              followInfo: {
                follows: pool.poolFollowers
                  ? pool.poolFollowers.length > 0
                  : false,
                requested: pool.poolRequests
                  ? pool.poolRequests.length > 0
                  : false,
              },
              highlightCount: pool.cameras
                .map((val) => val.highlightsCount ?? 0)
                .reduce((a, b) => a + b),
              followerCount: pool.followersCount ?? 0,
            };
          }) ?? [];
      } else if (type === "modded") {
        const data = await ctx.db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {},
          with: {
            moddedPools: {
              where: () => {
                if (!cursor) return gte(poolsToFollowers.poolId, 0);
                return lt(poolsToFollowers.updatedAt, cursor);
              },
              columns: {
                updatedAt: true,
              },
              limit: amount + 1,
              with: {
                pool: {
                  with: {
                    cameras: {
                      columns: {
                        highlightsCount: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
        reels =
          data?.moddedPools.map<ReelInfo>((val) => {
            const pool = val.pool;
            return {
              ...pool,
              createdAt: val.updatedAt,
              isPublic: pool.public,
              followInfo: {
                follows: true,
                requested: false,
              },
              highlightCount: pool.cameras
                .map((val) => val.highlightsCount ?? 0)
                .reduce((a, b) => a + b),
              followerCount: pool.followersCount ?? 0,
            };
          }) ?? [];
      } else {
        const data = await ctx.db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {},
          with: {
            ownedPools: {
              where: () => {
                if (!cursor) return gte(highlightPool.id, 0);
                return lt(highlightPool.createdAt, cursor);
              },
              limit: amount + 1,
              with: {
                cameras: {
                  columns: {
                    highlightsCount: true,
                  },
                },
              },
            },
          },
        });
        reels =
          data?.ownedPools.map<ReelInfo>((pool) => {
            return {
              ...pool,
              isPublic: pool.public,
              followInfo: {
                follows: true,
                requested: false,
              },
              highlightCount: pool.cameras
                .map((val) => val.highlightsCount ?? 0)
                .reduce((a, b) => a + b),
              followerCount: pool.followersCount ?? 0,
            };
          }) ?? [];
      }
      const hasNext = reels.length === amount + 1;

      if (hasNext) reels.pop();

      return {
        poolsInfo: reels,
        nextCursor: hasNext ? reels[-1]?.createdAt : undefined,
      };
    }),

  toggleHighlight: protectedProcedure
    .input(
      z.object({
        highlightId: z.string(),
        add: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.auth.userId;
      const extId = addExt(input.highlightId);

      if (input.add) {
        return ctx.db
          .insert(bookmarkedHighlightToUser)
          .values({ highlightId: extId, userId: userId });
      }
      return ctx.db
        .delete(bookmarkedHighlightToUser)
        .where(
          and(
            eq(bookmarkedHighlightToUser.highlightId, extId),
            eq(bookmarkedHighlightToUser.userId, userId)
          )
        );
    }),

  upvoteHighlight: protectedProcedure
    .input(
      z.object({
        highlightId: z.string(),
        like: z.boolean().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      const extId = addExt(input.highlightId);
      if (input.like) {
        return ctx.db.transaction(async (tx) => {
          await tx
            .insert(upvotedHighlightToUser)
            .values({ userId, highlightId: extId });
          await tx
            .update(highlight)
            .set({ upvotesCount: sql`${highlight.upvotesCount} + 1` })
            .where(eq(highlight.id, extId));
        });
      }
      return await ctx.db.transaction(async (tx) => {
        await tx
          .delete(upvotedHighlightToUser)
          .where(
            and(
              eq(upvotedHighlightToUser.userId, userId),
              eq(upvotedHighlightToUser.highlightId, extId)
            )
          );
        await tx
          .update(highlight)
          .set({ upvotesCount: sql`${highlight.upvotesCount} - 1` })
          .where(eq(highlight.id, extId));
      });
    }),

  addReel: protectedProcedure
    .input(
      z.object({
        reelId: z.number(),
        isPublic: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      const { reelId: poolId, isPublic } = input;
      if (isPublic) {
        return await ctx.db.transaction(async (tx) => {
          await tx.insert(poolsToFollowers).values({ poolId: poolId, userId });
          await tx
            .update(highlightPool)
            .set({ followersCount: sql`${highlightPool.followersCount} + 1` })
            .where(eq(highlightPool.id, poolId));
        });
      }
      return await ctx.db
        .insert(poolsToRequested)
        .values({ poolId: poolId, userId });
    }),

  removeReel: protectedProcedure
    .input(
      z.object({
        reelId: z.number(),
        requested: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      if (input.requested) {
        return ctx.db
          .delete(poolsToRequested)
          .where(
            and(
              eq(poolsToRequested.userId, userId),
              eq(poolsToRequested.poolId, input.reelId)
            )
          );
      }
      return ctx.db.transaction(async (tx) => {
        await tx
          .delete(poolsToFollowers)
          .where(
            and(
              eq(poolsToFollowers.userId, userId),
              eq(poolsToFollowers.poolId, input.reelId)
            )
          );
        await tx
          .update(highlightPool)
          .set({ followersCount: sql`${highlightPool.followersCount} - 1` })
          .where(eq(highlightPool.id, input.reelId));
      });
    }),

  getFollowers: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const ref = ctx.auth?.userId;
      const res = await ctx.db.query.users.findFirst({
        where: eq(users.id, input),
        columns: {},
        with: {
          followers: {
            with: {
              follower: {
                with: {
                  ...(ref
                    ? {
                        followers: {
                          where: (table, { eq }) => eq(table.followerId, ref),
                          limit: 1,
                        },
                      }
                    : {}),
                  ...(ref
                    ? {
                        pending: {
                          where: (table, { eq }) => eq(table.requesterId, ref),
                          limit: 1,
                        },
                      }
                    : {}),
                },
              },
            },
            orderBy: asc(follows.followerId),
          },
        },
      });
      return (
        res?.followers.map<UserInfo>((val) => ({
          ...val.follower,
          ...(res
            ? {
                followInfo: {
                  follows: val.follower?.followers.length > 0 ?? false,
                  requested: val.follower?.pending.length > 0 ?? false,
                },
              }
            : {}),
          isPublic: val.follower.public ?? false,
        })) ?? []
      );
    }),

  getFollowing: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const ref = ctx.auth?.userId;
      const res = await ctx.db.query.users.findFirst({
        where: eq(users.id, input),
        columns: {},
        with: {
          follows: {
            with: {
              follower: {
                with: {
                  ...(ref
                    ? {
                        followers: {
                          where: (table, { eq }) => eq(table.followerId, ref),
                          limit: 1,
                        },
                      }
                    : {}),
                  ...(ref
                    ? {
                        pending: {
                          where: (table, { eq }) => eq(table.requesterId, ref),
                          limit: 1,
                        },
                      }
                    : {}),
                },
              },
            },
            orderBy: asc(follows.followedId),
          },
        },
      });
      return (
        res?.follows.map<UserInfo>((val) => ({
          ...val.follower,
          ...(res
            ? {
                followInfo: {
                  follows: val.follower?.followers.length > 0 ?? false,
                  requested: val.follower?.pending.length > 0 ?? false,
                },
              }
            : {}),
          isPublic: val.follower.public ?? false,
        })) ?? []
      );
    }),

  getPending: protectedProcedure.query(async ({ ctx }) => {
    return (
      (
        await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.auth.userId),
          columns: {},
          with: {
            pending: {
              columns: {},
              with: { requester: {} },
            },
          },
        })
      )?.pending.map<User>((val) => val.requester) ?? []
    );
  }),

  followUser: protectedProcedure
    .input(
      z.object({
        followId: z.string(),
        public: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      if (input.public) {
        return await ctx.db.transaction(async (tx) => {
          await tx
            .insert(follows)
            .values({ followerId: userId, followedId: input.followId });
          await tx
            .update(users)
            .set({ followersCount: sql`${users.followersCount} + 1` })
            .where(eq(users.id, input.followId));
          await tx
            .update(users)
            .set({ followingCount: sql`${users.followingCount} + 1` })
            .where(eq(users.id, userId));
        });
      }
      return await ctx.db
        .insert(requests)
        .values({ requesterId: userId, requestedId: input.followId });
    }),

  unfollowUser: protectedProcedure
    .input(
      z.object({
        followId: z.string(),
        requested: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      if (input.requested) {
        return await ctx.db
          .delete(requests)
          .where(
            and(
              eq(requests.requesterId, userId),
              eq(requests.requestedId, input.followId)
            )
          );
      }
      return await ctx.db.transaction(async (tx) => {
        await tx
          .delete(follows)
          .where(
            and(
              eq(follows.followerId, userId),
              eq(follows.followedId, input.followId)
            )
          );
        await tx
          .update(users)
          .set({ followersCount: sql`${users.followersCount} - 1` })
          .where(eq(users.id, input.followId));
        await tx
          .update(users)
          .set({ followingCount: sql`${users.followingCount} - 1` })
          .where(eq(users.id, userId));
      });
    }),

  userFollowAction: protectedProcedure
    .input(
      z.object({
        followId: z.string(),
        accepts: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      if (input.accepts) {
        return await ctx.db.transaction(async (tx) => {
          await tx
            .delete(requests)
            .where(
              and(
                eq(requests.requesterId, userId),
                eq(requests.requestedId, input.followId)
              )
            );
          await tx
            .insert(follows)
            .values({ followerId: userId, followedId: input.followId });
          await tx
            .update(users)
            .set({ followersCount: sql`${users.followersCount} + 1` })
            .where(eq(users.id, input.followId));
          await tx
            .update(users)
            .set({ followingCount: sql`${users.followingCount} + 1` })
            .where(eq(users.id, userId));
        });
      }
      return await ctx.db
        .delete(requests)
        .where(
          and(
            eq(requests.requesterId, userId),
            eq(requests.requestedId, input.followId)
          )
        );
    }),

  getUserBookmarksPaginated: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        cursor: z.string().nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const currentId = ctx.auth?.userId;

      const { userId, cursor, amount } = input;

      const parsedCursor: highlightCursor | undefined = cursor
        ? decodeCursor(cursor)
        : undefined;

      const bookmarksFetch = await ctx.db.query.users.findFirst({
        where: userWhereArgs(currentId, userId, ctx.db),
        columns: {},
        with: {
          bookmarkedHighlights: {
            columns: {
              highlightId: true,
            },
          },
        },
      });

      const bookmarkIds =
        bookmarksFetch?.bookmarkedHighlights.map((val) => val.highlightId) ??
        [];

      if (!bookmarkIds.length)
        return {
          highlights: [],
          nextCursor: undefined,
          prevCursor: undefined,
        };

      const highlightsQuery = await ctx.db.query.highlight.findMany({
        where: and(
          inArray(highlight.id, bookmarkIds),
          cursorWhereArgs(parsedCursor)
        ),
        orderBy: orderByArgs(parsedCursor),
        limit: amount + 1,
        with: {
          ...(currentId
            ? {
                userBookmarks: {
                  where: eq(bookmarkedHighlightToUser.userId, currentId),
                  limit: 1,
                },
              }
            : {}),
          ...(currentId
            ? {
                userUpvotes: {
                  where: eq(upvotedHighlightToUser.userId, currentId),
                  limit: 1,
                },
              }
            : {}),
        },
      });

      const hasNext = highlightsQuery.length === amount + 1;

      if (hasNext) highlightsQuery.pop();

      const fullHighlights = highlightsQuery.map<HighlightReturn>(
        (highlight) => ({
          ...highlight,
          upvotes: highlight.upvotesCount ?? 0,
          bookmarked: highlight.userBookmarks
            ? highlight.userBookmarks.length > 0
            : false,
          upvoted: highlight.userUpvotes
            ? highlight.userUpvotes.length > 0
            : false,
        })
      );

      return packageThumbnailsPaginated(
        fullHighlights,
        hasNext,
        parsedCursor?.dir
      );
    }),

  getBookmarkVideosPaginated: publicProcedure
    .input(
      z.object({
        profileId: z.string(),
        initialCursor: z.number().nullish(),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const currentId = ctx.auth?.userId;

      const { profileId, cursor, initialCursor } = input;

      const amount = 1;

      const parsedCursor: highlightCursor | undefined = cursor
        ? decodeCursor(cursor)
        : undefined;

      const bookmarksFetch = await ctx.db.query.users.findFirst({
        where: userWhereArgs(currentId, profileId, ctx.db),
        columns: {},
        with: {
          bookmarkedHighlights: {
            columns: {
              highlightId: true,
            },
          },
        },
      });

      const bookmarkIds =
        bookmarksFetch?.bookmarkedHighlights.map((val) => val.highlightId) ??
        [];

      if (!bookmarkIds.length)
        return {
          highlights: [],
          nextCursor: undefined,
          prevCursor: undefined,
        };

      const highlightsQuery = await ctx.db.query.highlight.findMany({
        where: and(
          inArray(highlight.id, bookmarkIds),
          cursorWhereArgs(parsedCursor, initialCursor)
        ),
        orderBy: orderByArgs(parsedCursor),
        limit: amount + 1,
        with: {
          ...(currentId
            ? {
                userBookmarks: {
                  where: eq(bookmarkedHighlightToUser.userId, currentId),
                  limit: 1,
                },
              }
            : {}),
          ...(currentId
            ? {
                userUpvotes: {
                  where: eq(upvotedHighlightToUser.userId, currentId),
                  limit: 1,
                },
              }
            : {}),
        },
      });

      const hasNext = highlightsQuery.length === amount + 1;

      if (hasNext) highlightsQuery.pop();

      const fullHighlights = highlightsQuery.map<HighlightReturn>(
        (highlight) => ({
          ...highlight,
          upvotes: highlight.upvotesCount ?? 0,
          bookmarked: highlight.userBookmarks
            ? highlight.userBookmarks.length > 0
            : false,
          upvoted: highlight.userUpvotes
            ? highlight.userUpvotes.length > 0
            : false,
        })
      );
      return packageHighlightsPaginated(
        fullHighlights,
        hasNext,
        parsedCursor?.dir
      );
    }),

  getUserBookmarkedVideosPaginated: protectedProcedure
    .input(
      z.object({
        initialCursor: z.number().nullish(),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      const { cursor, initialCursor } = input;
      const amount = 1;

      const parsedCursor: highlightCursor | undefined = cursor
        ? decodeCursor(cursor)
        : undefined;

      const bookmarksFetch = ctx.db
        .select({
          bookmarkIds: bookmarkedHighlightToUser.highlightId,
        })
        .from(bookmarkedHighlightToUser)
        .where(eq(bookmarkedHighlightToUser.userId, userId));

      const highlightsQuery = await ctx.db.query.highlight.findMany({
        where: and(
          inArray(highlight.id, bookmarksFetch),
          cursorWhereArgs(parsedCursor, initialCursor)
        ),
        orderBy: orderByArgs(parsedCursor),
        limit: amount + 1,
        with: {
          userUpvotes: {
            where: eq(upvotedHighlightToUser.userId, userId),
            limit: 1,
          },
        },
      });

      const hasNext = highlightsQuery.length === amount + 1;

      if (hasNext) highlightsQuery.pop();

      const fullHighlights = highlightsQuery.map<HighlightReturn>(
        (highlight) => ({
          ...highlight,
          upvotes: highlight.upvotesCount ?? 0,
          bookmarked: true,
          upvoted: highlight.userUpvotes
            ? highlight.userUpvotes.length > 0
            : false,
        })
      );
      return packageHighlightsPaginated(
        fullHighlights,
        hasNext,
        parsedCursor?.dir
      );
    }),

  getUserLikesPaginated: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      const { cursor, amount } = input;

      const parsedCursor: highlightCursor | undefined = cursor
        ? decodeCursor(cursor)
        : undefined;

      const upvotedHighlightIds = ctx.db
        .select({
          upvoted: upvotedHighlightToUser.highlightId,
        })
        .from(upvotedHighlightToUser)
        .where(eq(upvotedHighlightToUser.userId, userId));

      const highlightsQuery = await ctx.db.query.highlight.findMany({
        where: and(
          inArray(highlight.id, upvotedHighlightIds),
          cursorWhereArgs(parsedCursor)
        ),
        orderBy: orderByArgs(parsedCursor),
        limit: amount + 1,
        with: {
          userBookmarks: {
            where: eq(bookmarkedHighlightToUser.userId, userId),
            limit: 1,
          },
        },
      });

      const hasNext = highlightsQuery.length === amount + 1;

      if (hasNext) highlightsQuery.pop();

      const fullHighlights = highlightsQuery.map<HighlightReturn>(
        (highlight) => {
          return {
            ...highlight,
            upvotes: highlight.upvotesCount ?? 0,
            bookmarked: highlight.userBookmarks
              ? highlight.userBookmarks.length > 0
              : false,
            upvoted: true,
          };
        }
      );
      return packageThumbnailsPaginated(
        fullHighlights,
        hasNext,
        parsedCursor?.dir
      );
    }),

  getLikedVideosPaginated: protectedProcedure
    .input(
      z.object({
        initialCursor: z.number().nullish(),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      const { cursor, initialCursor } = input;
      const amount = 1;

      const parsedCursor: highlightCursor | undefined = cursor
        ? decodeCursor(cursor)
        : undefined;

      const upvotedHighlightIds = ctx.db
        .select({
          upvoted: upvotedHighlightToUser.highlightId,
        })
        .from(upvotedHighlightToUser)
        .where(eq(upvotedHighlightToUser.userId, userId));

      const highlightsQuery = await ctx.db.query.highlight.findMany({
        where: and(
          inArray(highlight.id, upvotedHighlightIds),
          cursorWhereArgs(parsedCursor, initialCursor)
        ),
        orderBy: orderByArgs(parsedCursor),
        limit: amount + 1,
        with: {
          userBookmarks: {
            where: eq(bookmarkedHighlightToUser.userId, userId),
            limit: 1,
          },
        },
      });

      const hasNext = highlightsQuery.length === amount + 1;

      if (hasNext) highlightsQuery.pop();

      const fullHighlights = highlightsQuery.map<HighlightReturn>(
        (highlight) => {
          return {
            ...highlight,
            upvotes: highlight.upvotesCount ?? 0,
            bookmarked: highlight.userBookmarks
              ? highlight.userBookmarks.length > 0
              : false,
            upvoted: true,
          };
        }
      );
      return packageHighlightsPaginated(
        fullHighlights,
        hasNext,
        parsedCursor?.dir
      );
    }),
});
