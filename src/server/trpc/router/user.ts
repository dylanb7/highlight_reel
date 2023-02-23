import { HighlightPool, User } from "@prisma/client";
import { UserInfo } from "../../../types/user-out";

import { z } from "zod";

import { router, protectedProcedure } from "../trpc";
import { poolFromQuery, PoolInfo } from "../../../types/pool-out";

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
    .input(
      z.object({
        user: z.string().cuid(),
        ref: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user, ref } = input;
      const owns = user === ref;
      const ret = await ctx.prisma.user.findUnique({
        where: {
          id: input.user,
        },
        include: {
          _count: {
            select: {
              following: true,
              followedBy: true,
            },
          },
          followedBy: !owns
            ? {
                where: {
                  id: ref,
                },
              }
            : undefined,
          pending: !owns
            ? {
                where: {
                  id: ref,
                },
              }
            : undefined,
          pools: {
            include: {
              _count: {
                select: {
                  followers: true,
                  highlights: true,
                },
              },
              followers: {
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
          modPools: owns
            ? {
                include: {
                  _count: {
                    select: {
                      followers: true,
                      highlights: true,
                    },
                  },
                  followers: {
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
              }
            : undefined,
          ownedPools: owns
            ? {
                include: {
                  _count: {
                    select: {
                      followers: true,
                      highlights: true,
                    },
                  },
                  followers: {
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
              }
            : undefined,
        },
      });

      if (!ret) return undefined;
      return <
        UserInfo & {
          following: number;
          followedBy: number;
          pools: PoolInfo[];
          modPools: PoolInfo[];
          ownedPools: PoolInfo[];
        }
      >{
        ...ret,
        following: ret._count.following,
        followedBy: ret._count.followedBy,
        follows: ret.followedBy.length > 0,
        requested: ret.pending.length > 0,
        pools: ret.pools.map(poolFromQuery),
        modPools: ret.modPools?.map(poolFromQuery) ?? [],
        ownedPools: ret.ownedPools?.map(poolFromQuery) ?? [],
      };
    }),

  toggleHighlight: protectedProcedure
    .input(
      z.object({
        highlightId: z.string(),
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
              timestampUTC: "asc",
            },
          },
        },
      });
    }),

  upvoteHighlight: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        highlightId: z.string(),
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

  removePool: protectedProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        userId: z.string().cuid(),
        requested: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          pools:
            input.requested === false
              ? {
                  disconnect: {
                    id: input.poolId,
                  },
                }
              : undefined,
          poolRequests: input.requested
            ? {
                disconnect: {
                  id: input.poolId,
                },
              }
            : undefined,
        },
      });
    }),

  getFollowers: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        refId: z.string().cuid().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const res = await ctx.prisma.user.findUnique({
        where: {
          id: input.userId,
        },
        select: {
          followedBy: {
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

      return res.followedBy.map<UserInfo>((val) => {
        return {
          ...val,
          follows: val.followedBy.length > 0,
          requested: val.pending.length > 0,
        };
      });
    }),

  getFollowing: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        refId: z.string().cuid().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const res = await ctx.prisma.user.findUnique({
        where: {
          id: input.userId,
        },
        select: {
          following: {
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
      return res.following.map<UserInfo>((val) => {
        return {
          ...val,
          follows: val.followedBy.length > 0,
          requested: val.pending.length > 0,
        };
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
        requested: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          following:
            input.requested === false
              ? {
                  disconnect: {
                    id: input.followId,
                  },
                }
              : undefined,
          sentFollows: input.requested
            ? {
                disconnect: {
                  id: input.followId,
                },
              }
            : undefined,
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
