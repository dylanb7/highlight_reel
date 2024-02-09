import { type NextPage } from "next";
import { useRouter } from "next/router";
import DiscoverableFeedPage from "~/components/highlight-components/discoverable-feed-page";

const ReelFeed: NextPage = () => {
  const { id } = useRouter().query;
  return (
    <DiscoverableFeedPage
      backPath={{ pathname: "/reels/[id]", query: { id } }}
    />
  );
};

export default ReelFeed;
