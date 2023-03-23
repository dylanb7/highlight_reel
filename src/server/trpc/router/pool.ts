import type { Highlight, User } from "@prisma/client";

import { z } from "zod";
import {
  fetchS3Highlight,
  type HighlightFetchInfo,
} from "../../../types/highlight-out";
import type { PoolInfo } from "../../../types/pool-out";
import type { UserInfo } from "../../../types/user-out";

import { router, protectedProcedure, publicProcedure } from "../trpc";

export const poolRouter = router({
  getPoolById: publicProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        userId: z.string().cuid().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const pool = await ctx.prisma.highlightPool.findUnique({
        where: { id: input.poolId },
        include: {
          _count: {
            select: {
              highlights: true,
              followers: true,
            },
          },
          followers: input.userId
            ? {
                where: {
                  id: input.userId,
                },
              }
            : undefined,
          pending: input.userId
            ? {
                where: {
                  id: input.userId,
                },
              }
            : undefined,
        },
      });
      if (!pool) return undefined;
      return <PoolInfo>{
        ...pool,
        followInfo: {
          follows: pool.followers.length > 0,
          requested: pool.pending.length > 0,
        },
        followerCount: pool._count.followers,
        highlightCount: pool._count.highlights,
      };
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
      return ctx.prisma.highlightPool.create({
        data: {
          owner: {
            connect: {
              id: input.ownerId,
            },
          },
          public: input.public,
          name: input.poolName,
        },
      });
    }),

  poolSearch: publicProcedure
    .input(
      z.object({
        searchTerm: z.string(),
        id: z.string().cuid().nullish(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.highlightPool.findMany({
        where: {
          name: {
            contains: input.searchTerm,
          },
        },
        include: {
          followers: input.id
            ? {
                where: {
                  id: input.id,
                },
              }
            : undefined,
        },
      });
    }),

  getPublicPoolsPaginated: publicProcedure
    .input(
      z.object({
        cursor: z.string().cuid().nullish(),
        amount: z.number(),
        userId: z.string().cuid().nullish(),
        dicover: z.boolean().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, amount } = input;
      const pools = await ctx.prisma.highlightPool.findMany({
        take: amount + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          public: true,
          followers: input.dicover
            ? {
                none: {
                  id: input.userId ?? undefined,
                },
              }
            : undefined,
        },
        include: {
          _count: {
            select: {
              highlights: true,
              followers: true,
            },
          },
          followers: input.userId
            ? {
                where: {
                  id: input.userId,
                },
              }
            : undefined,
          pending: input.userId
            ? {
                where: {
                  id: input.userId,
                },
              }
            : undefined,
        },
        orderBy: {
          followers: {
            _count: "desc",
          },
        },
      });
      let nextCursor: typeof cursor | undefined = undefined;
      if (pools.length > input.amount && pools.length > 0) {
        const extra = pools.pop();
        nextCursor = extra?.id;
      }

      const info: PoolInfo[] = pools.map<PoolInfo>((pool) => {
        return {
          ...pool,
          followInfo: {
            follows: pool.followers.length > 0,
            requested: pool.pending.length > 0,
          },

          followerCount: pool._count.followers,
          highlightCount: pool._count.highlights,
        };
      });
      return {
        info,
        nextCursor,
      };
    }),

  getPoolHighlightsPaginated: publicProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        userId: z.string().cuid().nullish(),
        isPublic: z.boolean(),
        cursor: z.string().nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { poolId, userId, isPublic, cursor, amount } = input;
      const ret: {
        highlights: (Highlight & {
          _count: {
            upvotes: number;
          };
          upvotes: User[];
          addedBy: User[];
        })[];
      } | null = await ctx.prisma.highlightPool.findFirst({
        where: {
          id: poolId,
          followers:
            !isPublic && userId
              ? {
                  some: {
                    id: userId,
                  },
                }
              : undefined,
          public: isPublic ? true : undefined,
        },
        select: {
          highlights: {
            orderBy: {
              timestampUTC: "asc",
            },
            include: {
              _count: {
                select: {
                  upvotes: true,
                },
              },
              upvotes: userId
                ? {
                    where: {
                      id: userId,
                    },
                  }
                : undefined,
              addedBy: userId
                ? {
                    where: {
                      id: userId,
                    },
                  }
                : undefined,
            },

            take: amount + 1,
            cursor: cursor
              ? {
                  id: cursor,
                }
              : undefined,
          },
        },
      });

      const rawHighlights = ret?.highlights ?? [];

      let nextCursor: typeof cursor | undefined = undefined;

      if (rawHighlights.length > amount && rawHighlights.length > 0) {
        const extra = rawHighlights.pop();
        nextCursor = extra?.id;
      }

      const highlights: HighlightFetchInfo[] = [];

      for (const rawHighlight of rawHighlights) {
        const url = await fetchS3Highlight({
          s3bucket: rawHighlight.s3bucket ?? "",
          id: rawHighlight.id,
        });
        highlights.push({
          ...rawHighlight,
          upvotes: rawHighlight._count.upvotes,
          bookmarked: rawHighlight.addedBy.length > 0,
          upvoted: rawHighlight.upvotes.length > 0,
          url: url,
        });
      }

      return {
        highlights,
        nextCursor,
      };
    }),

  getPoolFollowers: publicProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        refId: z.string().cuid().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const res = await ctx.prisma.highlightPool.findUnique({
        where: {
          id: input.poolId,
        },
        select: {
          followers: {
            include: {
              followedBy: input.refId
                ? {
                    where: {
                      id: input.refId,
                    },
                  }
                : undefined,
              pending: input.refId
                ? {
                    where: {
                      id: input.refId,
                    },
                  }
                : undefined,
            },
          },
        },
      });
      if (!res) return [];
      return res.followers.map<UserInfo>((val) => {
        return {
          ...val,
          follows: val.followedBy.length > 0,
          requested: val.pending.length > 0,
        };
      });
    }),
});

/*
count relations
include: {
    _count: {
        select: {
            upvotes: true
        }
    }
},
*/
