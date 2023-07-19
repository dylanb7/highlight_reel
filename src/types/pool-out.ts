import type { HighlightPool } from "../server/db/schema";

export interface FollowInfo {
  follows: boolean;
  requested: boolean;
}

export type PoolFollowing = HighlightPool & {
  followInfo?: FollowInfo;
};

export type PoolInfo = HighlightPool & {
  followInfo?: FollowInfo;
  highlightCount: number;
  followerCount: number;
  isPublic: boolean;
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
