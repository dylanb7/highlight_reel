import type { GetStaticProps, NextPage } from "next";
import React, { useMemo } from "react";
import { api } from "../../../utils/trpc";
import { LoadingSpinner } from "../../../components/misc/loading";
import { generateSSGHelper } from "../../../utils/ssgHelper";
import Head from "next/head";
import {
  dayGrouping,
  HighlightGridsComponent,
} from "../../../components/highlight-components/highlight-grid";
import type { GridActions } from "../../../components/contexts/grid-context";
import { GridContextProvider } from "../../../components/contexts/grid-context";
import type { HighlightThumbnail } from "../../../types/highlight-out";
import {
  bookmarkActionUpdate,
  likeActionUpdate,
} from "../../../components/contexts/action-types";
import { WristBands } from "../../../components/pool-components/wristband-row";
import { PoolInfo } from "../../../components/pool-components/pool-info";
import PageWrap from "../../../components/layout/page-wrap";

const PoolView: NextPage<{ poolId: string }> = ({ poolId }) => {
  const { data: poolInfo } = api.pool.getPoolById.useQuery(poolId);

  return (
    <PageWrap>
      <Head>
        <title>{`Reel - ${poolInfo?.name ?? "Loading"}`}</title>
      </Head>
      <div className="flex h-full w-full flex-col items-start justify-start px-4 sm:px-8">
        <div className="mt-8 self-center pb-4">
          <PoolInfo poolId={poolId} />
        </div>
        <WristBands poolId={poolId} />
        <LoadFeed poolId={poolId} />
      </div>
    </PageWrap>
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
        await util.pool.getPoolHighlightsPaginated.cancel(queryKey);
        const prev =
          util.pool.getPoolHighlightsPaginated.getInfiniteData(queryKey);
        if (prev) {
          util.pool.getPoolHighlightsPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: bookmarkActionUpdate(prev, variables),
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
        util.pool.getPoolHighlightsPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      async onMutate(variables) {
        await util.pool.getPoolHighlightsPaginated.cancel(queryKey);
        const prev =
          util.pool.getPoolHighlightsPaginated.getInfiniteData(queryKey);
        if (prev) {
          util.pool.getPoolHighlightsPaginated.setInfiniteData(queryKey, {
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
        util.pool.getPoolHighlightsPaginated.invalidate(queryKey);
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

  await ssg.pool.getWristbands.prefetch(poolId);

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
