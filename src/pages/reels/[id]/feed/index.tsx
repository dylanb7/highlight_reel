import type { GetStaticProps, NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { LoadingSpinner } from "../../../../components/misc/loading";
import { removeExt } from "../../../../utils/highlightUtils";
import { generateSSGHelper } from "../../../../utils/ssgHelper";
import { api } from "../../../../utils/trpc";

const Group: NextPage<{ id: string }> = ({ id }) => {
  const { data, isLoading, isFetched } =
    api.pool.getFirstHighlightId.useQuery(id);

  const { push, query, back } = useRouter();

  useEffect(() => {
    if (data) {
      push({
        pathname: "/reels/[id]/feed/[startId]",
        query: {
          ...query,
          startId: encodeURIComponent(removeExt(data)),
        },
      });
    } else if (isFetched && !isLoading) {
      push({ pathname: "/reels/[id]", query: { id: id } });
    }
  }, [back, data, id, isFetched, isLoading, push, query]);

  return <LoadingSpinner loadingType={null} />;
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

  await ssg.pool.getFirstHighlightId.prefetch(id);

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
