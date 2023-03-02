import type { HighlightPool, User } from "@prisma/client";

export type FollowInfo = {
  follows: boolean;
  requested: boolean;
};

export type PoolInfo = HighlightPool & {
  followInfo?: FollowInfo;
  followerCount: number;
  highlightCount: number;
};

export type ProfilePoolFetch = {
  userId: string;
  refId?: string;
  kind: "owned" | "mod" | "followed";
};

export type DiscoverPoolFetch = {
  userId: string | undefined;
  amount: number;
  cursor: string | undefined;
  discover: boolean | undefined;
};

export type PoolFetchInfo = {
  profile?: ProfilePoolFetch;
  discover?: DiscoverPoolFetch;
};

export const poolFromQuery: (
  data: HighlightPool & {
    _count: {
      highlights: number;
      followers: number;
    };
    pending: User[];
    followers: User[];
  }
) => PoolInfo = (data) => {
  return <PoolInfo>{
    ...data,
    followerCount: data._count.followers,
    highlightCount: data._count.highlights,
    followInfo: {
      follows: data.followers.length > 0,
      requested: data.pending.length > 0,
    },
  };
};
