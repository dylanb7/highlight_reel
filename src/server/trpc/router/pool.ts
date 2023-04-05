import { z } from "zod";
import type { HighlightReturn } from "../../../types/highlight-out";

import type { PoolInfo } from "../../../types/pool-out";
import type { UserInfo } from "../../../types/user-out";
import {
  addUnathedProps,
  packageHighlights,
  packageHighlightsPaginated,
  packageThumbnailsPaginated,
} from "../../../utils/highlightUtils";

import { router, protectedProcedure, publicProcedure } from "../trpc";

export const poolRouter = router({
  getPoolById: publicProcedure
    .input(z.string().cuid())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (userId) {
        const pool = await ctx.prisma.highlightPool.findUnique({
          where: { id: input },
          include: {
            _count: {
              select: {
                highlights: true,
                followers: true,
              },
            },
            followers: {
              where: {
                id: userId,
              },
            },
            pending: {
              where: {
                id: userId,
              },
            },
          },
        });
        return pool
          ? <PoolInfo>{
              ...pool,
              followInfo: {
                follows: pool.followers.length > 0,
                requested: pool.pending.length > 0,
              },
              followerCount: pool._count.followers,
              highlightCount: pool._count.highlights,
            }
          : undefined;
      }
      const pool = await ctx.prisma.highlightPool.findUnique({
        where: { id: input },
        include: {
          _count: {
            select: {
              highlights: true,
              followers: true,
            },
          },
        },
      });

      return pool
        ? <PoolInfo>{
            ...pool,
            followInfo: {
              follows: false,
              requested: false,
            },
            followerCount: pool._count.followers,
            highlightCount: pool._count.highlights,
          }
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
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (userId) {
        return ctx.prisma.highlightPool.findMany({
          where: {
            name: {
              contains: input,
            },
          },
          include: {
            followers: {
              where: {
                id: userId,
              },
            },
          },
        });
      }
      const pools = await ctx.prisma.highlightPool.findMany({
        where: {
          name: {
            contains: input,
          },
        },
      });
      return pools
        ? pools.map((pool) => {
            return { ...pool, followers: [] };
          })
        : [];
    }),

  getPublicPoolsPaginated: publicProcedure
    .input(
      z.object({
        cursor: z.string().cuid().nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const { cursor, amount } = input;
      if (userId) {
        const pools = await ctx.prisma.highlightPool.findMany({
          take: amount + 1,
          cursor: cursor ? { id: cursor } : undefined,
          where: {
            public: true,
            followers: {
              none: {
                id: userId,
              },
            },
          },
          include: {
            _count: {
              select: {
                highlights: true,
                followers: true,
              },
            },
            followers: {
              where: {
                id: userId,
              },
            },
            pending: {
              where: {
                id: userId,
              },
            },
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
      }
      const pools = await ctx.prisma.highlightPool.findMany({
        take: amount + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          public: true,
        },
        include: {
          _count: {
            select: {
              highlights: true,
              followers: true,
            },
          },
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
            follows: false,
            requested: false,
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
        cursor: z.string().nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const { poolId, cursor, amount } = input;
      let ret: HighlightReturn;
      if (userId) {
        ret = (
          await ctx.prisma.highlightPool.findFirst({
            where: {
              OR: [
                {
                  public: true,
                },
                {
                  followers: {
                    some: {
                      id: userId,
                    },
                  },
                },
              ],
              AND: {
                id: poolId,
              },
            },
            select: {
              highlights: {
                orderBy: {
                  timestampUTC: "desc",
                },
                include: {
                  _count: {
                    select: {
                      upvotes: true,
                    },
                  },
                  upvotes: {
                    where: {
                      id: userId,
                    },
                  },
                  addedBy: {
                    where: {
                      id: userId,
                    },
                  },
                },

                take: amount + 1,
                cursor: cursor
                  ? {
                      id: cursor,
                    }
                  : undefined,
              },
            },
          })
        )?.highlights;
      } else {
        const rawPool = await ctx.prisma.highlightPool.findFirst({
          where: {
            id: poolId,
            public: true,
          },
          select: {
            highlights: {
              orderBy: {
                timestampUTC: "desc",
              },
              include: {
                _count: {
                  select: {
                    upvotes: true,
                  },
                },
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
        ret = addUnathedProps(rawPool?.highlights);
      }
      return packageThumbnailsPaginated(amount, ret, cursor);
    }),

  getHighlightBundle: publicProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        cursor: z.string(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const { poolId, cursor, amount } = input;
      let ret: { highlights: HighlightReturn; name: string | null } | null;
      if (userId) {
        ret = await ctx.prisma.highlightPool.findFirst({
          where: {
            OR: [
              {
                public: true,
              },
              {
                followers: {
                  some: {
                    id: userId,
                  },
                },
              },
            ],
            AND: {
              id: poolId,
            },
          },
          select: {
            name: true,
            highlights: {
              orderBy: {
                timestampUTC: "desc",
              },
              include: {
                _count: {
                  select: {
                    upvotes: true,
                  },
                },
                upvotes: {
                  where: {
                    id: userId,
                  },
                },
                addedBy: {
                  where: {
                    id: userId,
                  },
                },
              },

              take: amount,
              cursor: { id: cursor },
            },
          },
        });
      } else {
        const rawHighlights = await ctx.prisma.highlightPool.findFirst({
          where: {
            id: poolId,
            public: true,
          },
          select: {
            name: true,
            highlights: {
              orderBy: {
                timestampUTC: "desc",
              },
              include: {
                _count: {
                  select: {
                    upvotes: true,
                  },
                },
              },

              take: amount,
              cursor: {
                id: cursor,
              },
            },
          },
        });
        ret = {
          name: rawHighlights?.name ?? null,
          highlights: addUnathedProps(rawHighlights?.highlights),
        };
      }
      return {
        name: ret?.name ?? null,
        highlights: await packageHighlights(ret?.highlights),
      };
    }),

  getHighlightVideosPaginated: publicProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        initialCursor: z.string().nullish(),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const { poolId, cursor, initialCursor } = input;
      const amount = 1;
      let ret: HighlightReturn;
      if (userId) {
        ret = (
          await ctx.prisma.highlightPool.findFirst({
            where: {
              OR: [
                {
                  public: true,
                },
                {
                  followers: {
                    some: {
                      id: userId,
                    },
                  },
                },
              ],
              AND: {
                id: poolId,
              },
            },
            select: {
              highlights: {
                orderBy: {
                  timestampUTC: "desc",
                },
                include: {
                  _count: {
                    select: {
                      upvotes: true,
                    },
                  },
                  upvotes: {
                    where: {
                      id: userId,
                    },
                  },
                  addedBy: {
                    where: {
                      id: userId,
                    },
                  },
                },

                take: amount + 1,
                cursor: initialCursor
                  ? {
                      id: cursor ?? initialCursor,
                    }
                  : undefined,
              },
            },
          })
        )?.highlights;
      } else {
        const rawPool = await ctx.prisma.highlightPool.findFirst({
          where: {
            id: poolId,
            public: true,
          },
          select: {
            name: true,
            highlights: {
              include: {
                _count: {
                  select: {
                    upvotes: true,
                  },
                },
              },

              take: amount + 1,
              cursor: initialCursor
                ? {
                    id: cursor ?? initialCursor,
                  }
                : undefined,
            },
          },
        });
        ret = addUnathedProps(rawPool?.highlights);
      }
      return await packageHighlightsPaginated(amount, ret, cursor);
    }),

  getPoolFollowers: publicProcedure
    .input(z.string().cuid())
    .query(async ({ ctx, input }) => {
      const ref = ctx.session?.user?.id;
      if (ref) {
        const res = await ctx.prisma.highlightPool.findUnique({
          where: {
            id: input,
          },
          select: {
            followers: {
              include: {
                followedBy: {
                  where: {
                    id: ref,
                  },
                },
                pending: {
                  where: {
                    id: ref,
                  },
                },
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
      }
      const res = await ctx.prisma.highlightPool.findUnique({
        where: {
          id: input,
        },
        select: {
          followers: true,
        },
      });
      if (!res) return [];
      return res.followers.map<UserInfo>((val) => {
        return {
          ...val,
          follows: false,
          requested: false,
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
