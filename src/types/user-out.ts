import type { User } from "../server/db/schema";
import type { FollowInfo, PoolInfo } from "./pool-out";

export type UserInfo = User & {
  followInfo?: FollowInfo;
  isPublic: boolean;
};

export type ProfileInfo = UserInfo & {
  following: number;
  followedBy: number;
};

export type ProfilePoolsInfo = UserInfo & {
  following: number;
  followedBy: number;
  followed: PoolInfo[];
  modded?: PoolInfo[];
  owned?: PoolInfo[];
};

export type FetchInfo = {
  userFetch?: { id: string; following: boolean };
  poolFetch?: number;
};
