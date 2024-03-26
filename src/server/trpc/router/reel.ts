import { z } from "zod";
import type { HighlightReturn } from "../../types/highlight-out";

import type { ReelFollowing, ReelInfo } from "../../types/pool-out";
import type { UserInfo } from "../../types/user-out";
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
  upvotedHighlightToUser,
} from "../../db/schema";
import {
  and,
  desc,
  eq,
  like,
  lt,
  lte,
  notInArray,
  inArray,
  gt,
  asc,
} from "drizzle-orm";
import {
  canViewPool,
  cursorWhereArgs,
  orderByArgs,
} from "../../../utils/drizzle-helpers";

export const reelRouter = router({
  getReelById: publicProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      if (userId) {
        const poolInfo = await ctx.db.query.highlightPool.findFirst({
          where: eq(highlightPool.id, input),
          with: {
            poolFollowers: {
              where: eq(poolsToFollowers.userId, userId),
              limit: 1,
            },

            poolRequests: {
              where: eq(poolsToRequested.userId, userId),
              limit: 1,
            },
            cameras: {
              columns: {
                highlightsCount: true,
              },
            },
          },
        });
        return poolInfo
          ? ({
              ...poolInfo,
              followInfo: {
                follows: poolInfo.poolFollowers.length > 0,
                requested: poolInfo.poolRequests.length > 0,
              },
              highlightCount: poolInfo.cameras
                .map((cam) => cam.highlightsCount ?? 0)
                .reduce((a, b) => a + b),
              followerCount: poolInfo.followersCount,
              isPublic: poolInfo.public,
            } as ReelInfo)
          : undefined;
      }
      const poolInfo = await ctx.db.query.highlightPool.findFirst({
        where: eq(highlightPool.id, input),
        with: {
          cameras: {
            columns: { highlightsCount: true },
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
            isPublic: poolInfo.public,
            highlightCount: poolInfo.cameras
              .map((cam) => cam.highlightsCount ?? 0)
              .reduce((a, b) => a + b),
            followerCount: poolInfo.followersCount,
          } as ReelInfo)
        : undefined;
    }),

  createReel: protectedProcedure
    .input(
      z.object({
        reelName: z.string().min(2).max(25),
        public: z.boolean(),
        ownerId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) => {
      const newPool: NewHighlightPool = {
        name: input.reelName,
        public: input.public,
        ownerId: input.ownerId,
      };

      return ctx.db.insert(highlightPool).values(newPool);
    }),

  reelSearch: publicProcedure
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
        return res.map<ReelFollowing>((poolData) => ({
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
      ).map<ReelFollowing>((poolData) => ({
        ...poolData,
        followInfo: {
          follows: false,
          requested: false,
        },
      }));
    }),

  getPublicReelsPaginated: publicProcedure
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
          if (!userId && !cursor) return eq(highlightPool.public, true);
          if (!userId) {
            return and(
              eq(highlightPool.public, true),
              lt(highlightPool.createdAt, cursor!)
            );
          }

          const userFollows = ctx.db
            .select({ id: poolsToFollowers.poolId })
            .from(poolsToFollowers)
            .where(eq(poolsToFollowers.userId, userId));

          if (cursor) {
            return and(
              eq(highlightPool.public, true),
              lt(highlightPool.createdAt, cursor),
              notInArray(highlight.id, userFollows)
            );
          }
          return and(
            eq(highlightPool.public, true),
            notInArray(highlight.id, userFollows)
          );
        },
        with: {
          ...(userId
            ? {
                poolFollowers: {
                  where: eq(poolsToFollowers.userId, userId),
                  limit: 1,
                },
              }
            : {}),
          ...(userId
            ? {
                poolRequests: {
                  where: eq(poolsToRequested.userId, userId),
                  limit: 1,
                },
              }
            : {}),
          cameras: {
            columns: {
              highlightsCount: true,
            },
          },
        },
        orderBy: [desc(highlightPool.createdAt)],
        limit: amount + 1,
      });

      const hasNext = res.length > amount;
      if (hasNext) res.pop();
      const poolsInfo: ReelInfo[] = res.map<ReelInfo>((pool) => {
        return {
          ...pool,
          followInfo: {
            follows: pool.poolFollowers ? pool.poolFollowers.length > 0 : false,
            requested: pool.poolRequests ? pool.poolRequests.length > 0 : false,
          },
          isPublic: pool.public,
          followerCount: pool.followersCount ?? 0,
          highlightCount:
            pool.cameras
              .map((cam) => cam.highlightsCount ?? 0)
              .reduce((total, curr) => total + curr) ?? 0,
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

  getReelHighlightsPaginated: publicProcedure
    .input(
      z.object({
        reelId: z.number(),
        cursor: z.string().nullish(),
        initialCursor: z.number().nullish(),
        angles: z.array(z.number()).nullish(),
        wristbands: z.array(z.string()).nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const {
        reelId: poolId,
        cursor,
        amount,
        initialCursor,
        angles,
        wristbands,
      } = input;

      const parsedCursor = cursor ? decodeCursor(cursor) : undefined;

      const pool = await ctx.db.query.highlightPool.findFirst({
        where: canViewPool(userId, poolId, ctx.db),
        columns: { name: true },
        with: {
          cameras: {
            where: angles
              ? () => {
                  return inArray(cameraAngle.id, angles);
                }
              : undefined,
            columns: {},
            with: {
              highlights: {
                limit: amount + 1,
                where: () => {
                  if (wristbands)
                    return and(
                      cursorWhereArgs(parsedCursor, initialCursor),
                      inArray(highlight.wristbandId, wristbands)
                    );
                  return cursorWhereArgs(parsedCursor, initialCursor);
                },
                orderBy: orderByArgs(parsedCursor),
                with: {
                  ...(userId
                    ? {
                        userUpvotes: {
                          where: eq(upvotedHighlightToUser.userId, userId),
                          limit: 1,
                        },
                      }
                    : {}),

                  ...(userId
                    ? {
                        userBookmarks: {
                          where: eq(bookmarkedHighlightToUser.userId, userId),
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

      console.log(pool);
      const completeHighlights =
        pool?.cameras.map((cam) =>
          cam.highlights.map<HighlightReturn>((highlight) => ({
            ...highlight,
            poolId: poolId,
            upvotes: highlight.upvotesCount ?? 0,
            upvoted: highlight.userUpvotes
              ? highlight.userUpvotes.length > 0
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

  getHighlightVideosPaginated: publicProcedure
    .input(
      z.object({
        reelId: z.number(),
        initialCursor: z.number().nullish(),
        cursor: z.string().nullish(),
        bands: z.array(z.string()).nullish(),
        angles: z.array(z.number()).nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const { reelId: poolId, cursor, initialCursor, bands, angles } = input;

      const amount = 1;

      const parsedCursor = cursor ? decodeCursor(cursor) : undefined;

      let hasPrev: boolean | undefined = undefined;

      if (parsedCursor === undefined && initialCursor) {
        const prev = await ctx.db.query.highlightPool.findFirst({
          where: canViewPool(userId, poolId, ctx.db),
          columns: {},
          with: {
            cameras: {
              where: angles ? inArray(cameraAngle.id, angles) : undefined,
              columns: {},
              with: {
                highlights: {
                  columns: { id: true },
                  where: () => {
                    if (bands)
                      return and(
                        gt(highlight.timestampUtc, initialCursor),
                        inArray(highlight.wristbandId, bands)
                      );
                    return gt(highlight.timestampUtc, initialCursor);
                  },
                  orderBy: [asc(highlight.timestampUtc), asc(highlight.id)],
                  limit: 1,
                },
              },
            },
          },
        });
        hasPrev = (prev?.cameras.length ?? 0) > 0;
      }

      const pool = await ctx.db.query.highlightPool.findFirst({
        where: canViewPool(userId, poolId, ctx.db),
        columns: { name: true },
        with: {
          cameras: {
            where: angles ? inArray(cameraAngle.id, angles) : undefined,
            columns: {},
            with: {
              highlights: {
                where: () => {
                  if (bands)
                    return and(
                      cursorWhereArgs(parsedCursor, initialCursor),
                      inArray(highlight.wristbandId, bands)
                    );
                  return cursorWhereArgs(parsedCursor, initialCursor);
                },
                orderBy: orderByArgs(parsedCursor),
                limit: amount + 1,
                with: {
                  ...(userId
                    ? {
                        userUpvotes: {
                          where: eq(upvotedHighlightToUser.userId, userId),
                          limit: 1,
                        },
                      }
                    : {}),
                  ...(userId
                    ? {
                        userBookmarks: {
                          where: eq(bookmarkedHighlightToUser.userId, userId),
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

      const completeHighlights =
        pool?.cameras.map((cam) =>
          cam.highlights.map<HighlightReturn>((highlight) => ({
            ...highlight,
            upvotes: highlight.upvotesCount ?? 0,
            upvoted: highlight.userUpvotes
              ? highlight.userUpvotes.length > 0
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
          parsedCursor?.dir,
          hasPrev
        )),
      };
    }),

  getHighlightBundle: publicProcedure
    .input(
      z.object({
        reelId: z.number(),
        cursor: z.number(),
        amount: z.number(),
        bands: z.array(z.string()).nullish(),
        angles: z.array(z.number()).nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth?.userId;
      const { reelId: poolId, cursor, amount, angles, bands } = input;
      const bundle = await ctx.db.query.highlightPool.findFirst({
        where: canViewPool(userId, poolId, ctx.db),
        columns: { name: true },
        with: {
          cameras: {
            columns: {},
            where: angles
              ? () => {
                  return inArray(cameraAngle.id, angles);
                }
              : undefined,
            with: {
              highlights: {
                where: () => {
                  if (bands)
                    return and(
                      lte(highlight.timestampUtc, cursor),
                      inArray(highlight.wristbandId, bands)
                    );
                  return lte(highlight.timestampUtc, cursor);
                },
                orderBy: [desc(highlight.timestampUtc)],
                limit: amount,
                with: {
                  ...(userId
                    ? {
                        userUpvotes: {
                          where: eq(upvotedHighlightToUser.userId, userId),
                          limit: 1,
                        },
                      }
                    : {}),
                  ...(userId
                    ? {
                        userBookmarks: {
                          where: eq(bookmarkedHighlightToUser.userId, userId),
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

      const completeHighlights =
        bundle?.cameras.map((cam) =>
          cam.highlights.map<HighlightReturn>((highlight) => ({
            ...highlight,
            upvotes: highlight.upvotesCount ?? 0,
            upvoted: highlight.userUpvotes
              ? highlight.userUpvotes.length > 0
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

  getReelFollowers: publicProcedure
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
        isPublic: val.user.public ?? false,
      }));
    }),
});
