import { type NextPage } from "next";
import { useRouter } from "next/router";
import DiscoverableFeedPage from "~/components/highlight-components/discoverable-feed-page";

const BandFeed: NextPage = () => {
  const { id, bandId } = useRouter().query;
  return (
    <DiscoverableFeedPage
      backPath={{
        pathname: "/reels/[id]/band/[bandId]",
        query: { id, bandId },
      }}
    />
  );
};
export default BandFeed;
