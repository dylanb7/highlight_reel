import { GetServerSideProps, NextPage } from "next";
import React, { useMemo } from "react";
import { FeedContextProvider } from "../../../../components/contexts/feed-context";
import {
  ContinuousFeed,
  IndexedFeed,
} from "../../../../components/highlight-components/highlight-feed";
import { HighlightVideo } from "../../../../types/highlight-out";
import { getServerHelpers } from "../../../../utils/ssgHelper";
import { api } from "../../../../utils/trpc";

interface PoolProps {
  poolId: number;
  initialCursor?: number | null;
  length?: number | null;
}

const PoolFeed: NextPage<PoolProps> = (props) => {
  if (props.length && props.initialCursor)
    return (
      <GroupedPoolFeed
        poolId={props.poolId}
        initialCursor={props.initialCursor}
        length={props.length}
      />
    );

  return (
    <ContinuousPoolFeed
      poolId={props.poolId}
      initialCursor={props.initialCursor}
    />
  );
};

const ContinuousPoolFeed: React.FC<PoolProps> = ({ poolId, initialCursor }) => {
  const util = api.useContext();

  const queryKey: PoolProps = {
    poolId,
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
  } = api.pool.getHighlightVideosPaginated.useInfiniteQuery(queryKey, {
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
        util.pool.getHighlightVideosPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        util.pool.getHighlightVideosPaginated.invalidate(queryKey);
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
        backPath={`/reels/${encodeURIComponent(poolId)}`}
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

const GroupedPoolFeed: React.FC<PoolProps> = ({
  poolId,

  initialCursor,
  length,
}) => {
  const util = api.useContext();

  const queryKey = {
    poolId,
    amount: length!,
    cursor: initialCursor!,
  };

  const { data, isLoading } = api.pool.getHighlightBundle.useQuery(queryKey, {
    refetchOnWindowFocus: false,
  });

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
        util.pool.getHighlightBundle.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        util.pool.getHighlightBundle.invalidate(queryKey);
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
        backPath={`/reels/${encodeURIComponent(poolId)}`}
      />
    </FeedContextProvider>
  );
};

export const getServerSideProps: GetServerSideProps<PoolProps> = async (
  props
) => {
  const { params } = props;

  if (!params) return { notFound: true };

  const { id, slug } = params;

  if (typeof id !== "string") {
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
    await ssg.pool.getHighlightVideosPaginated.prefetchInfinite({
      poolId,
      initialCursor: Number.isNaN(initialCursor) ? undefined : initialCursor,
    });
  } else {
    ssg.pool.getHighlightBundle.prefetch({
      poolId,
      cursor: initialCursor ?? 0,
      amount: length,
    });
  }

  return {
    props: {
      trpcState: ssg.dehydrate(),
      poolId,
      initialCursor,
      length,
    },
  };
};

export default PoolFeed;
