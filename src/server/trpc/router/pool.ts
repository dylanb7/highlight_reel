import { z } from "zod";

import { router, protectedProcedure, publicProcedure } from "../trpc";

export const poolRouter = router({
  getPoolById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.highlightPool.findFirst({ where: { id: input } });
    }),

  createPool: protectedProcedure
    .input(
      z.object({
        poolName: z.string(),
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

  getAllPublicPools: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.highlightPool.findMany({
      where: {
        public: true,
      },
      orderBy: {
        followers: {
          _count: "asc",
        },
      },
    });
  }),

  getPublicPoolsPaginated: publicProcedure
    .input(
      z.object({
        cursor: z.string().cuid().nullable(),
        amount: z.number(),
      })
    )
    .query(({ ctx, input }) => {
      if (!input.cursor) {
        return ctx.prisma.highlightPool.findMany({
          take: input.amount,
          where: {
            public: true,
          },
          orderBy: {
            followers: {
              _count: "desc",
            },
          },
        });
      }
      return ctx.prisma.highlightPool.findMany({
        take: input.amount,
        skip: 1,
        cursor: {
          id: input.cursor,
        },
        where: {
          public: true,
        },
        orderBy: {
          followers: {
            _count: "desc",
          },
        },
      });
    }),

  getPoolHighlights: publicProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        userId: z.string().cuid(),
        public: z.boolean(),
      })
    )
    .query(({ ctx, input }) => {
      if (input.public) {
        return ctx.prisma.highlightPool.findFirst({
          where: { id: input.poolId, public: true },
          select: {
            highlights: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });
      }
      return ctx.prisma.highlightPool.findFirst({
        where: {
          id: input.poolId,
          followers: {
            some: {
              userId: input.userId,
            },
          },
        },
        select: {
          highlights: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              _count: {
                select: {
                  upvotes: true,
                },
              },
            },
          },
        },
      });
    }),

  getPoolHighlightsPaginatedPublic: publicProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        userId: z.string().cuid(),
        cursor: z.string().cuid().nullable(),
        amount: z.number(),
      })
    )
    .query(({ ctx, input }) => {
      if (!input.cursor) {
        return ctx.prisma.highlightPool.findFirst({
          where: { id: input.poolId, public: true },
          select: {
            highlights: {
              orderBy: {
                createdAt: "asc",
              },
              include: {
                _count: {
                  select: {
                    upvotes: true,
                  },
                },
              },
              take: input.amount,
            },
          },
        });
      }
      return ctx.prisma.highlightPool.findFirst({
        where: { id: input.poolId, public: true },
        select: {
          highlights: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              _count: {
                select: {
                  upvotes: true,
                },
              },
            },
            cursor: {
              id: input.cursor,
            },
            take: input.amount,
            skip: 1,
          },
        },
      });
    }),

  getPoolHighlightsPaginatedPrivate: publicProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        userId: z.string().cuid(),
        cursor: z.string().cuid().nullable(),
        amount: z.number(),
      })
    )
    .query(({ ctx, input }) => {
      if (!input.cursor) {
        return ctx.prisma.highlightPool.findFirst({
          where: {
            id: input.poolId,
            followers: {
              some: {
                userId: input.userId,
              },
            },
          },
          select: {
            highlights: {
              orderBy: {
                createdAt: "asc",
              },
              include: {
                _count: {
                  select: {
                    upvotes: true,
                  },
                },
              },
              take: input.amount,
            },
          },
        });
      }
      return ctx.prisma.highlightPool.findFirst({
        where: {
          id: input.poolId,
          followers: {
            some: {
              userId: input.userId,
            },
          },
        },
        select: {
          highlights: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              _count: {
                select: {
                  upvotes: true,
                },
              },
            },
            cursor: {
              id: input.cursor,
            },
            take: input.amount,
            skip: 1,
          },
        },
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
