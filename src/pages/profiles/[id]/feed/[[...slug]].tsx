import { GetServerSideProps, NextPage } from "next";
import { useMemo } from "react";
import { FeedContextProvider } from "../../../../components/contexts/feed-context";
import { ContinuousFeed } from "../../../../components/highlight-components/highlight-feed";
import { HighlightVideo } from "../../../../types/highlight-out";
import { getServerHelpers } from "../../../../utils/ssgHelper";
import { api } from "../../../../utils/trpc";

const FeedWithStart: NextPage<{ id: string; startTime?: number }> = ({
  id,
  startTime,
}) => {
  const util = api.useContext();

  const queryKey = {
    profileId: id,
    initialCursor: startTime,
  };

  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetching,
    hasPreviousPage,
    fetchPreviousPage,
  } = api.user.getBookmarkVideosPaginated.useInfiniteQuery(queryKey, {
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    getPreviousPageParam: (prevPage) => prevPage.prevCursor,
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
        util.user.getBookmarkVideosPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        util.user.getBookmarkVideosPaginated.invalidate(queryKey);
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
        backPath={`/profiles/${encodeURIComponent(id)}`}
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

export const getServerSideProps: GetServerSideProps<{
  id: string;
  startTime?: number;
}> = async (props) => {
  const { params } = props;

  const id = params?.id;

  if (!id || typeof id !== "string")
    return {
      notFound: true,
    };

  const slug = params?.slug;

  const startTime = slug ? Number(slug[0]) : undefined;

  const ssg = await getServerHelpers(props.req);

  await ssg.user.getBookmarkVideosPaginated.prefetchInfinite({
    profileId: id,
    initialCursor: Number.isNaN(startTime) ? undefined : startTime,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      id,
      startTime,
    },
  };
};

export default FeedWithStart;
