import { type GetServerSideProps, type NextPage } from "next";
import React, { useMemo } from "react";
import { FeedContextProvider } from "../../../../../../components/contexts/feed-context";
import {
  ContinuousFeed,
  IndexedFeed,
} from "../../../../../../components/highlight-components/highlight-feed";
import { type HighlightVideo } from "../../../../../../types/highlight-out";
import { api } from "../../../../../../utils/trpc";
import { getServerHelpers } from "../../../../../../utils/ssgHelper";

interface BandProps {
  wristbandId: string;
  poolId: number;
  initialCursor?: number | null;
  length?: number | null;
}

const BandFeed: NextPage<BandProps> = (props) => {
  if (props.length && props.initialCursor)
    return (
      <GroupedBandFeed
        poolId={props.poolId}
        wristbandId={props.wristbandId}
        initialCursor={props.initialCursor}
        length={props.length}
      />
    );

  return (
    <ContinuousBandFeed
      poolId={props.poolId}
      wristbandId={props.wristbandId}
      initialCursor={props.initialCursor}
    />
  );
};

const ContinuousBandFeed: React.FC<BandProps> = ({
  poolId,
  wristbandId,
  initialCursor,
}) => {
  const util = api.useContext();

  const queryKey: BandProps = {
    poolId,
    wristbandId,
    initialCursor,
    length,
  };

  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetching,
    hasPreviousPage,
    fetchPreviousPage,
  } = api.pool.getWristbandVideosPaginated.useInfiniteQuery(queryKey, {
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const highlights = useMemo(() => {
    return data?.pages.flatMap((page) => page.highlights) ?? [];
  }, [data]);

  const highlightMap = useMemo(() => {
    const highlightMap = new Map<string, HighlightVideo>();

    for (const highlight of highlights) {
      highlightMap.set(highlight.id, highlight);
    }
    return highlightMap;
  }, [highlights]);

  const { mutate: bookmark, isLoading: bookmarking } =
    api.user.toggleHighlight.useMutation({
      onSettled() {
        void util.pool.getWristbandVideosPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        void util.pool.getWristbandVideosPaginated.invalidate(queryKey);
      },
    });

  return (
    <FeedContextProvider
      value={{
        bookmark: (id) => {
          const highlight = highlightMap.get(id);
          if (!highlight) return;
          bookmark({ add: !highlight.bookmarked, highlightId: highlight.id });
        },
        like: (id) => {
          const highlight = highlightMap.get(id);
          if (!highlight) return;
          upvote({
            like: !highlight.upvoted,
            highlightId: highlight.id,
          });
        },
        disabled: bookmarking || upvoting,
      }}
    >
      <ContinuousFeed
        highlights={highlights ?? []}
        fetching={isFetching}
        backPath={`/reels/${encodeURIComponent(
          poolId
        )}/band/${encodeURIComponent(wristbandId)}`}
        hasNext={hasNextPage ?? false}
        hasPrev={hasPreviousPage ?? false}
        next={async () => {
          return (await fetchNextPage()).data?.pages.at(-1)?.highlights.at(0)
            ?.id;
        }}
        prev={async () => {
          return (await fetchPreviousPage()).data?.pages.at(0)?.highlights.at(0)
            ?.id;
        }}
        from={""}
      />
    </FeedContextProvider>
  );
};

const GroupedBandFeed: React.FC<BandProps> = ({
  poolId,
  wristbandId,
  initialCursor,
  length,
}) => {
  const util = api.useContext();

  const queryKey = {
    poolId,
    bandId: wristbandId,
    amount: length!,
    cursor: initialCursor!,
  };

  const { data, isLoading } = api.pool.getWristbandHighlightBundle.useQuery(
    queryKey,
    {
      refetchOnWindowFocus: false,
    }
  );

  const highlights = useMemo(() => data?.highlights ?? [], [data?.highlights]);

  const highlightMap = useMemo(() => {
    const highlightMap = new Map<string, HighlightVideo>();

    for (const highlight of highlights) {
      highlightMap.set(highlight.id, highlight);
    }
    return highlightMap;
  }, [highlights]);

  const { mutate: bookmark, isLoading: bookmarking } =
    api.user.toggleHighlight.useMutation({
      onSettled() {
        void util.pool.getWristbandHighlightBundle.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        void util.pool.getWristbandHighlightBundle.invalidate(queryKey);
      },
    });

  return (
    <FeedContextProvider
      value={{
        bookmark: (id) => {
          const highlight = highlightMap.get(id);
          if (!highlight) return;
          bookmark({ add: !highlight.bookmarked, highlightId: highlight.id });
        },
        like: (id) => {
          const highlight = highlightMap.get(id);
          if (!highlight) return;
          upvote({
            like: !highlight.upvoted,
            highlightId: highlight.id,
          });
        },
        disabled: bookmarking || upvoting,
      }}
    >
      <IndexedFeed
        highlights={data?.highlights ?? []}
        from={data?.name ?? undefined}
        initial={initialCursor ?? undefined}
        fetching={isLoading}
        backPath={`/reels/${encodeURIComponent(
          poolId
        )}/band/${encodeURIComponent(wristbandId)}/`}
      />
    </FeedContextProvider>
  );
};

export const getServerSideProps: GetServerSideProps<BandProps> = async (
  props
) => {
  const { params } = props;

  if (!params) return { notFound: true };

  const { id, bandId, slug } = params;

  if (typeof id !== "string" || typeof bandId !== "string") {
    return {
      notFound: true,
    };
  }

  const poolId = Number(id);

  if (Number.isNaN(poolId))
    return {
      notFound: true,
    };

  const initialCursorParse = Number(slug?.at(0));
  const lengthParse = Number(slug?.at(1));

  const initialCursor = Number.isNaN(initialCursorParse)
    ? undefined
    : initialCursorParse;
  const length = Number.isNaN(lengthParse) ? undefined : lengthParse;

  const ssg = await getServerHelpers(props.req);

  if (length === undefined) {
    await ssg.pool.getWristbandVideosPaginated.prefetchInfinite({
      poolId,
      wristbandId: bandId,
      initialCursor: Number.isNaN(initialCursor) ? undefined : initialCursor,
    });
  } else {
    await ssg.pool.getWristbandHighlightBundle.prefetch({
      poolId,
      cursor: initialCursor ?? 0,
      amount: length,
      bandId,
    });
  }

  return {
    props: {
      trpcState: ssg.dehydrate(),
      poolId,
      initialCursor,
      length,
      wristbandId: bandId,
    },
  };
};

export default BandFeed;
