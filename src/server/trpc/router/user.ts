import { z } from "zod";

import { router, protectedProcedure } from "../trpc";

export const userRouter = router({
  fromId: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: {
          id: input,
        },
        include: {
          _count: {
            select: {
              following: true,
              followedBy: true,
            },
          },
        },
      });
    }),

  finishProfile: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(25),
        public: z.boolean(),
        userId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: {
          id: input.userId,
        },
        data: {
          public: input.public,
          username: input.username,
        },
      });
    }),

  profileQuery: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: {
          id: input,
        },
        include: {
          _count: {
            select: {
              following: true,
              followedBy: true,
            },
          },
          modPools: {
            include: {
              _count: {
                select: {
                  followers: true,
                  highlights: true,
                },
              },
              followers: {
                where: {
                  id: input,
                },
              },
              pending: {
                where: {
                  id: input,
                },
              },
            },
          },
          ownedPools: {
            include: {
              _count: {
                select: {
                  followers: true,
                  highlights: true,
                },
              },
              followers: {
                where: {
                  id: input,
                },
              },
              pending: {
                where: {
                  id: input,
                },
              },
            },
          },
        },
      });
    }),

  toggleHighlight: protectedProcedure
    .input(
      z.object({
        highlightId: z.string().cuid(),
        userId: z.string().cuid(),
        add: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (input.add) {
        return ctx.prisma.user.update({
          where: { id: input.userId },
          data: {
            highlights: {
              connect: {
                id: input.highlightId,
              },
            },
          },
        });
      }
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          highlights: {
            disconnect: {
              id: input.highlightId,
            },
          },
        },
      });
    }),

  getAllHighlights: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findFirst({
        where: { id: input },
        select: {
          highlights: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
    }),

  upvoteHighlight: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        highlightId: z.string().cuid(),
        liked: z.boolean().nullish(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { liked } = input;
      return ctx.prisma.user.update({
        where: {
          id: input.userId,
        },
        data: {
          upvotes: {
            connect: !liked
              ? {
                  id: input.highlightId,
                }
              : undefined,
            disconnect: liked
              ? {
                  id: input.highlightId,
                }
              : undefined,
          },
        },
      });
    }),

  addPool: protectedProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        userId: z.string().cuid(),
        isPublic: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { poolId, userId, isPublic } = input;
      return ctx.prisma.user.update({
        where: { id: userId },
        data: {
          pools: isPublic
            ? {
                connect: {
                  id: poolId,
                },
              }
            : undefined,
          poolRequests: !isPublic
            ? {
                connect: {
                  id: poolId,
                },
              }
            : undefined,
        },
      });
    }),

  removePoolRequest: protectedProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        userId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          poolRequests: {
            disconnect: {
              id: input.poolId,
            },
          },
        },
      });
    }),

  removePool: protectedProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        userId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          pools: {
            disconnect: {
              id: input.poolId,
            },
          },
        },
      });
    }),

  getOwnedPools: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: {
          id: input,
        },
        select: {
          ownedPools: true,
        },
      });
    }),

  getModPools: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: {
          id: input,
        },
        select: {
          modPools: true,
        },
      });
    }),

  getFollowers: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: {
          id: input,
        },
        select: {
          followedBy: true,
        },
      });
    }),

  getFollowing: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: {
          id: input,
        },
        select: {
          following: true,
        },
      });
    }),

  getPending: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: {
          id: input,
        },
        select: {
          pending: true,
        },
      });
    }),

  followUser: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        followId: z.string().cuid(),
        public: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (input.public) {
        return ctx.prisma.user.update({
          where: { id: input.userId },
          data: {
            following: {
              connect: {
                id: input.followId,
              },
            },
          },
        });
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          sentFollows: {
            connect: {
              id: input.followId,
            },
          },
        },
      });
    }),

  unfollowUser: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        followId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          following: {
            disconnect: {
              id: input.followId,
            },
          },
        },
      });
    }),

  userFollowAction: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        followId: z.string().cuid(),
        accepts: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (input.accepts) {
        return ctx.prisma.user.update({
          where: { id: input.userId },
          data: {
            pending: {
              disconnect: {
                id: input.followId,
              },
            },
            followedBy: {
              connect: {
                id: input.followId,
              },
            },
          },
        });
      }
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          pending: {
            disconnect: {
              id: input.followId,
            },
          },
        },
      });
    }),
});
