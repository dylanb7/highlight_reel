import type { HighlightPool, User } from "@prisma/client";

export type FollowInfo = {
  follows: boolean;
  requested: boolean;
};

export type PoolInfo = HighlightPool & {
  followInfo?: FollowInfo;
  highlightCount: number;
  followerCount: number;
};

export type PoolReturn = HighlightPool & {
  _count: {
    highlights: number;
    followers: number;
  };
  pending: User[];
  followers: User[];
};

export const poolFromQuery: (data: PoolReturn) => PoolInfo = (data) => {
  return <PoolInfo>{
    ...data,
    highlightCount: data._count.highlights,
    followerCount: data._count.followers,
    followInfo: {
      follows: data.followers.length > 0,
      requested: data.pending.length > 0,
    },
  };
};
/*{
  ...data,
  followerCount: data._count.followers,
  highlightCount: data._count.highlights,
  followInfo: {
    follows: data.followers.length > 0,
    requested: data.pending.length > 0,
  },
};*/
