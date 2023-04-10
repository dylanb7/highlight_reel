import type { NextPage, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { LoadingSpinner } from "../../components/misc/loading";
import { removeExt } from "../../utils/highlightUtils";
import { generateSSGHelper } from "../../utils/ssgHelper";
import { api } from "../../utils/trpc";

const Group: NextPage = () => {
  const { push, query, back } = useRouter();

  const { data, isLoading, isFetched } =
    api.user.getFirstUserBookmarkId.useQuery();

  useEffect(() => {
    if (data) {
      push({
        pathname: "/bookmarks/[startId]",
        query: {
          ...query,
          startId: encodeURIComponent(removeExt(data)),
        },
      });
    } else if (isFetched && !isLoading) {
      push({ pathname: "/", query: { tab: "profile" } });
    }
  }, [back, data, isFetched, isLoading, push, query]);

  return <LoadingSpinner loadingType={null} />;
};

export const getStaticProps: GetStaticProps = async () => {
  const ssg = generateSSGHelper();

  await ssg.user.getFirstUserBookmarkId.prefetch();

  return {
    props: {
      trpcState: ssg.dehydrate(),
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default Group;
