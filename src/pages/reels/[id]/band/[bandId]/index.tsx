import ReelPage from "~/components/reel-components/reel-page";
import { useRouter } from "next/router";
import { type NextPage } from "next";

const WristbandView: NextPage = () => {
  const { query } = useRouter();
  const { id, bandId } = query;
  return (
    <ReelPage
      basePath={{
        pathname: "/reels/[id]/band/[bandId]",
        query: { id, bandId },
      }}
    />
  );
};

export default WristbandView;
