import type { NextPage } from "next";
import { useRouter } from "next/router";
import ReelPage from "~/components/reel-components/reel-page";

const BaseView: NextPage = () => {
  const { query } = useRouter();
  const { id } = query;
  return <ReelPage basePath={{ pathname: "/reels/[id]", query: { id } }} />;
};

export default BaseView;
