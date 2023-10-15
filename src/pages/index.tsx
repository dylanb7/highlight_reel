import { api } from "../utils/trpc";
import { LoadingSpinner } from "../components/misc/loading";
import { PoolComponent } from "../components/highlight-pool-card";
import { UserFinish } from "../components/user-finish";
import React, { useMemo } from "react";

import { ProfileComponent } from "../components/profile-components";

import { PersonIcon, CameraIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/router";
import { PoolButtonProvider } from "../components/contexts/follow-pool-context";
import type { PoolInfo } from "../types/pool-out";
import type { ButtonContext } from "../components/contexts/button-types";
import type { NextPage } from "next";
import PageWrap from "../components/layout/page-wrap";
import { useAuth } from "@clerk/nextjs";
import { ScrollArea } from "@/shadcn/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shadcn/ui/tabs";
import { HomeTabs } from "~/components/layout/home-nav";

const UnauthedContent = () => {
  return (
    <div className="pt-6">
      <PoolsFeed discover={false} />
    </div>
  );
};

const PoolsFeed: React.FC<{ discover: boolean }> = ({ discover }) => {
  const user = useAuth();

  const amount = 5;

  const util = api.useContext();

  const queryKey = {
    amount,
  };

  const { data, hasNextPage, fetchNextPage, isLoading } =
    api.pool.getPublicPoolsPaginated.useInfiniteQuery(queryKey, {
      refetchOnWindowFocus: false,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const pools = useMemo(() => {
    return data?.pages.flatMap((page) => page.poolsInfo) ?? [];
  }, [data]);

  const poolMap = useMemo(() => {
    const poolMap = new Map<number, PoolInfo>();

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
      void util.pool.getPublicPoolsPaginated.invalidate();
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
        void util.pool.getPublicPoolsPaginated.invalidate(queryKey);
      },
    });

  const buttonContext: ButtonContext = {
    action: (poolId) => {
      if (!user.userId || typeof poolId !== "number") return;
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
          isPublic: poolInfo.isPublic,
        });
      }
    },
    state: (poolId) => {
      if (typeof poolId !== "number")
        return {
          follows: false,
          pending: false,
          disabled: adding || removing,
        };
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
    <ScrollArea>
      <PoolButtonProvider value={buttonContext}>
        <div className="flex flex-col items-center justify-center">
          <p className="mb-2 pt-4 text-center text-2xl font-semibold text-slate-900 dark:text-white">
            {discover ? "Discover Reels" : "Public Reels"}
          </p>
          {data && pools.length == 0 && (
            <p className="text text-center font-semibold text-slate-900 dark:text-white">
              No New Reels to Discover
            </p>
          )}
          <div className="m-4 flex max-w-6xl grid-cols-1 flex-col items-center justify-center gap-4 sm:grid sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {data &&
              pools.map((reel) => <PoolComponent key={reel.id} pool={reel} />)}
          </div>
          {hasNextPage && (
            <div className="mt-4 flex items-center justify-center">
              <button
                className="mb-4 w-fit rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
                onClick={() => void fetchNextPage()}
                disabled={isLoading || data === null}
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </PoolButtonProvider>
    </ScrollArea>
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
        void push({ query: { tab: newValue } }, undefined, { shallow: true });
      },
    ];
  };

  const user = useAuth();

  const id = user.userId;

  const [value, onChange] = useTabsValue();

  return (
    <Tabs
      defaultValue={"discover"}
      onValueChange={(newTab) => {
        onChange(newTab);
      }}
      value={value}
    >
      <TabsContent value="discover">
        <PoolsFeed discover={true} />
      </TabsContent>
      <TabsContent value="profile">
        {id ? (
          <ProfileLayout userId={id} />
        ) : (
          <p className="mb-2 pt-4 text-center text-2xl font-semibold text-slate-900 dark:text-white">
            Must be signed in to view profile
          </p>
        )}
      </TabsContent>

      <footer className="fixed inset-x-0 bottom-0 z-50 border-t bg-white shadow-lg dark:border-white dark:bg-slate-900">
        <TabsList className="h-full w-full justify-around pb-3">
          <TabsTrigger value="discover">
            <CameraIcon className="h-6 w-6 pr-2" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="profile">
            <PersonIcon className="h-6 w-6 pr-2" />
            Profile
          </TabsTrigger>
        </TabsList>
      </footer>
    </Tabs>
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

  if (!profile) return <UserFinish />;

  return <ProfileComponent userId={userId} />;
};

const HomePage: NextPage = () => {
  const user = useAuth();

  if (!user.userId) {
    return (
      <PageWrap>
        <PoolsFeed discover={false} />
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <PoolsFeed discover={true} />
      <HomeTabs selected={"discover"} />
    </PageWrap>
  );
};

export default HomePage;
