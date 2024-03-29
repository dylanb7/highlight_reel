import { type NextPage } from "next";
import { useMemo } from "react";
import { FeedContextProvider } from "../../../../components/contexts/feed-context";
import { ContinuousFeed } from "../../../../components/highlight-components/highlight-feed";

import { api } from "../../../../utils/trpc";
import { useRouter } from "next/router";
import { useAuth } from "@clerk/nextjs";

const ProfileBookmarksFeed: NextPage = () => {
  const { id, slug } = useRouter().query;

  const profileId = id as "string";

  const currentId = useAuth();

  const startTime =
    slug && Number.isInteger(slug[0]) ? Number(slug[0]) : undefined;

  const util = api.useUtils();

  const queryKey = {
    profileId,
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

  const { mutate: bookmark, isPending: bookmarking } =
    api.user.toggleHighlight.useMutation({
      onSettled() {
        void util.user.getBookmarkVideosPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isPending: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        void util.user.getBookmarkVideosPaginated.invalidate(queryKey);
      },
    });

  const next = async () => {
    const nextPage = await fetchNextPage();
    return (
      nextPage.data?.pages.at(-1)?.highlights.at(0)?.timestampUtc ?? undefined
    );
  };

  const prev = async () => {
    const nextPage = await fetchPreviousPage();
    return (
      nextPage.data?.pages.at(0)?.highlights.at(0)?.timestampUtc ?? undefined
    );
  };

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
        backPath={
          currentId.userId === id
            ? { pathname: "profile" }
            : { pathname: "/profiles/[id]", query: { id } }
        }
        hasNext={hasNextPage ?? false}
        hasPrev={hasPreviousPage ?? false}
        next={next}
        prev={prev}
        from={""}
      />
    </FeedContextProvider>
  );
};

export default ProfileBookmarksFeed;
