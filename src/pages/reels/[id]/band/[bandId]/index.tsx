import type { NextPage, GetServerSideProps } from "next";
import Head from "next/head";
import { useMemo } from "react";

import type { HighlightGridActions } from "../../../../../components/contexts/highlight-grid-context";
import { HighlightGridContextProvider } from "../../../../../components/contexts/highlight-grid-context";

import { LoadingSpinner } from "../../../../../components/misc/loading";

import { api } from "../../../../../utils/trpc";
import { PoolInfo } from "../../../../../components/pool-components/pool-info";
import PageWrap from "../../../../../components/layout/page-wrap";
import { getServerHelpers } from "../../../../../utils/ssg-helper";
import {
  Filters,
  useInitialDate,
} from "~/components/pool-components/pool-filters";
import {
  HighlightGridGroupsComponent,
  hourGrouping,
} from "~/components/highlight-components/grouped-highlight-grid";

interface PoolViewBandProps {
  poolId: number;
  bandId: string;
}

const PoolView: NextPage<PoolViewBandProps> = ({ poolId, bandId }) => {
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
        <Filters poolId={poolId} />
        <LoadFeed poolId={poolId} bandId={bandId} />
      </div>
    </PageWrap>
  );
};

const LoadFeed: React.FC<{
  poolId: number;
  bandId: string;
}> = ({ poolId, bandId }) => {
  const loadAmount = 6;

  const initialCursor = useInitialDate();

  const queryKey = {
    amount: loadAmount,
    poolId: poolId,
    wristbandId: bandId,
    initialCursor,
  };

  const util = api.useContext();

  const { data, isLoading, hasNextPage, fetchNextPage } =
    api.pool.getWristbandHighlightsPaginated.useInfiniteQuery(queryKey, {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      getPreviousPageParam: (firstPage) => firstPage.prevCursor,
    });
  const highlights = useMemo(() => {
    return data?.pages.flatMap((page) => page.highlights) ?? [];
  }, [data]);

  const { mutate: bookmark, isLoading: bookmarking } =
    api.user.toggleHighlight.useMutation({
      onSettled() {
        void util.pool.getWristbandHighlightsPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        void util.pool.getPoolHighlightsPaginated.invalidate(queryKey);
      },
    });

  if (isLoading) return <LoadingSpinner loadingType={"Loading Highlights"} />;

  const actions: HighlightGridActions = {
    basePath: `reels/${encodeURIComponent(poolId)}/band/${encodeURIComponent(
      bandId
    )}/feed`,
    fetchMore: () => {
      void fetchNextPage();
    },
    hasMore: () => hasNextPage ?? false,
    bookmark: (highlight) => {
      bookmark({ highlightId: highlight.id, add: !highlight.bookmarked });
    },
    like: (highlight) => {
      upvote({ highlightId: highlight.id, like: !highlight.upvoted });
    },
    disabled: bookmarking || upvoting,
  };

  return (
    <HighlightGridContextProvider value={actions}>
      <HighlightGridGroupsComponent
        highlights={highlights}
        grouping={hourGrouping}
      />
    </HighlightGridContextProvider>
  );
};

export const getServerSideProps: GetServerSideProps<PoolViewBandProps> = async (
  props
) => {
  const { params } = props;

  if (
    !params?.id ||
    typeof params.id !== "string" ||
    !params.bandId ||
    typeof params.bandId !== "string"
  ) {
    return {
      notFound: true,
    };
  }

  const poolId = Number(params.id);

  if (Number.isNaN(poolId))
    return {
      notFound: true,
    };

  const bandId = params.bandId;

  const ssg = getServerHelpers(props.req);

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

export default PoolView;
