import type { GetServerSideProps, NextPage } from "next";
import React, { useMemo } from "react";

import { api } from "../../../utils/trpc";
import { LoadingSpinner } from "../../../components/misc/loading";
import { getServerHelpers } from "../../../utils/ssgHelper";
import Head from "next/head";
import {
  HighlightGridsComponent,
  hourGrouping,
} from "../../../components/highlight-components/highlight-grid";
import type { HighlightGridActions } from "../../../components/contexts/highlight-grid-context";
import { HighlightGridContextProvider } from "../../../components/contexts/highlight-grid-context";
import type { HighlightThumbnail } from "../../../types/highlight-out";
import {
  bookmarkActionUpdate,
  likeActionUpdate,
} from "../../../components/contexts/action-types";

import { PoolInfo } from "../../../components/pool-components/pool-info";
import PageWrap from "../../../components/layout/page-wrap";
import {
  Filters,
  useInitialDate,
} from "~/components/pool-components/pool-filters";

const PoolView: NextPage<{ poolId: number }> = ({ poolId }) => {
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

        <Filters poolId={poolId} />
        <LoadFeed poolId={poolId} />
      </div>
    </PageWrap>
  );
};

const LoadFeed: React.FC<{
  poolId: number;
}> = ({ poolId }) => {
  const loadAmount = 6;

  const initialCursor = useInitialDate();

  const queryKey = {
    amount: loadAmount,
    poolId: poolId,
    initialCursor,
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
        void util.pool.getPoolHighlightsPaginated.invalidate(queryKey);
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
        void util.pool.getPoolHighlightsPaginated.invalidate(queryKey);
      },
    });

  if (isLoading) return <LoadingSpinner loadingType={"Loading Highlights"} />;

  const actions: HighlightGridActions = {
    basePath: `reels/${poolId}/feed`,
    fetchMore: () => {
      void fetchNextPage();
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
    <HighlightGridContextProvider value={actions}>
      <HighlightGridsComponent
        highlights={highlights}
        grouping={hourGrouping}
      />
    </HighlightGridContextProvider>
  );
};

export const getServerSideProps: GetServerSideProps<{
  poolId: number;
}> = async (props) => {
  const { params } = props;
  if (!params?.id || typeof params.id !== "string") {
    return {
      notFound: true,
    };
  }

  const urlPool = params.id;

  const poolId = Number(urlPool);

  if (Number.isNaN(poolId)) {
    return {
      notFound: true,
    };
  }

  const ssgHelper = getServerHelpers(props.req);

  await ssgHelper.pool.getPoolById.prefetch(poolId);

  await ssgHelper.pool.getPoolHighlightsPaginated.prefetchInfinite({
    amount: 6,
    poolId: poolId,
  });

  await ssgHelper.pool.getWristbands.prefetch(poolId);

  return {
    props: {
      trpcState: ssgHelper.dehydrate(),
      poolId,
    },
  };
};

export default PoolView;
