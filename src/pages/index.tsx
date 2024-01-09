import { api } from "../utils/trpc";
import { LoadingSpinner, Spinner } from "../components/misc/loading";
import { PoolComponent } from "../components/highlight-pool-card";

import React, { useEffect, useMemo } from "react";

import { PoolButtonProvider } from "../components/contexts/follow-pool-context";
import type { PoolInfo } from "../types/pool-out";
import type { ButtonContext } from "../components/contexts/button-types";
import type { NextPage } from "next";
import PageWrap from "../components/layout/page-wrap";
import { useAuth } from "@clerk/nextjs";
import { ScrollArea } from "@/shadcn/ui/scroll-area";

import { HomeTabs } from "~/components/layout/home-nav";
import { useInView } from "react-intersection-observer";

const PoolsFeed: React.FC<{ discover: boolean }> = ({ discover }) => {
  const user = useAuth();

  const amount = 5;

  const util = api.useUtils();

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

  const { ref, inView } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isLoading) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView, isLoading]);

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
          <div ref={ref}>{hasNextPage && <Spinner />}</div>
        </div>
      </PoolButtonProvider>
    </ScrollArea>
  );
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
