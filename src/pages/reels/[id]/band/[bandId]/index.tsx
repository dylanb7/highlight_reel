import type { NextPage, GetStaticProps } from "next";
import { useSession } from "next-auth/react";
import Head from "next/head";

import { useMemo } from "react";
import {
  bookmarkActionUpdate,
  likeActionUpdate,
} from "../../../../../components/contexts/action-types";
import type { ButtonContext } from "../../../../../components/contexts/button-types";
import { PoolButtonProvider } from "../../../../../components/contexts/follow-pool-context";
import type { GridActions } from "../../../../../components/contexts/grid-context";
import { GridContextProvider } from "../../../../../components/contexts/grid-context";
import {
  HighlightGridsComponent,
  dayGrouping,
} from "../../../../../components/highlight-components/highlight-grid";
import { WristBands } from "../../../../../components/highlight-components/wristband-row";
import {
  PoolMessageCard,
  PoolData,
} from "../../../../../components/highlight-pool-card";
import { LoadingSpinner } from "../../../../../components/misc/loading";
import SignInComponent from "../../../../../components/misc/sign-in";
import type { HighlightThumbnail } from "../../../../../types/highlight-out";
import { generateSSGHelper } from "../../../../../utils/ssgHelper";
import { api } from "../../../../../utils/trpc";

const PoolView: NextPage<{ poolId: string; bandId: string }> = ({
  poolId,
  bandId,
}) => {
  const { data: poolInfo } = api.pool.getPoolById.useQuery(poolId);

  return (
    <>
      <Head>
        <title>{`Reel - ${poolInfo?.name ?? "Loading"} - ${bandId}`}</title>
      </Head>
      <div className="flex h-full w-full flex-col items-start justify-start px-4 sm:px-8">
        <div className="mt-8 self-center pb-4">
          <PoolInfo poolId={poolId} />
        </div>
        <WristBands poolId={poolId} />
        <LoadFeed poolId={poolId} bandId={bandId} />
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
  bandId: string;
}> = ({ poolId, bandId }) => {
  const loadAmount = 6;

  const queryKey = {
    amount: loadAmount,
    poolId: poolId,
    wristbandId: bandId,
  };

  const util = api.useContext();

  const { data, isLoading, hasNextPage, fetchNextPage } =
    api.pool.getWristbandHighlightsPaginated.useInfiniteQuery(queryKey, {
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
        await util.pool.getWristbandHighlightsPaginated.cancel(queryKey);
        const prev =
          util.pool.getWristbandHighlightsPaginated.getInfiniteData(queryKey);
        if (prev) {
          util.pool.getWristbandHighlightsPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: bookmarkActionUpdate(prev, variables),
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.pool.getWristbandHighlightsPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
      },
      onSettled() {
        util.pool.getWristbandHighlightsPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      async onMutate(variables) {
        await util.pool.getWristbandHighlightsPaginated.cancel(queryKey);
        const prev =
          util.pool.getWristbandHighlightsPaginated.getInfiniteData(queryKey);
        if (prev) {
          util.pool.getWristbandHighlightsPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: likeActionUpdate(prev, variables),
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
    basePath: `reels/${poolId}/feed`,
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
      upvote({ highlightId: highlight.id, like: !highlight.upvoted });
    },
    disabled: bookmarking || upvoting,
  };

  return (
    <GridContextProvider value={actions}>
      <HighlightGridsComponent highlights={highlights} grouping={dayGrouping} />
    </GridContextProvider>
  );
};

export const getStaticProps: GetStaticProps<{
  poolId: string;
  bandId: string;
}> = async (props) => {
  const { params } = props;
  if (
    !params ||
    !params.id ||
    typeof params.id !== "string" ||
    !params.bandId ||
    typeof params.bandId !== "string"
  ) {
    return {
      notFound: true,
    };
  }

  const poolId = params.id;

  const bandId = params.bandId;

  const ssg = generateSSGHelper();

  await ssg.pool.getPoolById.prefetch(poolId);

  await ssg.pool.getWristbandHighlightsPaginated.prefetchInfinite({
    poolId,
    wristbandId: bandId,
    amount: 6,
  });

  await ssg.pool.getWristbands.prefetch(poolId);

  return {
    props: {
      trpcState: ssg.dehydrate(),
      poolId,
      bandId,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default PoolView;