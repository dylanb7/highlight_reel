import { User } from "@prisma/client";

export type UserInfo = User & {
  follows: boolean;
  requested: boolean;
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
