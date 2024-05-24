import { useRouter } from "next/router";
import { api } from "~/utils/trpc";
import { ContinuousNonrouterFeed, IndexedFeed } from "./highlight-feed";
import { FeedContextProvider } from "../contexts/feed-context";
import { useMemo } from "react";
import { type UrlObject } from "url";
import { ShareButtonProvider } from "../contexts/share-context";
import { type BaseHighlight } from "~/server/types/highlight-out";

const DiscoverableFeedPage: React.FC<{ backPath: UrlObject }> = ({
  backPath,
}) => {
  const { slug, id, bandId } = useRouter().query;
  const initialCursorParse = Number(slug?.at(0));
  const lengthParse = Number(slug?.at(2));
  const initialCursor = Number.isInteger(initialCursorParse)
    ? initialCursorParse
    : undefined;
  const length = Number.isInteger(lengthParse) ? lengthParse : undefined;

  const reelId = typeof id === "string" ? Number(id) : 0;

  const band = typeof bandId === "string" ? bandId : undefined;
  return (
    <ShareButtonProvider
      value={(highlight: BaseHighlight): string => {
        if (band)
          return `/reels/${encodeURIComponent(
            reelId
          )}/band/${encodeURIComponent(band)}/feed/${encodeURIComponent(
            highlight.timestampUtc ?? ""
          )}`;
        return `/reels/${encodeURIComponent(reelId)}/feed/${encodeURIComponent(
          highlight.timestampUtc ?? ""
        )}`;
      }}
    >
      {length && initialCursor ? (
        <Grouped
          id={reelId}
          bandId={band}
          initialCursor={initialCursor}
          length={length}
          backPath={backPath}
        />
      ) : (
        <Continuous
          id={reelId}
          initialCursor={initialCursor}
          bandId={band}
          backPath={backPath}
        />
      )}
    </ShareButtonProvider>
  );
};

const Continuous: React.FC<{
  id: number;
  initialCursor?: number;
  bandId?: string;
  backPath: UrlObject;
}> = ({ id, initialCursor, bandId, backPath }) => {
  const util = api.useUtils();

  const queryKey = {
    reelId: id,
    initialCursor,
    bands: bandId ? [bandId] : undefined,
  };

  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isLoading,
    hasPreviousPage,
    fetchPreviousPage,
  } = api.reel.getHighlightVideosPaginated.useInfiniteQuery(queryKey, {
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    getPreviousPageParam: (lastPage) => lastPage.prevCursor,
  });

  const highlights = useMemo(() => {
    return data?.pages.flatMap((page) => page.highlights) ?? [];
  }, [data]);

  const { mutate: bookmark, isPending: bookmarking } =
    api.user.toggleHighlight.useMutation({
      onSettled() {
        void util.reel.getHighlightVideosPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isPending: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        void util.reel.getHighlightVideosPaginated.invalidate(queryKey);
      },
    });

  const next = async () => {
    const { data } = await fetchNextPage();
    return data?.pages.at(-1)?.highlights.at(0)?.timestamp;
  };

  const prev = async () => {
    const { data } = await fetchPreviousPage();
    return data?.pages.at(0)?.highlights.at(0)?.timestamp;
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
      <ContinuousNonrouterFeed
        highlights={highlights ?? []}
        fetching={isFetching || isLoading}
        backPath={backPath}
        hasNext={hasNextPage}
        hasPrev={hasPreviousPage}
        next={next}
        prev={prev}
        from={""}
      />
    </FeedContextProvider>
  );
};

const Grouped: React.FC<{
  id: number;
  initialCursor: number;
  length: number;
  bandId?: string;
  backPath: UrlObject;
}> = ({ id, initialCursor, length, bandId, backPath }) => {
  const util = api.useUtils();

  const queryKey = {
    reelId: id,
    amount: length,
    cursor: initialCursor,
    bands: bandId ? [bandId] : undefined,
  };

  const { data, isLoading } = api.reel.getHighlightBundle.useQuery(queryKey, {
    refetchOnWindowFocus: false,
  });

  const highlights = useMemo(() => data?.highlights ?? [], [data?.highlights]);

  const { mutate: bookmark, isPending: bookmarking } =
    api.user.toggleHighlight.useMutation({
      onSettled() {
        void util.reel.getHighlightBundle.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isPending: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        void util.reel.getHighlightBundle.invalidate(queryKey);
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
      <IndexedFeed
        highlights={highlights}
        from={data?.name ?? undefined}
        initial={initialCursor ?? undefined}
        fetching={isLoading}
        backPath={backPath}
      />
    </FeedContextProvider>
  );
};

export default DiscoverableFeedPage;
