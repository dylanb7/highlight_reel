import type { GetStaticProps, NextPage } from "next";
import { ContinuousFeed } from "../../../../../components/highlight-components/highlight-feed";
import { addExt } from "../../../../../utils/highlightUtils";
import { generateSSGHelper } from "../../../../../utils/ssgHelper";
import { api } from "../../../../../utils/trpc";

export const FeedWithStart: NextPage<{ id: string; startId: string }> = ({
  id,
  startId,
}) => {
  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetching,
    hasPreviousPage,
    fetchPreviousPage,
  } = api.pool.getHighlightVideosPaginated.useInfiniteQuery({
    poolId: id,
    initialCursor: addExt(startId),
  });

  const highlights = data?.pages.flatMap((page) => page.highlights) ?? [];

  return (
    <ContinuousFeed
      highlights={highlights ?? []}
      fetching={isFetching}
      backPath={`/reels/${encodeURIComponent(id)}`}
      hasNext={hasNextPage ?? false}
      hasPrev={hasPreviousPage ?? false}
      fetchNext={async () => {
        return (await fetchNextPage()).data?.pages.at(-1)?.highlights.at(0)?.id;
      }}
      fetchPrev={async () => {
        return (await fetchPreviousPage()).data?.pages.at(0)?.highlights.at(0)
          ?.id;
      }}
    />
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

  await ssg.pool.getHighlightVideosPaginated.prefetchInfinite({
    poolId: id,
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
