import type { User } from "../db/schema";
import type { FollowInfo, ReelInfo } from "./pool-out";

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
  followed: ReelInfo[];
  modded?: ReelInfo[];
  owned?: ReelInfo[];
};

export interface FetchInfo {
  userFetch?: { id: string; following: boolean };
  poolFetch?: number;
}
