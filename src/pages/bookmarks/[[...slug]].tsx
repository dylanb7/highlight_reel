import { type GetServerSideProps, type NextPage } from "next";
import { getServerHelpers } from "../../utils/ssgHelper";
import { api } from "../../utils/trpc";
import { useMemo } from "react";
import {
  bookmarkActionUpdate,
  likeActionUpdate,
} from "../../components/contexts/action-types";
import { FeedContextProvider } from "../../components/contexts/feed-context";
import { ContinuousFeed } from "../../components/highlight-components/highlight-feed";
import { type HighlightVideo } from "../../types/highlight-out";

const FeedWithStart: NextPage<{ startTime?: number }> = ({ startTime }) => {
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
  } = api.user.getUserBookmarkedVideosPaginated.useInfiniteQuery(queryKey, {
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
      async onMutate(variables) {
        await util.user.getUserBookmarkedVideosPaginated.cancel(queryKey);
        const prev =
          util.user.getUserBookmarkedVideosPaginated.getInfiniteData(queryKey);
        if (prev) {
          util.user.getUserBookmarkedVideosPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: bookmarkActionUpdate(prev, variables),
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.user.getUserBookmarkedVideosPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
      },
      onSettled() {
        void util.user.getUserBookmarkedVideosPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      async onMutate(variables) {
        await util.user.getUserBookmarkedVideosPaginated.cancel(queryKey);
        const prev =
          util.user.getUserBookmarkedVideosPaginated.getInfiniteData(queryKey);
        if (prev) {
          util.user.getUserBookmarkedVideosPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: likeActionUpdate(prev, variables),
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.user.getUserBookmarkedVideosPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
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
        backPath={`/profile`}
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
        from={"Bookmarked Videos"}
      />
    </FeedContextProvider>
  );
};

export const getServerSideProps: GetServerSideProps<{
  startTime?: number;
}> = async (props) => {
  const { params } = props;

  const slug = params?.slug;

  const parsedSlug = slug ? Number(slug[0]) : undefined;

  const startTime = Number.isNaN(parsedSlug) ? undefined : parsedSlug;

  const ssg = getServerHelpers(props.req);

  await ssg.user.getUserBookmarkedVideosPaginated.prefetchInfinite({
    initialCursor: startTime,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      startTime,
    },
  };
};

export default FeedWithStart;
