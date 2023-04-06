import type { GetStaticProps, NextPage } from "next";
import { ContinuousFeed } from "../../../../components/highlight-components/highlight-feed";
import { generateSSGHelper } from "../../../../utils/ssgHelper";
import { api } from "../../../../utils/trpc";

export const Group: NextPage<{ id: string }> = ({ id }) => {
  const {
    data,
    hasNextPage,
    fetchNextPage,
    hasPreviousPage,
    fetchPreviousPage,
    isFetching,
  } = api.pool.getHighlightVideosPaginated.useInfiniteQuery({
    poolId: id,
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
      from={""}
    />
  );
};

export const getStaticProps: GetStaticProps<{
  id: string;
}> = async (props) => {
  const { params } = props;

  if (!params) return { notFound: true };

  const { id } = params;

  if (typeof id !== "string") {
    return {
      notFound: true,
    };
  }

  const ssg = generateSSGHelper();

  await ssg.pool.getHighlightVideosPaginated.prefetchInfinite({
    poolId: id,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      id,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default Group;
