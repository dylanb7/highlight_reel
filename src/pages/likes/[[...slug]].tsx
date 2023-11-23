import { type GetServerSideProps, type NextPage } from "next";
import { getServerHelpers } from "../../utils/ssg-helper";
import { api } from "../../utils/trpc";
import { useMemo } from "react";
import { FeedContextProvider } from "../../components/contexts/feed-context";
import { ContinuousFeed } from "../../components/highlight-components/highlight-feed";

const UserLikesFeed: NextPage<{ startTime?: number }> = ({ startTime }) => {
  const util = api.useUtils();

  const queryKey = {
    initialCursor: startTime,
  };

  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetching,
    hasPreviousPage,
    fetchPreviousPage,
  } = api.user.getLikedVideosPaginated.useInfiniteQuery(queryKey, {
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    getPreviousPageParam: (prevPage) => prevPage.prevCursor,
  });

  const highlights = useMemo(() => {
    return data?.pages.flatMap((page) => page.highlights) ?? [];
  }, [data]);

  const { mutate: bookmark, isLoading: bookmarking } =
    api.user.toggleHighlight.useMutation({
      onSettled() {
        void util.user.getLikedVideosPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        void util.user.getLikedVideosPaginated.invalidate(queryKey);
      },
    });

  return (
    <FeedContextProvider
      value={{
        bookmark: (highlight) => {
          bookmark({ add: !highlight.bookmarked, highlightId: highlight.id });
        },
        like: (highlight) => {
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
        backPath={`/?tab=profile`}
        hasNext={hasNextPage ?? false}
        hasPrev={hasPreviousPage ?? false}
        next={async () => {
          return (
            (await fetchNextPage()).data?.pages.at(-1)?.highlights.at(0)
              ?.timestampUtc ?? undefined
          );
        }}
        prev={async () => {
          return (
            (await fetchPreviousPage()).data?.pages.at(0)?.highlights.at(0)
              ?.timestampUtc ?? undefined
          );
        }}
        from={"Liked Videos"}
      />
    </FeedContextProvider>
  );
};

export const getServerSideProps: GetServerSideProps<{
  startTime?: number;
}> = async (props) => {
  const { params } = props;

  const slug = params?.slug;

  const startTime = slug ? Number(slug[0]) : undefined;

  const ssg = getServerHelpers(props.req);

  await ssg.user.getLikedVideosPaginated.prefetchInfinite({
    initialCursor: Number.isNaN(startTime) ? undefined : startTime,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      startTime,
    },
  };
};

export default UserLikesFeed;
