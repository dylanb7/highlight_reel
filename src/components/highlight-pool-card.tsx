import * as Separator from "@radix-ui/react-separator";
import Link from "next/link";
import type { PoolInfo } from "../types/pool-out";
import { PoolFollowButton } from "./follow-pool";
import { ProfileList } from "./profile-scroll-components";
import { Avatar, AvatarFallback, AvatarImage } from "@/shadcn/ui/avatar";

export const PoolMessageCard: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return (
    <div
      className={`flex h-fit w-fit items-center justify-center rounded-lg border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-500 dark:bg-slate-900`}
    >
      {children}
    </div>
  );
};

export const PoolData: React.FC<{
  pool: PoolInfo;
}> = ({ pool }) => {
  return (
    <div className="justify-left flex flex-col">
      <div className="flex flex-row justify-between">
        <div className="flex flex-row gap-2">
          {pool.icon && (
            <Avatar>
              <AvatarImage src={pool.icon} />
              <AvatarFallback>
                {pool.name && pool.name?.length > 2
                  ? pool.name.substring(0, 2)
                  : "Re"}
              </AvatarFallback>
            </Avatar>
          )}
          <h1 className="truncate text-2xl font-semibold text-slate-900 dark:text-white">
            {pool.name}
          </h1>
        </div>
        <PoolFollowButton poolId={pool.id} />
      </div>
      {pool.bio && (
        <>
          <Separator.Root
            orientation="horizontal"
            decorative
            className="mb-1 mt-1.5 h-px bg-gray-300 dark:bg-gray-500"
          />
          <h5>{pool.bio}</h5>
        </>
      )}
      <Separator.Root
        orientation="horizontal"
        decorative
        className="mb-1 mt-1.5 h-px bg-gray-300 dark:bg-gray-500"
      />
      <div className="justify-left flex flex-row">
        <p className="truncate text-xs font-semibold text-slate-500 dark:text-gray-400">
          Highlights: {pool.highlightCount}
        </p>
        <Separator.Root
          orientation="vertical"
          decorative
          className="mx-1 w-px bg-gray-300 dark:bg-gray-500"
        />
        <ProfileList
          text={"Followers: " + pool.followerCount}
          header={"Pool Followers"}
          fetch={{
            poolFetch: pool.id,
          }}
        />

        <Separator.Root
          orientation="vertical"
          decorative
          className="mx-1 w-px bg-gray-300 dark:bg-gray-500"
        />
        <p className="truncate text-xs font-semibold text-slate-500 dark:text-gray-400">
          Created: {pool.createdAt?.toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export const PoolComponent: React.FC<{
  pool: PoolInfo;
}> = ({ pool }) => {
  return (
    <PoolMessageCard>
      <div className="flex flex-col gap-4 sm:gap-8">
        <PoolData pool={pool} />
        <Link href={{ pathname: `/reels/${encodeURIComponent(pool.id)}` }}>
          <div className="items-center justify-center rounded-lg bg-indigo-500 py-1 text-sm font-semibold text-white no-underline transition hover:bg-indigo-700">
            <p className="text-center">View Reel</p>
          </div>
        </Link>
      </div>
    </PoolMessageCard>
  );
};
