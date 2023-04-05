import type { NextPage, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { IndexedFeed } from "../../../../../components/highlight-components/highlight-feed";
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

  const { data, isLoading } = api.pool.getHighlightBundle.useQuery({
    poolId: id,
    amount: bundleLength,
    cursor: addExt(startId),
  });

  return (
    <IndexedFeed
      highlights={data?.highlights ?? []}
      from={data?.name ?? undefined}
      initial={Number.isNaN(start) ? undefined : start}
      fetching={isLoading}
      backPath={`/reels/${encodeURIComponent(id)}`}
    />
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
