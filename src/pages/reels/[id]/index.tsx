import type { GetStaticProps, NextPage } from "next";
import { useSession } from "next-auth/react";
import React, { useMemo } from "react";
import SignInComponent from "../../../components/misc/sign-in";
import { api } from "../../../utils/trpc";
import { LoadingSpinner } from "../../../components/misc/loading";
import {
  PoolData,
  PoolMessageCard,
} from "../../../components/highlight-pool-card";

import { PoolButtonProvider } from "../../../components/contexts/follow-pool-context";
import type { ButtonContext } from "../../../components/contexts/button-types";

import { generateSSGHelper } from "../../../utils/ssgHelper";
import Head from "next/head";
import {
  dayGrouping,
  HighlightGridsComponent,
} from "../../../components/highlight-components/highlight-grid";
import type { GridActions } from "../../../components/contexts/grid-context";
import { GridContextProvider } from "../../../components/contexts/grid-context";
import type { HighlightThumbnail } from "../../../types/highlight-out";

const PoolView: NextPage<{ poolId: string }> = ({ poolId }) => {
  const { data: poolInfo } = api.pool.getPoolById.useQuery(poolId);

  return (
    <>
      <Head>
        <title>{`Reel - ${poolInfo?.name ?? "Loading"}`}</title>
      </Head>
      <div className="flex h-full w-full flex-col items-start justify-center px-4 pt-8 sm:px-8">
        <div className="self-center">
          <PoolInfo poolId={poolId} />
        </div>
        <LoadFeed poolId={poolId} />
      </div>
    </>
  );
};

const PoolInfo: React.FC<{ poolId: string }> = ({ poolId }) => {
  const { data: session } = useSession();

  const util = api.useContext();

  const { data: poolInfo, isLoading } = api.pool.getPoolById.useQuery(poolId);

  const { mutate: add, isLoading: adding } = api.user.addPool.useMutation({
    async onMutate() {
      await util.pool.getPoolById.cancel(poolId);
      const prev = util.pool.getPoolById.getData(poolId);
      if (prev) {
        util.pool.getPoolById.setData(poolId, {
          ...prev,
          followInfo: {
            follows: prev.public,
            requested: !prev.public,
          },
        });
      }
      return { prev };
    },
    onError(_, __, context) {
      util.pool.getPoolById.setData(poolId, context?.prev);
    },
    onSettled() {
      util.pool.getPoolById.invalidate();
    },
  });

  const { mutate: remove, isLoading: removing } =
    api.user.removePool.useMutation({
      async onMutate() {
        await util.pool.getPoolById.cancel(poolId);
        const prev = util.pool.getPoolById.getData(poolId);
        if (prev) {
          util.pool.getPoolById.setData(poolId, {
            ...prev,
            followInfo: {
              follows: false,
              requested: false,
            },
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.pool.getPoolById.setData(poolId, context?.prev);
      },
      onSettled() {
        util.pool.getPoolById.invalidate(poolId);
      },
    });

  const followInfo = {
    follows: poolInfo?.followInfo?.follows ?? false,
    requested: poolInfo?.followInfo?.requested ?? false,
  };

  const hasSession = session && session.user;

  const privateNoSession = poolInfo && !poolInfo.public && !hasSession;

  const privateNoFollow =
    poolInfo && !poolInfo.public && !followInfo.follows && hasSession;

  const buttonContext: ButtonContext = {
    action: () => {
      if (!session || !session.user || !poolInfo) return;
      if (followInfo.follows || followInfo.requested) {
        remove({
          poolId: poolId,
          requested: poolInfo.followInfo?.requested ?? false,
        });
      } else {
        add({
          poolId: poolId,
          isPublic: poolInfo.public,
        });
      }
    },
    state: () => {
      return {
        follows: followInfo.follows,
        pending: followInfo.requested,
        disabled: adding || removing,
      };
    },
  };

  return (
    <PoolButtonProvider value={buttonContext}>
      <PoolMessageCard>
        {isLoading && <LoadingSpinner loadingType={"Loading Reel"} />}
        {poolInfo ? (
          <div className="flex flex-col">
            <PoolData pool={poolInfo} />
            {privateNoSession && (
              <>
                <p className="mt-5 font-semibold text-slate-900 dark:text-white">
                  This{" "}
                  <span className="font-semibold text-indigo-500">Reel</span> is
                  private. Sign in to follow.
                </p>
                <div className="mt-2 flex items-center justify-center">
                  <SignInComponent />
                </div>
              </>
            )}
            {privateNoFollow && (
              <p className="mt-5 text-center font-semibold text-slate-900 dark:text-white">
                This <span className="font-semibold text-indigo-500">Reel</span>{" "}
                is private. You can request to follow it.
              </p>
            )}
          </div>
        ) : (
          !isLoading && (
            <p className="mt-5 font-semibold text-slate-900 dark:text-white">
              Unable to fetch reel
            </p>
          )
        )}
      </PoolMessageCard>
    </PoolButtonProvider>
  );
};

const LoadFeed: React.FC<{
  poolId: string;
}> = ({ poolId }) => {
  const loadAmount = 6;

  const queryKey = {
    amount: loadAmount,
    poolId: poolId,
  };

  const util = api.useContext();

  const { data, isLoading, hasNextPage, fetchNextPage } =
    api.pool.getPoolHighlightsPaginated.useInfiniteQuery(queryKey, {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });
  const highlights = useMemo(() => {
    return data?.pages.flatMap((page) => page.highlights) ?? [];
  }, [data]);

  const highlightMap = useMemo(() => {
    const highlightMap = new Map<string, HighlightThumbnail>();

    for (const highlight of highlights) {
      highlightMap.set(highlight.id, highlight);
    }
    return highlightMap;
  }, [highlights]);

  const { mutate: bookmark, isLoading: bookmarking } =
    api.user.toggleHighlight.useMutation({
      async onMutate(variables) {
        await util.pool.getPoolHighlightsPaginated.cancel();
        const prev =
          util.pool.getPoolHighlightsPaginated.getInfiniteData(queryKey);
        if (prev) {
          let updated = false;

          const { add, highlightId } = variables;

          const newPages = prev.pages.map((page) => {
            if (updated) return page;
            for (const { index, upt } of page.highlights.map((upt, index) => ({
              index,
              upt,
            }))) {
              if (updated) break;
              if (upt.id === highlightId) {
                const found = page.highlights[index];
                if (!found) break;
                page.highlights[index] = {
                  ...found,
                  bookmarked: add,
                };
                updated = true;
                return page;
              }
            }
            return page;
          });

          util.pool.getPoolHighlightsPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: newPages,
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.pool.getPoolHighlightsPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
      },
      onSettled() {
        util.pool.getPoolHighlightsPaginated.invalidate();
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      async onMutate(variables) {
        await util.pool.getPoolHighlightsPaginated.cancel();
        const prev =
          util.pool.getPoolHighlightsPaginated.getInfiniteData(queryKey);
        if (prev) {
          let updated = false;

          const { liked, highlightId } = variables;

          const newPages = prev.pages.map((page) => {
            if (updated) return page;
            for (const { index, upt } of page.highlights.map((upt, index) => ({
              index,
              upt,
            }))) {
              if (updated) break;
              if (upt.id === highlightId) {
                const found = page.highlights[index];
                if (!found) break;
                page.highlights[index] = {
                  ...found,
                  upvoted: !liked ?? false,
                };
                updated = true;
                return page;
              }
            }
            return page;
          });

          util.pool.getPoolHighlightsPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: newPages,
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.pool.getPoolHighlightsPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
      },
      onSettled() {
        util.pool.getPoolHighlightsPaginated.invalidate();
      },
    });

  if (isLoading) return <LoadingSpinner loadingType={"Loading Highlights"} />;

  const actions: GridActions = {
    basePath: poolId,
    fetchMore: () => {
      fetchNextPage();
    },
    hasMore: () => hasNextPage ?? false,
    bookmark: (id: string) => {
      const highlight = highlightMap.get(id);
      if (!highlight) return;
      bookmark({ highlightId: highlight.id, add: !highlight.bookmarked });
    },
    like: (id: string) => {
      const highlight = highlightMap.get(id);
      if (!highlight) return;
      upvote({ highlightId: highlight.id, liked: highlight.upvoted });
    },
    disabled: bookmarking || upvoting,
  };

  return (
    <GridContextProvider value={actions}>
      <div className="h-full w-full">
        <HighlightGridsComponent
          highlights={highlights}
          grouping={dayGrouping}
        />
      </div>
    </GridContextProvider>
  );
};

export const getStaticProps: GetStaticProps<{
  poolId: string;
}> = async (props) => {
  const { params } = props;
  if (!params || !params.id || typeof params.id !== "string") {
    return {
      notFound: true,
    };
  }

  const poolId = params.id;

  const ssg = generateSSGHelper();

  await ssg.pool.getPoolById.prefetch(poolId);

  await ssg.pool.getPoolHighlightsPaginated.prefetchInfinite({
    amount: 6,
    poolId: poolId,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      poolId,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default PoolView;
