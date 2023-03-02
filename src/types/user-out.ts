import type { User } from "@prisma/client";
import { PoolInfo } from "./pool-out";

export type UserInfo = User & {
  follows: boolean;
  requested: boolean;
};

export type ProfileInfo = UserInfo & {
  following: number;
  followedBy: number;
  pools: PoolInfo[];
  modPools: PoolInfo[];
  ownedPools: PoolInfo[];
};

export type UserFetch = {
  userId: string;
  refId?: string;
  following: boolean;
};

export type PoolUserFetch = {
  poolId: string;
  refId?: string;
};

export type FetchInfo = {
  userFetch?: UserFetch;
  poolFetch?: PoolUserFetch;
};
