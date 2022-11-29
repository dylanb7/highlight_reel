import { z } from "zod";

import { router, protectedProcedure } from "../trpc";

export const profileRouter = router({
  getProfileByUserId: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.profile.findUnique({ where: { userId: input } });
    }),

  createProfile: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(25),
        public: z.boolean(),
        userId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) => {
      ctx.prisma.profile.create({
        data: {
          user: {
            connect: {
              id: input.userId,
            },
          },
          public: input.public,
          username: input.username,
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
        return ctx.prisma.profile.update({
          where: { userId: input.userId },
          data: {
            highlights: {
              connect: {
                id: input.highlightId,
              },
            },
          },
        });
      }
      return ctx.prisma.profile.update({
        where: { userId: input.userId },
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
      return ctx.prisma.profile.findFirst({
        where: { userId: input },
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
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.profile.update({
        where: {
          userId: input.userId,
        },
        data: {
          upvotes: {
            connect: {
              id: input.highlightId,
            },
          },
        },
      });
    }),

  addPool: protectedProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        userId: z.string().cuid(),
        public: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (input.public) {
        return ctx.prisma.profile.update({
          where: { userId: input.userId },
          data: {
            pools: {
              connect: {
                id: input.poolId,
              },
            },
          },
        });
      }
      return ctx.prisma.profile.update({
        where: { userId: input.userId },
        data: {
          poolRequests: {
            connect: {
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
      return ctx.prisma.profile.update({
        where: { userId: input.userId },
        data: {
          pools: {
            disconnect: {
              id: input.poolId,
            },
          },
        },
      });
    }),

  getAllPools: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.profile.findUnique({
        where: { userId: input },
        select: {
          pools: {
            orderBy: {
              followers: {
                _count: "asc",
              },
            },
          },
        },
      });
    }),

  getOwnedPools: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.profile.findUnique({
        where: {
          userId: input,
        },
        select: {
          ownedPools: true,
        },
      });
    }),

  getModPools: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.profile.findUnique({
        where: {
          userId: input,
        },
        select: {
          modPools: true,
        },
      });
    }),

  getFollowers: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.profile.findUnique({
        where: {
          userId: input,
        },
        select: {
          followedBy: true,
        },
      });
    }),

  getFollowing: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.profile.findUnique({
        where: {
          userId: input,
        },
        select: {
          following: true,
        },
      });
    }),

  getPending: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.profile.findUnique({
        where: {
          userId: input,
        },
        select: {
          pending: true,
        },
      });
    }),

  followProfile: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        followId: z.string().cuid(),
        public: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (input.public) {
        return ctx.prisma.profile.update({
          where: { userId: input.userId },
          data: {
            following: {
              connect: {
                userId: input.followId,
              },
            },
          },
        });
      }

      return ctx.prisma.profile.update({
        where: { userId: input.userId },
        data: {
          sentFollows: {
            connect: {
              userId: input.followId,
            },
          },
        },
      });
    }),

  unfollowProfile: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        followId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.profile.update({
        where: { userId: input.userId },
        data: {
          following: {
            disconnect: {
              userId: input.followId,
            },
          },
        },
      });
    }),

  profileFollowAction: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        followId: z.string().cuid(),
        accepts: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (input.accepts) {
        return ctx.prisma.profile.update({
          where: { userId: input.userId },
          data: {
            pending: {
              disconnect: {
                userId: input.followId,
              },
            },
            followedBy: {
              connect: {
                userId: input.followId,
              },
            },
          },
        });
      }
      return ctx.prisma.profile.update({
        where: { userId: input.userId },
        data: {
          pending: {
            disconnect: {
              userId: input.followId,
            },
          },
        },
      });
    }),
});
