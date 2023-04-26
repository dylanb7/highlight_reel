import type { GetStaticProps, NextPage } from "next";
import { useMemo } from "react";
import {
  bookmarkActionUpdate,
  likeActionUpdate,
} from "../../../../components/contexts/action-types";
import { FeedContextProvider } from "../../../../components/contexts/feed-context";
import { ContinuousFeed } from "../../../../components/highlight-components/highlight-feed";
import type { HighlightVideo } from "../../../../types/highlight-out";
import { addExt } from "../../../../utils/highlightUtils";
import { generateSSGHelper } from "../../../../utils/ssgHelper";
import { api } from "../../../../utils/trpc";

const FeedWithStart: NextPage<{ id: string; startId: string }> = ({
  id,
  startId,
}) => {
  const util = api.useContext();

  const queryKey = {
    profileId: id,
    initialCursor: addExt(startId),
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
        await util.user.getBookmarkVideosPaginated.cancel(queryKey);
        const prev =
          util.user.getBookmarkVideosPaginated.getInfiniteData(queryKey);
        if (prev) {
          util.user.getBookmarkVideosPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: bookmarkActionUpdate(prev, variables),
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.user.getBookmarkVideosPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
      },
      onSettled() {
        util.user.getBookmarkVideosPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      async onMutate(variables) {
        await util.user.getBookmarkVideosPaginated.cancel(queryKey);
        const prev =
          util.user.getBookmarkVideosPaginated.getInfiniteData(queryKey);
        if (prev) {
          util.user.getBookmarkVideosPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: likeActionUpdate(prev, variables),
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.user.getBookmarkVideosPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
      },
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
        from={data?.pages.at(0)?.name ?? ""}
      />
      \
    </FeedContextProvider>
  );
};

export const getStaticProps: GetStaticProps<{
  id: string;
  startId: string;
}> = async (props) => {
  const { params } = props;

  if (!params) return { notFound: true };

  const { id, startId } = params;

  if (typeof id !== "string" || typeof startId !== "string") {
    return {
      notFound: true,
    };
  }

  const ssg = generateSSGHelper();

  await ssg.user.getBookmarkVideosPaginated.prefetchInfinite({
    profileId: id,
    initialCursor: startId,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      id,
      startId,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default FeedWithStart;
