import type { NextPage, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { FeedContextProvider } from "../../../../../components/contexts/feed-context";
import { IndexedFeed } from "../../../../../components/highlight-components/highlight-feed";
import type { HighlightVideo } from "../../../../../types/highlight-out";
import { addExt } from "../../../../../utils/highlightUtils";
import { generateSSGHelper } from "../../../../../utils/ssgHelper";
import { api } from "../../../../../utils/trpc";

const GroupedFeed: NextPage<{
  id: string;
  startId: string;
  length: string;
}> = ({ id, startId, length }) => {
  const { query } = useRouter();

  const { current } = query;

  const start = typeof current === "string" ? parseInt(current) : undefined;

  const bundleLength = parseInt(length);

  const util = api.useContext();

  const queryKey = {
    poolId: id,
    amount: bundleLength,
    cursor: addExt(startId),
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
      async onMutate(variables) {
        await util.pool.getHighlightBundle.cancel(queryKey);
        const prev = util.pool.getHighlightBundle.getData(queryKey);
        if (prev) {
          const newHighlights = [...prev.highlights];
          const index = newHighlights.findIndex(
            (val) => val.id === variables.highlightId
          );
          const found = newHighlights.at(index);
          if (found) {
            found.bookmarked = variables.add;
            util.pool.getHighlightBundle.setData(queryKey, {
              ...prev,
              highlights: newHighlights,
            });
          }
        }
        return { prev };
      },
      onError(_, __, context) {
        util.pool.getHighlightBundle.setData(queryKey, context?.prev);
      },
      onSettled() {
        util.pool.getHighlightVideosPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      async onMutate(variables) {
        await util.pool.getHighlightBundle.cancel(queryKey);
        const prev = util.pool.getHighlightBundle.getData(queryKey);
        if (prev) {
          const newHighlights = [...prev.highlights];
          const index = newHighlights.findIndex(
            (val) => val.id === variables.highlightId
          );
          const found = newHighlights.at(index);
          if (found) {
            found.upvoted = variables.like ?? false;
            util.pool.getHighlightBundle.setData(queryKey, {
              ...prev,
              highlights: newHighlights,
            });
          }
        }
        return { prev };
      },
      onError(_, __, context) {
        util.pool.getHighlightBundle.setData(queryKey, context?.prev);
      },
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
        initial={Number.isNaN(start) ? undefined : start}
        fetching={isLoading}
        backPath={`/reels/${encodeURIComponent(id)}`}
      />
    </FeedContextProvider>
  );
};

export const getStaticProps: GetStaticProps<{
  id: string;
  startId: string;
  length: string;
}> = async (props) => {
  const { params } = props;

  if (!params) return { notFound: true };

  const { id, startId, length } = params;

  if (
    !id ||
    !startId ||
    !length ||
    typeof id !== "string" ||
    typeof startId !== "string" ||
    typeof length !== "string" ||
    Number.isNaN(parseInt(length))
  ) {
    return {
      notFound: true,
    };
  }

  const bundleLength = parseInt(length);

  const ssg = generateSSGHelper();

  await ssg.pool.getHighlightBundle.prefetch({
    poolId: id,
    amount: bundleLength,
    cursor: addExt(startId),
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      id,
      length,
      startId,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default GroupedFeed;
