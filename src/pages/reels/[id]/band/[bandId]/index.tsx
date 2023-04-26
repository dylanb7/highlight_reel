import type { NextPage, GetStaticProps } from "next";
import Head from "next/head";

import { useMemo } from "react";
import {
  bookmarkActionUpdate,
  likeActionUpdate,
} from "../../../../../components/contexts/action-types";

import type { GridActions } from "../../../../../components/contexts/grid-context";
import { GridContextProvider } from "../../../../../components/contexts/grid-context";
import {
  HighlightGridsComponent,
  dayGrouping,
} from "../../../../../components/highlight-components/highlight-grid";
import { WristBands } from "../../../../../components/pool-components/wristband-row";

import { LoadingSpinner } from "../../../../../components/misc/loading";

import type { HighlightThumbnail } from "../../../../../types/highlight-out";
import { generateSSGHelper } from "../../../../../utils/ssgHelper";
import { api } from "../../../../../utils/trpc";
import { PoolInfo } from "../../../../../components/pool-components/pool-info";
import PageWrap from "../../../../../components/layout/page-wrap";

const PoolView: NextPage<{ poolId: string; bandId: string }> = ({
  poolId,
  bandId,
}) => {
  const { data: poolInfo } = api.pool.getPoolById.useQuery(poolId);

  return (
    <PageWrap>
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
    </PageWrap>
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
    basePath: `reels/${poolId}/band/${bandId}/feed`,
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
