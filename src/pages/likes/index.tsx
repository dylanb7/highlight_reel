import type { NextPage, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { LoadingSpinner } from "../../components/misc/loading";
import { generateSSGHelper } from "../../utils/ssgHelper";
import { api } from "../../utils/trpc";

const Group: NextPage = () => {
  const { push, query, back } = useRouter();

  const { data, isLoading, isFetched } = api.user.getFirstUserLikeId.useQuery();

  useEffect(() => {
    if (data) {
      push({
        pathname: "/likes/[startId]",
        query: {
          ...query,
          startId: encodeURIComponent(data),
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

  await ssg.user.getFirstUserLikeId.prefetch();

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
