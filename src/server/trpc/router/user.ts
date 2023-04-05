import type { ProfileInfo, UserInfo } from "../../../types/user-out";
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { poolFromQuery } from "../../../types/pool-out";
import {
  addUnathedProps,
  packageThumbnailsPaginated,
} from "../../../utils/highlightUtils";
import type { HighlightReturn } from "../../../types/highlight-out";

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
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          public: input.public,
          username: input.username,
        },
      });
    }),

  profileQuery: publicProcedure
    .input(z.string().cuid())
    .query(async ({ ctx, input }) => {
      const ref = ctx.session?.user?.id;
      const owns = input === ref;

      if (ref && owns) {
        const ret = await ctx.prisma.user.findUnique({
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
        return ret
          ? <ProfileInfo>{
              ...ret,
              following: ret._count.following,
              followedBy: ret._count.followedBy,
              follows: false,
              requested: false,
              pools: ret.pools.map(poolFromQuery),
              modPools: ret.modPools.map(poolFromQuery),
              ownedPools: ret.ownedPools.map(poolFromQuery),
            }
          : undefined;
      }

      if (ref) {
        const ret = await ctx.prisma.user.findUnique({
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
          },
        });
        return ret
          ? <ProfileInfo>{
              ...ret,
              following: ret._count.following,
              followedBy: ret._count.followedBy,
              follows: ret.followedBy.length > 0,
              requested: ret.pending.length > 0,
              pools: ret.pools.map(poolFromQuery),
              modPools: [],
              ownedPools: [],
            }
          : undefined;
      }

      const ret = await ctx.prisma.user.findUnique({
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

          pools: {
            include: {
              _count: {
                select: {
                  followers: true,
                  highlights: true,
                },
              },
            },
          },
        },
      });
      return ret
        ? <ProfileInfo>{
            ...ret,
            following: ret._count.following,
            followedBy: ret._count.followedBy,
            follows: false,
            requested: false,
            pools: ret.pools
              .map((value) => {
                return { ...value, followers: [], pending: [] };
              })
              .map(poolFromQuery),
            modPools: [],
            ownedPools: [],
          }
        : undefined;
    }),

  toggleHighlight: protectedProcedure
    .input(
      z.object({
        highlightId: z.string(),
        add: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.add) {
        return ctx.prisma.user.update({
          where: { id: userId },
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
        where: { id: userId },
        data: {
          highlights: {
            disconnect: {
              id: input.highlightId,
            },
          },
        },
      });
    }),

  upvoteHighlight: protectedProcedure
    .input(
      z.object({
        highlightId: z.string(),
        liked: z.boolean().nullish(),
      })
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.liked) {
        return ctx.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            upvotes: {
              disconnect: {
                id: input.highlightId,
              },
            },
          },
        });
      }
      return ctx.prisma.user.update({
        where: {
          id: userId,
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
        isPublic: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { poolId, isPublic } = input;
      if (isPublic) {
        return ctx.prisma.user.update({
          where: { id: userId },
          data: {
            pools: {
              connect: {
                id: poolId,
              },
            },
          },
        });
      }
      return ctx.prisma.user.update({
        where: { id: userId },
        data: {
          poolRequests: {
            connect: {
              id: poolId,
            },
          },
        },
      });
    }),

  removePool: protectedProcedure
    .input(
      z.object({
        poolId: z.string().cuid(),
        requested: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.requested) {
        return ctx.prisma.user.update({
          where: { id: userId },
          data: {
            poolRequests: {
              disconnect: {
                id: input.poolId,
              },
            },
          },
        });
      }
      return ctx.prisma.user.update({
        where: { id: userId },
        data: {
          pools: {
            disconnect: {
              id: input.poolId,
            },
          },
        },
      });
    }),

  getFollowers: publicProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const ref = ctx.session?.user?.id;
      if (ref) {
        const res = await ctx.prisma.user.findUnique({
          where: {
            id: input.userId,
          },
          select: {
            followedBy: {
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
        return res
          ? res.followedBy.map<UserInfo>((val) => {
              return {
                ...val,
                follows: val.followedBy.length > 0,
                requested: val.pending.length > 0,
              };
            })
          : [];
      }
      const res = await ctx.prisma.user.findUnique({
        where: {
          id: input.userId,
        },
        select: {
          followedBy: true,
        },
      });
      return res
        ? res.followedBy.map<UserInfo>((val) => {
            return {
              ...val,
              follows: false,
              requested: false,
            };
          })
        : [];
    }),

  getFollowing: publicProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const ref = ctx.session?.user?.id;
      if (ref) {
        const res = await ctx.prisma.user.findUnique({
          where: {
            id: input.userId,
          },
          select: {
            following: {
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
        return res
          ? res.following.map<UserInfo>((val) => {
              return {
                ...val,
                follows: val.followedBy.length > 0,
                requested: val.pending.length > 0,
              };
            })
          : [];
      }
      const res = await ctx.prisma.user.findUnique({
        where: {
          id: input.userId,
        },
        select: {
          following: true,
        },
      });
      return res
        ? res.following.map<UserInfo>((val) => {
            return {
              ...val,
              follows: false,
              requested: false,
            };
          })
        : [];
    }),

  getPending: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: {
        id: ctx.session.user.id,
      },
      select: {
        pending: true,
      },
    });
  }),

  followUser: protectedProcedure
    .input(
      z.object({
        followId: z.string().cuid(),
        public: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.public) {
        return ctx.prisma.user.update({
          where: { id: userId },
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
        where: { id: userId },
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
        followId: z.string().cuid(),
        requested: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.requested) {
        return ctx.prisma.user.update({
          where: { id: userId },
          data: {
            sentFollows: {
              disconnect: {
                id: input.followId,
              },
            },
          },
        });
      }
      return ctx.prisma.user.update({
        where: { id: userId },
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
        followId: z.string().cuid(),
        accepts: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.accepts) {
        return ctx.prisma.user.update({
          where: { id: userId },
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
        where: { id: userId },
        data: {
          pending: {
            disconnect: {
              id: input.followId,
            },
          },
        },
      });
    }),

  getUserBookmarksPaginated: publicProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        cursor: z.string().nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const currentId = ctx.session?.user?.id;
      const { userId, cursor, amount } = input;
      let ret: HighlightReturn;

      if (currentId) {
        ret = (
          await ctx.prisma.user.findFirst({
            where: {
              OR: [
                {
                  public: true,
                },
                {
                  followedBy: {
                    some: {
                      id: currentId,
                    },
                  },
                },
                {
                  id: currentId,
                },
              ],
              AND: {
                id: userId,
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
                      id: currentId,
                    },
                  },
                  addedBy: {
                    where: {
                      id: currentId,
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
        const rawPool = await ctx.prisma.user.findFirst({
          where: {
            id: userId,
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

  getUserLikesPaginated: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        amount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const { cursor, amount } = input;

      const ret = await ctx.prisma.user.findFirst({
        where: {
          id: userId,
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
      });

      return packageThumbnailsPaginated(
        amount,
        ret?.highlights ?? null,
        cursor
      );
    }),
});
