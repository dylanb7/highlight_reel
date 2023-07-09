import type { NextPage, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { LoadingSpinner } from "../../../../../../components/misc/loading";
import { removeExt } from "../../../../../../utils/highlightUtils";
import { generateSSGHelper } from "../../../../../../utils/ssgHelper";
import { api } from "../../../../../../utils/trpc";

const Redirect: NextPage<{ id: number; bandId: string }> = ({ id, bandId }) => {
  const { data, isLoading, isFetched } =
    api.pool.getFirstWristbandHighlight.useQuery({ poolId: id, bandId });

  const { query, replace } = useRouter();

  useEffect(() => {
    if (data) {
      replace({
        pathname: "/reels/[id]/band/[bandId]/feed/[startId]",
        query: {
          id: id,
          bandId: bandId,
          startId: encodeURIComponent(removeExt(data)),
        },
      });
    } else if (isFetched && !isLoading) {
      replace({
        pathname: "/reels/[id]/band/[bandId]",
        query: { id: id, bandId: bandId },
      });
    }
  }, [bandId, data, id, isFetched, isLoading, query, replace]);

  return <LoadingSpinner loadingType={null} />;
};

export const getStaticProps: GetStaticProps<{
  id: string;
  bandId: string;
}> = async (props) => {
  const { params } = props;

  if (!params) return { notFound: true };

  const { id, bandId } = params;

  if (typeof id !== "string" || typeof bandId !== "string") {
    return {
      notFound: true,
    };
  }

  const ssg = generateSSGHelper();

  await ssg.pool.getFirstWristbandHighlight.prefetch({
    poolId: id,
    bandId: bandId,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      id,
      bandId,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default Redirect;
