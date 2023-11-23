import { z } from "zod";
import type { HighlightReturn } from "../../../types/highlight-out";

import type { PoolFollowing, PoolInfo } from "../../../types/pool-out";
import type { UserInfo } from "../../../types/user-out";
import {
  decodeCursor,
  groupHighlights,
  packageHighlightGroups,
  packageHighlightGroupsPaginated,
  packageThumbnailGroupsPaginated,
} from "../../../utils/highlight-utils";

import { router, protectedProcedure, publicProcedure } from "../trpc";
import type { NewHighlightPool } from "../../db/schema";
import {
  bookmarkedHighlightToUser,
  cameraAngle,
  highlight,
  highlightPool,
  poolsToFollowers,
  poolsToRequested,
} from "../../db/schema";
import { and, desc, eq, like, lt, lte, notInArray, inArray } from "drizzle-orm";
import {
  canViewPool,
  cursorWhereArgs,
  orderByArgs,
  publicToBool,
} from "../../../utils/drizzle-helpers";

export const poolRouter = router({
  getPoolById: publicProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      if (userId) {
        const poolInfo = await ctx.db.query.highlightPool.findFirst({
          where: eq(highlightPool.id, input),
          with: {
            poolFollowers: {
              columns: {
                userId: true,
              },
            },

            poolRequests: {
              where: eq(poolsToRequested.userId, userId),
              limit: 1,
            },
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
          },
        });
        return poolInfo
          ? ({
              ...poolInfo,
              followInfo: {
                follows: poolInfo.poolFollowers.find(
                  (val) => val.userId === userId
                )
                  ? true
                  : false,
                requested: poolInfo.poolRequests.length > 0,
              },
              highlightCount: poolInfo.cameras
                .map((cam) => cam.highlights.length)
                .reduce((a, b) => a + b, 0),
              followerCount: poolInfo.poolFollowers.length,
              isPublic: publicToBool(poolInfo.public),
            } as PoolInfo)
          : undefined;
      }
      const poolInfo = await ctx.db.query.highlightPool.findFirst({
        where: eq(highlightPool.id, input),
        with: {
          poolFollowers: {
            columns: {
              userId: true,
            },
          },
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
        },
      });
      return poolInfo
        ? ({
            ...poolInfo,
            followInfo: {
              follows: false,
              requested: false,
            },
            isPublic: publicToBool(poolInfo.public),
            highlightCount: poolInfo.cameras
              .map((cam) => cam.highlights.length)
              .reduce((a, b) => a + b, 0),
            followerCount: poolInfo.poolFollowers.length,
          } as PoolInfo)
        : undefined;
    }),

  createPool: protectedProcedure
    .input(
      z.object({
        poolName: z.string().min(2).max(25),
        public: z.boolean(),
        ownerId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) => {
      const newPool: NewHighlightPool = {
        name: input.poolName,
        public: input.public ? 1 : 0,
        ownerId: input.ownerId,
      };

      return ctx.db.insert(highlightPool).values(newPool);
    }),

  poolSearch: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const searchLimit = 15;
      if (userId) {
        const res = await ctx.db.query.highlightPool.findMany({
          where: like(highlightPool.name, input),
          with: {
            poolFollowers: {
              where: eq(poolsToFollowers.userId, userId),
              limit: 1,
            },
            poolRequests: {
              where: eq(poolsToRequested.userId, userId),
              limit: 1,
            },
          },
          limit: searchLimit,
        });
        return res.map<PoolFollowing>((poolData) => ({
          ...poolData,
          followInfo: {
            follows: poolData.poolFollowers.length > 0,
            requested: poolData.poolRequests.length > 0,
          },
        }));
      }
      return (
        await ctx.db.query.highlightPool.findMany({
          where: like(highlightPool.name, input),
          limit: searchLimit,
        })
      ).map<PoolFollowing>((poolData) => ({
        ...poolData,
        followInfo: {
          follows: false,
          requested: false,
        },
      }));
    }),

  getPublicPoolsPaginated: publicProcedure
    .input(
      z.object({
        cursor: z.date().nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const { cursor, amount } = input;
      const res = await ctx.db.query.highlightPool.findMany({
        where: () => {
          if (!userId && !cursor) return eq(highlightPool.public, 1);
          if (!userId) {
            return and(
              eq(highlightPool.public, 1),
              lt(highlightPool.createdAt, cursor!)
            );
          }

          const userFollows = ctx.db
            .select({ id: poolsToFollowers.poolId })
            .from(poolsToFollowers)
            .where(eq(poolsToFollowers.userId, userId));

          if (cursor) {
            return and(
              eq(highlightPool.public, 1),
              lt(highlightPool.createdAt, cursor),
              notInArray(highlight.id, userFollows)
            );
          }
          return and(
            eq(highlightPool.public, 1),
            notInArray(highlight.id, userFollows)
          );
        },
        with: {
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
          poolFollowers: {
            columns: {
              userId: true,
            },
          },
          ...(userId
            ? {
                poolRequests: {
                  where: eq(poolsToRequested.userId, userId),
                  limit: 1,
                },
              }
            : {}),
        },
        orderBy: [desc(highlightPool.createdAt)],
        limit: amount + 1,
      });

      const hasNext = res.length > amount;
      if (hasNext) res.pop();
      const poolsInfo: PoolInfo[] = res.map<PoolInfo>((pool) => {
        return {
          ...pool,
          followInfo: {
            follows: pool.poolFollowers.find((val) => val.userId === userId)
              ? true
              : false,
            requested: pool.poolRequests ? pool.poolRequests.length > 0 : false,
          },
          isPublic: publicToBool(pool.public),
          followerCount: pool.poolFollowers.length,
          highlightCount: pool.cameras
            .map((cam) => cam.highlights.length)
            .reduce((a, b) => a + b, 0),
        };
      });
      const nextCursor = hasNext
        ? poolsInfo[poolsInfo.length - 1]?.createdAt
        : undefined;
      return {
        poolsInfo,
        nextCursor,
      };
    }),

  getPoolHighlightsPaginated: publicProcedure
    .input(
      z.object({
        poolId: z.number(),
        cursor: z.string().nullish(),
        initialCursor: z.number().nullish(),
        angles: z.array(z.number()).nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const { poolId, cursor, amount, initialCursor, angles } = input;

      const parsedCursor = cursor ? decodeCursor(cursor) : undefined;

      const pool = await ctx.db.query.highlightPool.findFirst({
        where: canViewPool(userId, poolId, ctx.db),
        columns: { name: true },
        with: {
          cameras: {
            where: (fields) => {
              if (!angles) return undefined;
              return inArray(fields.id, angles);
            },
            columns: {},
            with: {
              highlights: {
                limit: amount + 1,
                where: cursorWhereArgs(parsedCursor, initialCursor),
                orderBy: orderByArgs(parsedCursor),
                with: {
                  userUpvotes: {
                    columns: {
                      userId: true,
                    },
                  },
                  ...(userId
                    ? {
                        userBookmarks: {
                          where: eq(bookmarkedHighlightToUser.userId, userId),
                        },
                      }
                    : {}),
                },
              },
            },
          },
        },
      });

      const completeHighlights =
        pool?.cameras.map((cam) =>
          cam.highlights.map<HighlightReturn>((highlight) => ({
            ...highlight,
            poolId: poolId,
            upvotes: highlight.userUpvotes.length,
            upvoted: highlight.userUpvotes.find(
              (upvote) => upvote.userId === userId
            )
              ? true
              : false,
            bookmarked: highlight.userBookmarks
              ? highlight.userBookmarks.length > 0
              : false,
          }))
        ) ?? [];

      const longestSublist = completeHighlights
        .sort((a, b) => b.length - a.length)
        .at(0)?.length;

      const hasNext = longestSublist ? longestSublist > amount : false;

      const groupedHighlights = groupHighlights(
        completeHighlights,
        amount,
        parsedCursor?.dir
      );

      return packageThumbnailGroupsPaginated(
        groupedHighlights,
        poolId,
        hasNext,
        parsedCursor?.dir
      );
    }),

  getHighlightBundle: publicProcedure
    .input(
      z.object({
        poolId: z.number(),
        cursor: z.number(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const { poolId, cursor, amount } = input;
      const bundle = await ctx.db.query.highlightPool.findFirst({
        where: canViewPool(userId, poolId, ctx.db),
        columns: { name: true },
        with: {
          cameras: {
            columns: {},
            with: {
              highlights: {
                where: and(lte(highlight.timestampUtc, cursor)),
                orderBy: [desc(highlight.timestampUtc)],
                limit: amount,
                with: {
                  userUpvotes: {
                    columns: {
                      userId: true,
                    },
                  },
                  ...(userId
                    ? {
                        userBookmarks: {
                          where: eq(bookmarkedHighlightToUser.userId, userId),
                        },
                      }
                    : {}),
                },
              },
            },
          },
        },
      });

      const completeHighlights =
        bundle?.cameras.map((cam) =>
          cam.highlights.map<HighlightReturn>((highlight) => ({
            ...highlight,
            upvotes: highlight.userUpvotes.length,
            upvoted: highlight.userUpvotes.find(
              (upvote) => upvote.userId === userId
            )
              ? true
              : false,
            bookmarked: highlight.userBookmarks
              ? highlight.userBookmarks.length > 0
              : false,
          }))
        ) ?? [];

      const grouped = groupHighlights(completeHighlights, amount);
      return {
        name: bundle?.name,
        highlights: await packageHighlightGroups(grouped, poolId),
      };
    }),

  getHighlightVideosPaginated: publicProcedure
    .input(
      z.object({
        poolId: z.number(),
        initialCursor: z.number().nullish(),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const { poolId, cursor, initialCursor } = input;

      const amount = 1;

      const parsedCursor = cursor ? decodeCursor(cursor) : undefined;

      const pool = await ctx.db.query.highlightPool.findFirst({
        where: canViewPool(userId, poolId, ctx.db),
        columns: { name: true },
        with: {
          cameras: {
            columns: {},
            with: {
              highlights: {
                where: cursorWhereArgs(parsedCursor, initialCursor),
                orderBy: orderByArgs(parsedCursor),
                limit: amount + 1,
                with: {
                  userUpvotes: {
                    columns: {
                      userId: true,
                    },
                  },
                  ...(userId
                    ? {
                        userBookmarks: {
                          where: eq(bookmarkedHighlightToUser.userId, userId),
                        },
                      }
                    : {}),
                },
              },
            },
          },
        },
      });

      const completeHighlights =
        pool?.cameras.map((cam) =>
          cam.highlights.map<HighlightReturn>((highlight) => ({
            ...highlight,
            upvotes: highlight.userUpvotes.length,
            upvoted: highlight.userUpvotes.find(
              (upvote) => upvote.userId === userId
            )
              ? true
              : false,
            bookmarked: highlight.userBookmarks
              ? highlight.userBookmarks.length > 0
              : false,
          }))
        ) ?? [];

      const longestSublist = completeHighlights
        .sort((a, b) => b.length - a.length)
        .at(0)?.length;

      const hasNext = longestSublist ? longestSublist > amount : false;

      const groups = groupHighlights(
        completeHighlights,
        amount,
        parsedCursor?.dir
      );

      return {
        name: pool?.name,
        ...(await packageHighlightGroupsPaginated(
          groups,
          poolId,
          hasNext,
          parsedCursor?.dir
        )),
      };
    }),

  getWristbands: publicProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const camsSelect = ctx.db
        .select({ cameraId: cameraAngle.id })
        .from(cameraAngle)
        .where(eq(cameraAngle.poolId, input));
      const bands = await ctx.db
        .selectDistinct({ bandId: highlight.wristbandId })
        .from(highlight)
        .where(inArray(highlight.cameraId, camsSelect));

      const bandValues: string[] = [];

      for (const band of bands) {
        if (band.bandId) bandValues.push(band.bandId);
      }

      return bandValues;
    }),

  getWristbandHighlightsPaginated: publicProcedure
    .input(
      z.object({
        poolId: z.number(),
        wristbandId: z.string(),
        initialCursor: z.number().nullish(),
        cursor: z.string().nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const { poolId, wristbandId, cursor, amount, initialCursor } = input;

      const parsedCursor = cursor ? decodeCursor(cursor) : undefined;

      const pool = await ctx.db.query.highlightPool.findFirst({
        where: canViewPool(userId, poolId, ctx.db),
        columns: { name: true },
        with: {
          cameras: {
            columns: {},
            with: {
              highlights: {
                where: and(
                  eq(highlight.wristbandId, wristbandId),
                  cursorWhereArgs(parsedCursor, initialCursor)
                ),
                orderBy: orderByArgs(parsedCursor),
                limit: amount + 1,
                with: {
                  userUpvotes: {
                    columns: {
                      userId: true,
                    },
                  },
                  ...(userId
                    ? {
                        userBookmarks: {
                          where: eq(bookmarkedHighlightToUser.userId, userId),
                        },
                      }
                    : {}),
                },
              },
            },
          },
        },
      });

      const completeHighlights =
        pool?.cameras.map((cam) =>
          cam.highlights.map<HighlightReturn>((highlight) => ({
            ...highlight,
            upvotes: highlight.userUpvotes.length,
            upvoted: highlight.userUpvotes.find(
              (upvote) => upvote.userId === userId
            )
              ? true
              : false,
            bookmarked: highlight.userBookmarks
              ? highlight.userBookmarks.length > 0
              : false,
          }))
        ) ?? [];

      const longestSublist = completeHighlights
        .sort((a, b) => b.length - a.length)
        .at(0)?.length;

      const hasNext = longestSublist ? longestSublist > amount : false;

      const groups = groupHighlights(
        completeHighlights,
        amount,
        parsedCursor?.dir
      );

      return packageThumbnailGroupsPaginated(
        groups,
        poolId,
        hasNext,
        parsedCursor?.dir
      );
    }),

  getWristbandVideosPaginated: publicProcedure
    .input(
      z.object({
        poolId: z.number(),
        wristbandId: z.string(),
        initialCursor: z.number().nullish(),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const { poolId, wristbandId, cursor, initialCursor } = input;

      const amount = 1;

      const parsedCursor = cursor ? decodeCursor(cursor) : undefined;

      const pool = await ctx.db.query.highlightPool.findFirst({
        where: canViewPool(userId, poolId, ctx.db),
        columns: { name: true },
        with: {
          cameras: {
            columns: {},
            with: {
              highlights: {
                where: and(
                  eq(highlight.wristbandId, wristbandId),
                  cursorWhereArgs(parsedCursor, initialCursor)
                ),
                orderBy: orderByArgs(parsedCursor),
                limit: amount + 1,
                with: {
                  userUpvotes: {
                    columns: {
                      userId: true,
                    },
                  },
                  ...(userId
                    ? {
                        userBookmarks: {
                          where: eq(bookmarkedHighlightToUser.userId, userId),
                        },
                      }
                    : {}),
                },
              },
            },
          },
        },
      });

      const completeHighlights =
        pool?.cameras.map((cam) =>
          cam.highlights.map<HighlightReturn>((highlight) => ({
            ...highlight,
            upvotes: highlight.userUpvotes.length,
            upvoted: highlight.userUpvotes.find(
              (upvote) => upvote.userId === userId
            )
              ? true
              : false,
            bookmarked: highlight.userBookmarks
              ? highlight.userBookmarks.length > 0
              : false,
          }))
        ) ?? [];

      const longestSublist = completeHighlights
        .sort((a, b) => b.length - a.length)
        .at(0)?.length;

      const hasNext = longestSublist ? longestSublist > amount : false;

      const groups = groupHighlights(
        completeHighlights,
        amount,
        parsedCursor?.dir
      );

      return {
        name: pool?.name,
        ...(await packageHighlightGroupsPaginated(
          groups,
          poolId,
          hasNext,
          parsedCursor?.dir
        )),
      };
    }),

  getWristbandHighlightBundle: publicProcedure
    .input(
      z.object({
        poolId: z.number(),
        bandId: z.string(),
        cursor: z.number(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const { poolId, cursor, amount, bandId } = input;
      const bundle = await ctx.db.query.highlightPool.findFirst({
        where: canViewPool(userId, poolId, ctx.db),
        columns: { name: true },
        with: {
          cameras: {
            columns: {},
            with: {
              highlights: {
                where: and(
                  eq(highlight.wristbandId, bandId),
                  lte(highlight.timestampUtc, cursor)
                ),
                orderBy: [desc(highlight.timestampUtc)],
                limit: amount,
                with: {
                  userUpvotes: {
                    columns: {
                      userId: true,
                    },
                  },
                  ...(userId
                    ? {
                        userBookmarks: {
                          where: eq(bookmarkedHighlightToUser.userId, userId),
                        },
                      }
                    : {}),
                },
              },
            },
          },
        },
      });
      const completeHighlights =
        bundle?.cameras.map((cam) =>
          cam.highlights.map<HighlightReturn>((highlight) => ({
            ...highlight,
            upvotes: highlight.userUpvotes.length,
            upvoted: highlight.userUpvotes.find(
              (upvote) => upvote.userId === userId
            )
              ? true
              : false,
            bookmarked: highlight.userBookmarks
              ? highlight.userBookmarks.length > 0
              : false,
          }))
        ) ?? [];

      const grouped = groupHighlights(completeHighlights, amount);

      return {
        name: bundle?.name,
        highlights: await packageHighlightGroups(grouped, poolId),
      };
    }),

  getPoolFollowers: publicProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const ref = ctx.auth?.userId;
      const res = await ctx.db.query.poolsToFollowers.findMany({
        where: eq(poolsToFollowers.poolId, input),
        columns: {},
        with: {
          user: {
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
      });
      return res.map<UserInfo>((val) => ({
        ...val.user,
        followInfo: {
          follows: val.user.followers?.length > 0 ?? false,
          requested: val.user.pending?.length > 0 ?? false,
        },
        isPublic: publicToBool(val.user.public),
      }));
    }),
});
