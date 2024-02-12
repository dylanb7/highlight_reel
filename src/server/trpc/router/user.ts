/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { ProfileInfo, UserInfo } from "../../types/user-out";
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import type { FollowInfo, ReelInfo } from "../../types/pool-out";
import type { highlightCursor } from "../../../utils/highlight-utils";
import {
  addExt,
  decodeCursor,
  packageHighlightsPaginated,
  packageThumbnailsPaginated,
} from "../../../utils/highlight-utils";
import type { HighlightReturn } from "../../types/highlight-out";

import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  gte,
  inArray,
  lt,
  sql,
} from "drizzle-orm";
import type { HighlightPool, User } from "../../db/schema";
import {
  bookmarkedHighlightToUser,
  cameraAngle,
  highlight,
  userRelations,
} from "../../db/schema";
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
  type InferResultType,
  cursorWhereArgs,
  orderByArgs,
  publicToBool,
  userWhereArgs,
} from "../../../utils/drizzle-helpers";
import { MySqlSelect } from "drizzle-orm/mysql-core";

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
        public: input.public ? 1 : 0,
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
          followers: {
            columns: {
              followerId: true,
            },
          },
          follows: {
            columns: {
              followedId: true,
            },
          },
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
            following: profile.follows.length,
            followedBy: profile.followers.length,
            ...(ref
              ? {
                  followInfo: {
                    requested: profile.pending?.length > 0 ?? false,
                    follows: profile.followers.find(
                      (follower) => follower.followerId === ref
                    )
                      ? true
                      : false,
                  },
                }
              : {}),
            isPublic: publicToBool(profile.public),
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

      const innerPoolSelect = {
        where: () => {
          if (!cursor) return gte(poolsToFollowers.poolId, 0);
          return lt(poolsToFollowers.updatedAt, cursor);
        },
        limit: amount + 1,
        with: {
          pool: {
            with: {
              poolFollowers: {},
              cameras: {
                columns: {},
                with: {
                  highlights: {
                    columns: {
                      id: true,
                    },
                  },
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
            },
          },
        },

        orderBy: desc(poolsToFollowers.updatedAt),
      };

      const poolDataToInfo = (
        pool: HighlightPool & {
          cameras: {
            highlights: object[];
          }[];
          poolFollowers: {
            userId: string;
          }[];
          poolRequests: (
            | {
                poolId: number;
              }
            | Record<string, never>
          )[];
        }
      ): ReelInfo => {
        return {
          ...pool,
          highlightCount:
            pool.cameras
              ?.map((cam) => cam.highlights.length)
              .reduce((a, b) => a + b, 0) ?? 0,
          followerCount: pool.poolFollowers.length,
          followInfo: {
            follows: pool.poolFollowers.find((user) => user.userId === ref)
              ? true
              : false,
            requested: pool.poolRequests?.length > 0 ?? false,
          },
          isPublic: publicToBool(pool.public),
        };
      };

      if (type === "followed") {
        const pools = await ctx.db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {},
          with: {
            followedPools: innerPoolSelect,
          },
        });

        const hasNext = pools?.followedPools.length === amount + 1;

        if (hasNext) pools?.followedPools.pop();

        const poolsInfo =
          pools?.followedPools.map<ReelInfo>((followed) =>
            poolDataToInfo(followed.pool)
          ) ?? [];

        return {
          poolsInfo,
          nextCursor: hasNext
            ? pools?.followedPools[amount - 1]?.updatedAt
            : undefined,
        };
      }
      if (type === "modded") {
        const pools = await ctx.db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {},
          with: {
            moddedPools: innerPoolSelect,
          },
        });

        const hasNext = pools?.moddedPools.length === amount + 1;

        if (hasNext) pools?.moddedPools.pop();

        const poolsInfo =
          pools?.moddedPools.map<ReelInfo>((modded) =>
            poolDataToInfo(modded.pool)
          ) ?? [];
        return {
          poolsInfo,
          nextCursor: hasNext
            ? pools?.moddedPools[amount - 1]?.updatedAt
            : undefined,
        };
      }
      const pools = await ctx.db.query.users.findFirst({
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
              poolFollowers: {},
              cameras: {
                columns: {},
                with: {
                  highlights: {
                    columns: { id: true },
                  },
                },
              },
              ...(!owns && ref
                ? {
                    poolRequests: {
                      limit: 1,
                      where: eq(poolsToRequested.userId, ref),
                      columns: { poolId: true },
                    },
                  }
                : {}),
            },
            orderBy: desc(highlightPool.createdAt),
          },
        },
      });
      const hasNext = pools?.ownedPools.length === amount + 1;

      if (hasNext) pools?.ownedPools.pop();

      const poolsInfo =
        pools?.ownedPools.map<ReelInfo>((owned) => ({
          ...owned,
          highlightCount:
            owned.cameras
              ?.map((cam) => cam.highlights.length)
              .reduce((a, b) => a + b, 0) ?? [],
          followerCount: owned.poolFollowers.length,
          followInfo: {
            follows: owned.poolFollowers.find((user) => user.userId === ref)
              ? true
              : false,
            requested: owned.poolRequests?.length > 0 ?? false,
          },
          isPublic: publicToBool(owned.public),
        })) ?? [];
      return {
        poolsInfo,
        nextCursor: hasNext
          ? pools?.ownedPools[amount - 1]?.createdAt
          : undefined,
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
        return ctx.db
          .insert(upvotedHighlightToUser)
          .values({ userId: userId, highlightId: extId });
      }
      return await ctx.db
        .delete(upvotedHighlightToUser)
        .where(
          and(
            eq(upvotedHighlightToUser.userId, userId),
            eq(upvotedHighlightToUser.highlightId, extId)
          )
        );
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
        return await ctx.db
          .insert(poolsToFollowers)
          .values({ poolId: poolId, userId });
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
      return ctx.db
        .delete(poolsToFollowers)
        .where(
          and(
            eq(poolsToFollowers.userId, userId),
            eq(poolsToFollowers.poolId, input.reelId)
          )
        );
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
          isPublic: publicToBool(val.follower.public),
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
          isPublic: publicToBool(val.follower.public),
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
        return await ctx.db
          .insert(follows)
          .values({ followerId: userId, followedId: input.followId });
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
    .mutation(({ ctx, input }) => {
      const userId = ctx.auth.userId;
      if (input.requested) {
        return ctx.db
          .delete(requests)
          .where(
            and(
              eq(requests.requesterId, userId),
              eq(requests.requestedId, input.followId)
            )
          );
      }
      return ctx.db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, userId),
            eq(follows.followedId, input.followId)
          )
        );
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

      const usersSelect = ctx.db
        .select({ data: users.id })
        .from(users)
        .where(userWhereArgs(currentId, userId, ctx.db));

      const highlightSelect = await ctx.db
        .select({ highlight })
        .from(bookmarkedHighlightToUser)
        .innerJoin(
          highlight,
          eq(bookmarkedHighlightToUser.highlightId, highlight.id)
        )
        .where(
          and(
            inArray(bookmarkedHighlightToUser.userId, usersSelect),
            cursorWhereArgs(parsedCursor)
          )
        )
        .orderBy(...orderByArgs(parsedCursor))
        .limit(amount + 1);

      const hasNext = highlightSelect.length === amount + 1;

      if (hasNext) highlightSelect.pop();

      const highlightIds = highlightSelect.map<string>(
        (val) => val.highlight.id
      );

      if (highlightIds.length === 0)
        return {
          highlights: [],
          nextCursor: undefined,
          prevCursor: undefined,
        };

      if (currentId) {
        const highlightAdditions = await ctx.db
          .select({
            highlightId: upvotedHighlightToUser.highlightId,
            upvoteId: upvotedHighlightToUser.userId,
            bookmarkId: bookmarkedHighlightToUser.userId,
          })
          .from(upvotedHighlightToUser)
          .where(
            and(
              inArray(upvotedHighlightToUser.highlightId, highlightIds),
              eq(upvotedHighlightToUser.userId, currentId)
            )
          )
          .leftJoin(
            bookmarkedHighlightToUser,
            eq(bookmarkedHighlightToUser.userId, upvotedHighlightToUser.userId)
          );

        const cleaned = highlightAdditions.reduce<
          Record<string, { added: boolean; upvoted: boolean; upvotes: number }>
        >((acc, row) => {
          if (!acc[row.highlightId]) {
            acc[row.highlightId] = { added: false, upvoted: false, upvotes: 0 };
          }

          acc[row.highlightId]!.upvotes += 1;

          if (row.upvoteId === currentId) {
            acc[row.highlightId]!.upvoted = true;
          }

          if (row.bookmarkId === currentId) {
            acc[row.highlightId]!.added = true;
          }

          return acc;
        }, {});

        const fullHighlights = highlightSelect.map<HighlightReturn>((val) => {
          const highlight = val.highlight;
          const additions = cleaned[highlight.id];
          return {
            ...highlight,
            upvotes: additions?.upvotes ?? 0,
            bookmarked: additions?.added ?? false,
            upvoted: additions?.upvoted ?? false,
          };
        });
        return packageThumbnailsPaginated(
          fullHighlights,
          hasNext,
          parsedCursor?.dir
        );
      }

      const highlightAdditions = await ctx.db
        .select({
          id: upvotedHighlightToUser.highlightId,
          upvotes: count(upvotedHighlightToUser.userId),
        })
        .from(upvotedHighlightToUser)
        .where(inArray(upvotedHighlightToUser.highlightId, highlightIds));

      const highlightAdditionsMap = new Map<string, number>();

      for (const addition of highlightAdditions) {
        highlightAdditionsMap.set(addition.id, addition.upvotes);
      }

      const fullHighlights = highlightSelect.map<HighlightReturn>(
        (highlight) => {
          const additions = highlightAdditionsMap.get(highlight.highlight.id);
          return {
            ...highlight.highlight,
            upvotes: additions ?? 0,
            bookmarked: false,
            upvoted: false,
          };
        }
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
        profileId: z.string().cuid(),
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

      const usersSelect = ctx.db
        .select({ data: users.id })
        .from(users)
        .where(userWhereArgs(currentId, profileId, ctx.db));

      const highlightSelect = await ctx.db
        .select({ highlight })
        .from(bookmarkedHighlightToUser)
        .innerJoin(
          highlight,
          eq(bookmarkedHighlightToUser.highlightId, highlight.id)
        )
        .where(
          and(
            inArray(bookmarkedHighlightToUser.userId, usersSelect),
            cursorWhereArgs(parsedCursor, initialCursor)
          )
        )
        .orderBy(...orderByArgs(parsedCursor))
        .limit(amount + 1);

      const hasNext = highlightSelect.length === amount + 1;

      if (hasNext) highlightSelect.pop();

      const highlightIds = highlightSelect.map<string>(
        (val) => val.highlight.id
      );

      if (highlightIds.length === 0)
        return {
          highlights: [],
          nextCursor: undefined,
          prevCursor: undefined,
        };

      if (currentId) {
        const highlightAdditions = await ctx.db
          .select({
            highlightId: upvotedHighlightToUser.highlightId,
            upvoteId: upvotedHighlightToUser.userId,
            bookmarkId: bookmarkedHighlightToUser.userId,
          })
          .from(upvotedHighlightToUser)
          .where(inArray(upvotedHighlightToUser.highlightId, highlightIds))
          .leftJoin(
            bookmarkedHighlightToUser,
            and(
              eq(
                upvotedHighlightToUser.highlightId,
                bookmarkedHighlightToUser.highlightId
              ),
              eq(bookmarkedHighlightToUser.userId, currentId)
            )
          );

        const cleaned = highlightAdditions.reduce<
          Record<string, { added: boolean; upvoted: boolean; upvotes: number }>
        >((acc, row) => {
          if (!acc[row.highlightId]) {
            acc[row.highlightId] = { added: false, upvoted: false, upvotes: 0 };
          }

          acc[row.highlightId]!.upvotes += 1;

          if (row.upvoteId === currentId) {
            acc[row.highlightId]!.upvoted = true;
          }

          if (row.bookmarkId === currentId) {
            acc[row.highlightId]!.added = true;
          }

          return acc;
        }, {});

        const fullHighlights = highlightSelect.map<HighlightReturn>(
          (highlight) => {
            const additions = cleaned[highlight.highlight.id];
            return {
              ...highlight.highlight,
              upvotes: additions?.upvotes ?? 0,
              bookmarked: additions?.added ?? false,
              upvoted: additions?.upvoted ?? false,
            };
          }
        );
        return packageHighlightsPaginated(
          fullHighlights,
          hasNext,
          parsedCursor?.dir
        );
      }

      const highlightAdditions = await ctx.db
        .select({
          id: upvotedHighlightToUser.highlightId,
          upvotes: sql<number>`count(${upvotedHighlightToUser.userId})`,
        })
        .from(upvotedHighlightToUser)
        .where(inArray(upvotedHighlightToUser.highlightId, highlightIds));

      const highlightAdditionsMap = new Map<string, number>();

      for (const addition of highlightAdditions) {
        highlightAdditionsMap.set(addition.id, addition.upvotes);
      }

      const fullHighlights = highlightSelect.map<HighlightReturn>(
        (highlight) => {
          const additions = highlightAdditionsMap.get(highlight.highlight.id);
          return {
            ...highlight.highlight,
            upvotes: additions ?? 0,
            bookmarked: false,
            upvoted: false,
          };
        }
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

      const highlightSelect = await ctx.db
        .select({ highlight })
        .from(bookmarkedHighlightToUser)
        .innerJoin(
          highlight,
          eq(bookmarkedHighlightToUser.highlightId, highlight.id)
        )
        .where(
          and(
            eq(bookmarkedHighlightToUser.userId, userId),
            cursorWhereArgs(parsedCursor, initialCursor)
          )
        )
        .orderBy(...orderByArgs(parsedCursor))
        .limit(amount + 1);

      const hasNext = highlightSelect.length === amount + 1;

      if (hasNext) highlightSelect.pop();

      const highlightIds = highlightSelect.map<string>(
        (val) => val.highlight.id
      );

      if (highlightIds.length === 0)
        return {
          highlights: [],
          prevCursor: undefined,
          nextCursor: undefined,
        };

      const highlightAdditions = await ctx.db
        .select({
          highlightId: upvotedHighlightToUser.highlightId,
          upvoteId: upvotedHighlightToUser.userId,
        })
        .from(upvotedHighlightToUser)
        .where(inArray(upvotedHighlightToUser.highlightId, highlightIds));

      const cleaned = highlightAdditions.reduce<
        Record<string, { upvoted: boolean; upvotes: number }>
      >((acc, row) => {
        if (!acc[row.highlightId]) {
          acc[row.highlightId] = { upvoted: false, upvotes: 0 };
        }

        acc[row.highlightId]!.upvotes += 1;

        if (row.upvoteId === userId) {
          acc[row.highlightId]!.upvoted = true;
        }

        return acc;
      }, {});

      const fullHighlights = highlightSelect.map<HighlightReturn>(
        (highlight) => {
          const additions = cleaned[highlight.highlight.id];
          return {
            ...highlight.highlight,
            upvotes: additions?.upvotes ?? 0,
            bookmarked: true,
            upvoted: additions?.upvoted ?? false,
          };
        }
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

      const highlightSelect = await ctx.db
        .select({ highlight })
        .from(upvotedHighlightToUser)
        .innerJoin(
          highlight,
          eq(upvotedHighlightToUser.highlightId, highlight.id)
        )
        .where(
          and(
            eq(upvotedHighlightToUser.userId, userId),
            cursorWhereArgs(parsedCursor)
          )
        )
        .orderBy(...orderByArgs(parsedCursor))
        .limit(amount + 1);

      const hasNext = highlightSelect.length === amount + 1;

      if (hasNext) highlightSelect.pop();

      const highlightIds = highlightSelect.map<string>(
        (val) => val.highlight.id
      );

      const highlightAdditions = await ctx.db
        .select({
          highlightId: upvotedHighlightToUser.highlightId,
          upvoteId: upvotedHighlightToUser.userId,
          bookmarkId: bookmarkedHighlightToUser.userId,
        })
        .from(upvotedHighlightToUser)
        .where(inArray(upvotedHighlightToUser.highlightId, highlightIds))
        .leftJoin(
          bookmarkedHighlightToUser,
          and(
            eq(
              upvotedHighlightToUser.highlightId,
              bookmarkedHighlightToUser.highlightId
            ),
            eq(bookmarkedHighlightToUser.userId, userId)
          )
        );

      const cleaned = highlightAdditions.reduce<
        Record<string, { added: boolean; upvotes: number }>
      >((acc, row) => {
        if (!acc[row.highlightId]) {
          acc[row.highlightId] = { added: false, upvotes: 0 };
        }

        acc[row.highlightId]!.upvotes += 1;

        if (row.bookmarkId === userId) {
          acc[row.highlightId]!.added = true;
        }

        return acc;
      }, {});

      const fullHighlights = highlightSelect.map<HighlightReturn>(
        (highlight) => {
          const additions = cleaned[highlight.highlight.id];
          return {
            ...highlight.highlight,
            upvotes: additions?.upvotes ?? 0,
            bookmarked: true,
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

      const highlightSelect = await ctx.db
        .select({ highlight })
        .from(upvotedHighlightToUser)
        .innerJoin(
          highlight,
          eq(upvotedHighlightToUser.highlightId, highlight.id)
        )
        .where(
          and(
            eq(upvotedHighlightToUser.userId, userId),
            cursorWhereArgs(parsedCursor, initialCursor)
          )
        )
        .orderBy(...orderByArgs(parsedCursor))
        .limit(amount + 1);

      const hasNext = highlightSelect.length === amount + 1;

      if (hasNext) highlightSelect.pop();

      const highlightIds = highlightSelect.map<string>(
        (val) => val.highlight.id
      );

      const highlightAdditions = await ctx.db
        .select({
          highlightId: upvotedHighlightToUser.highlightId,
          upvoteId: upvotedHighlightToUser.userId,
          bookmarkId: bookmarkedHighlightToUser.userId,
        })
        .from(upvotedHighlightToUser)
        .where(inArray(upvotedHighlightToUser.highlightId, highlightIds))
        .leftJoin(
          bookmarkedHighlightToUser,
          and(
            eq(
              upvotedHighlightToUser.highlightId,
              bookmarkedHighlightToUser.highlightId
            ),
            eq(bookmarkedHighlightToUser.userId, userId)
          )
        );

      const cleaned = highlightAdditions.reduce<
        Record<string, { added: boolean; upvotes: number }>
      >((acc, row) => {
        if (!acc[row.highlightId]) {
          acc[row.highlightId] = { added: false, upvotes: 0 };
        }

        acc[row.highlightId]!.upvotes += 1;

        if (row.bookmarkId === userId) {
          acc[row.highlightId]!.added = true;
        }

        return acc;
      }, {});

      const fullHighlights = highlightSelect.map<HighlightReturn>(
        (highlight) => {
          const additions = cleaned[highlight.highlight.id];
          return {
            ...highlight.highlight,
            upvotes: additions?.upvotes ?? 0,
            bookmarked: additions?.added ?? false,
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
