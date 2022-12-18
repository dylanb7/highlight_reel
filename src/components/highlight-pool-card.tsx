import { HighlightPool, User } from "@prisma/client";
import * as Separator from "@radix-ui/react-separator";
import Link from "next/link";
import { PoolFollowButton } from "./follow-pool";

export const PoolMessageCard: React.FC<
  React.PropsWithChildren<{ isCenter: boolean }>
> = ({ children, isCenter }) => {
  return (
    <div
      className={
        "flex items-center justify-center " + (isCenter ? "px-4 pt-10" : "")
      }
    >
      <div className="flex h-fit w-fit items-center justify-center place-self-center rounded-lg bg-white p-4 shadow-md dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
};

export const PoolData: React.FC<{
  pool: HighlightPool & {
    _count: {
      highlights: number;
      followers: number;
    };
  };
  followData?: {
    pending: boolean;
    following: boolean;
  } | null;
}> = ({ pool, followData }) => {
  return (
    <div className="justify-left">
      <div className="flex flex-row justify-between">
        <h1 className="truncate text-2xl font-semibold text-slate-900 dark:text-white">
          {pool.name}
        </h1>
        <PoolFollowButton pool={pool} followData={followData} />
      </div>
      <Separator.Root
        orientation="horizontal"
        decorative
        className="mt-1.5 mb-1 h-px bg-slate-900 dark:bg-white"
      />
      <div className="flex flex-row justify-between">
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
          Highlights: {pool._count.highlights}
        </p>
        <Separator.Root
          orientation="vertical"
          decorative
          className="mx-1 w-px bg-slate-900 dark:bg-white"
        />
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
          Followers: {pool._count.followers}
        </p>
        <Separator.Root
          orientation="vertical"
          decorative
          className="mx-1 w-px bg-slate-900 dark:bg-white"
        />
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
          Created: {pool.createdAt.toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export const FetcherPoolComponent: React.FC<{
  pool: HighlightPool & {
    _count: {
      highlights: number;
      followers: number;
    };
  };
}> = ({ pool }) => {
  return (
    <PoolMessageCard isCenter={false}>
      <div className="flex flex-col gap-4 sm:gap-8">
        <PoolData pool={pool} />
        <Link href={"/reels/" + encodeURIComponent(pool.id)}>
          <div className="items-center justify-center rounded-lg bg-indigo-500 py-1 text-sm font-semibold text-white no-underline transition hover:bg-indigo-700">
            <p className="text-center">View Reel</p>
          </div>
        </Link>
      </div>
    </PoolMessageCard>
  );
};

export const PoolComponent: React.FC<{
  pool: HighlightPool & {
    pending: User[];
    followers: User[];
    _count: {
      highlights: number;
      followers: number;
    };
  };
}> = ({ pool }) => {
  return (
    <PoolMessageCard isCenter={false}>
      <div className="flex flex-col gap-4 sm:gap-8">
        <PoolData
          pool={pool}
          followData={{
            following: pool.followers.length > 0,
            pending: pool.pending.length > 0,
          }}
        />
        <Link href={"/reels/" + encodeURIComponent(pool.id)}>
          <div className="items-center justify-center rounded-lg bg-indigo-500 py-1 text-sm font-semibold text-white no-underline transition hover:bg-indigo-700">
            <p className="text-center">View Reel</p>
          </div>
        </Link>
      </div>
    </PoolMessageCard>
  );
};
