import { HighlightPool, User } from "@prisma/client";

export type FollowInfo = {
  follows: boolean;
  requested: boolean;
};

export type PoolInfo = HighlightPool & {
  followInfo?: FollowInfo;
  followers: number;
  highlights: number;
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

type PoolQueryData = HighlightPool & {
  _count: {
    highlights: number;
    followers: number;
  };
  pending: User[];
  followers: User[];
};

export const poolFromQuery: (data: PoolQueryData) => PoolInfo = (
  data: PoolQueryData
) => {
  return <PoolInfo>{
    ...data,
    followers: data._count.followers,
    highlights: data._count.highlights,
    followInfo: {
      follows: data.followers.length > 0,
      requested: data.pending.length > 0,
    },
  };
};
