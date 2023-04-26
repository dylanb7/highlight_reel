import { api } from "../utils/trpc";
import { LoadingSpinner } from "../components/misc/loading";
import { PoolComponent } from "../components/highlight-pool-card";
import { UserFinish } from "../components/user-finish";
import { useSession } from "next-auth/react";
import React, { useMemo } from "react";

import * as Tab from "@radix-ui/react-tabs";
import { ProfileComponent } from "../components/profile-components";
import * as ScrollArea from "@radix-ui/react-scroll-area";

import { PersonIcon, CameraIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/router";
import { PoolButtonProvider } from "../components/contexts/follow-pool-context";
import type { PoolInfo } from "../types/pool-out";
import type { ButtonContext } from "../components/contexts/button-types";
import type { NextPage } from "next";
import PageWrap from "../components/layout/page-wrap";

const UnauthedContent = () => {
  return (
    <div className="pt-6">
      <PoolsFeed discover={false} />
    </div>
  );
};

const PoolsFeed: React.FC<{ discover: boolean }> = ({ discover }) => {
  const { data: session } = useSession();

  const amount = 5;

  const util = api.useContext();

  const { data, hasNextPage, fetchNextPage, isLoading } =
    api.pool.getPublicPoolsPaginated.useInfiniteQuery(
      {
        amount: amount,
      },
      {
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const queryKey = {
    cursor: data?.pages.at(-1)?.nextCursor,
    userId: session?.user?.id,
    discover: discover,
    amount: amount,
  };

  const pools = useMemo(() => {
    return data?.pages.flatMap((page) => page.info) ?? [];
  }, [data]);

  const poolMap = useMemo(() => {
    const poolMap = new Map<string, PoolInfo>();

    for (const pool of pools) {
      poolMap.set(pool.id, pool);
    }
    return poolMap;
  }, [pools]);

  const { mutate: add, isLoading: adding } = api.user.addPool.useMutation({
    async onMutate() {
      await util.pool.getPublicPoolsPaginated.cancel(queryKey);
      const prev = util.pool.getPublicPoolsPaginated.getInfiniteData(queryKey);

      return { prev };
    },
    onError(_, __, context) {
      util.pool.getPublicPoolsPaginated.setInfiniteData(
        queryKey,
        context?.prev
      );
    },
    onSettled() {
      util.pool.getPublicPoolsPaginated.invalidate();
    },
  });

  const { mutate: remove, isLoading: removing } =
    api.user.removePool.useMutation({
      async onMutate() {
        await util.pool.getPublicPoolsPaginated.cancel(queryKey);
        const prev =
          util.pool.getPublicPoolsPaginated.getInfiniteData(queryKey);
        return { prev };
      },
      onError(_, __, context) {
        util.pool.getPublicPoolsPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
      },
      onSettled() {
        util.pool.getPublicPoolsPaginated.invalidate(queryKey);
      },
    });

  const buttonContext: ButtonContext = {
    action: (poolId) => {
      if (!session || !session.user) return;
      const poolInfo = poolMap.get(poolId);
      if (!poolInfo || !poolInfo.followInfo) return;
      if (poolInfo.followInfo.follows || poolInfo.followInfo.requested) {
        remove({
          poolId: poolId,
          requested: poolInfo.followInfo.requested,
        });
      } else {
        add({
          poolId: poolId,
          isPublic: poolInfo.public,
        });
      }
    },
    state: (poolId) => {
      const poolInfo = poolMap.get(poolId);
      return {
        follows: poolInfo?.followInfo?.follows ?? false,
        pending: poolInfo?.followInfo?.requested ?? false,
        disabled: adding || removing,
      };
    },
  };

  if (isLoading) return <LoadingSpinner loadingType={"Loading discover"} />;

  return (
    <ScrollArea.Root className="h-full w-full overflow-hidden">
      <ScrollArea.Viewport className="h-full w-full">
        <PoolButtonProvider value={buttonContext}>
          <div className="flex flex-col items-center justify-center">
            <p className="mb-2 pt-4 text-center text-2xl font-semibold text-slate-900 dark:text-white">
              {discover ? "Discover Reels" : "Public Reels"}
            </p>
            <div className="m-4 flex max-w-6xl grid-cols-1 flex-col items-center justify-center gap-4 sm:grid sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {data &&
                pools.map((reel) => (
                  <PoolComponent key={reel.id} pool={reel} />
                ))}
              {data && pools.length == 0 && (
                <p className="text font-semibold text-slate-900">
                  No New Reels to Discover
                </p>
              )}
            </div>
            {hasNextPage && (
              <div className="mt-4 flex items-center justify-center">
                <button
                  className="mb-4 w-fit rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
                  onClick={() => fetchNextPage()}
                  disabled={isLoading || data === null}
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </PoolButtonProvider>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        className="flex w-2 rounded-full bg-slate-300 hover:bg-slate-400"
      >
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-900" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
};

const AuthedContent = () => {
  const useTabsValue = (): [
    TabsValue: string,
    TabsOnChange: (newVal: string) => void
  ] => {
    const { query, push } = useRouter();

    const { tab } = query;

    return [
      typeof tab === "string" ? tab : "discover",
      (newValue: string) => {
        push({ query: { tab: newValue } }, undefined, { shallow: true });
      },
    ];
  };

  const { data: session } = useSession();

  const id = session?.user?.id;

  const [value, onChange] = useTabsValue();

  return (
    <Tab.Root
      className="flex flex-col"
      defaultValue={"discover"}
      onValueChange={(newTab) => {
        onChange(newTab);
      }}
      value={value}
    >
      <div className="mb-14">
        <Tab.Content value="discover">
          <PoolsFeed discover={true} />
        </Tab.Content>
        <Tab.Content value="profile">
          {id ? (
            <ProfileLayout userId={id} />
          ) : (
            <p className="mb-2 pt-4 text-center text-2xl font-semibold text-slate-900 dark:text-white">
              Must be signed in to view profile
            </p>
          )}
        </Tab.Content>
      </div>

      <footer className="border-grey-300 fixed inset-x-0 bottom-0 z-50 h-14 border-t bg-white pb-3 shadow-lg dark:border-white dark:bg-slate-900">
        <div className="mx-5 mt-3">
          <Tab.List className="flex flex-row items-center justify-around gap-8 ">
            <Tab.Trigger
              value="discover"
              className="flex flex-col items-center text-xs font-semibold radix-state-active:text-indigo-500 radix-state-inactive:text-slate-900 hover:radix-state-inactive:text-indigo-700 dark:radix-state-inactive:text-white dark:hover:radix-state-inactive:text-indigo-300"
            >
              <CameraIcon className="h-6 w-6" />
              Discover
            </Tab.Trigger>
            <Tab.Trigger
              value="profile"
              className="flex flex-col items-center text-xs font-semibold radix-state-active:text-indigo-500 radix-state-inactive:text-slate-900 hover:radix-state-inactive:text-indigo-700 dark:radix-state-inactive:text-white dark:hover:radix-state-inactive:text-indigo-300"
            >
              <PersonIcon className="h-6 w-6" />
              Profile
            </Tab.Trigger>
          </Tab.List>
        </div>
      </footer>
    </Tab.Root>
  );
};

const ProfileLayout: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: profile, isLoading } = api.user.profileQuery.useQuery(userId);

  if (isLoading)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner loadingType={null} />
      </div>
    );

  if (!profile)
    return (
      <p className="mb-2 pt-4 text-center text-2xl font-semibold text-slate-900 dark:text-white">
        Error fetching your profile
      </p>
    );

  if (!profile.username || profile.public == null) {
    return <UserFinish />;
  }

  return <ProfileComponent profile={profile} />;
};

const HomePage: NextPage = () => {
  const { data: session } = useSession();

  if (!session) {
    return (
      <PageWrap>
        <UnauthedContent />
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <AuthedContent />
    </PageWrap>
  );
};

export default HomePage;
