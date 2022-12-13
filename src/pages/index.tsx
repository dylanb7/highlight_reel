import { GetServerSidePropsContext, type NextPage } from "next";

import { trpc } from "../utils/trpc";
import { LoadingSpinner } from "../components/loading";
import { PoolComponent } from "../components/highlight-pool-card";
import { UserFinish } from "../components/user-finish";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import { getServerAuthSession } from "../server/common/get-server-auth-session";
import { TabSelect } from "../components/tab-select";
import { date } from "zod";

const UnauthedContent = () => {
  const loadAmount = 1;

  const { data, hasNextPage, fetchNextPage, isLoading } =
    trpc.pool.getPublicPoolsPaginated.useInfiniteQuery(
      {
        amount: loadAmount,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  if (isLoading) return <LoadingSpinner loadingType={"Loading Reels"} />;

  const pools = data?.pages.flatMap((page) => page.pools) ?? [];

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-12 px-4 py-16">
        <p className="text-3xl font-bold text-slate-900">
          {pools.length == 0 ? "No Reels" : "Public Reels"}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          {pools.map((value) => (
            <PoolComponent key={value.id} pool={value} />
          ))}
        </div>
        {hasNextPage && (
          <button
            className="rounded-full bg-indigo-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
            onClick={() => fetchNextPage()}
            disabled={isLoading || data === null}
          >
            Load More
          </button>
        )}
      </div>
    </>
  );
};

const DiscoverFeed: React.FC = () => {
  const { data: session } = useSession();

  const { data, hasNextPage, fetchNextPage, isLoading } =
    trpc.pool.getPublicPoolsPaginated.useInfiniteQuery(
      {
        amount: 1,
        userId: session?.user?.id,
        dicover: true,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  const pools = data?.pages.flatMap((page) => page.pools) ?? [];

  return (
    <div className="grid grid-flow-row items-center justify-center gap-4">
      {isLoading && <LoadingSpinner loadingType={"Loading discover"} />}
      {data && pools.map((reel) => <PoolComponent key={reel.id} pool={reel} />)}
      {data && pools.length == 0 && (
        <p className="text font-semibold text-slate-900">
          No New Reels to Discover
        </p>
      )}
      {hasNextPage && (
        <button
          className="rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
          onClick={() => fetchNextPage()}
          disabled={isLoading || data === null}
        >
          Load More
        </button>
      )}
    </div>
  );
};

const ReelsFeed: React.FC = () => {
  const { data: session } = useSession();

  const { data: reels, isLoading } = trpc.user.getAllPools.useQuery(
    session!.user!.id
  );

  return (
    <div className="grid grid-flow-row items-center justify-center gap-4">
      {isLoading && <LoadingSpinner loadingType={"Loading your reels"} />}
      {reels &&
        reels.pools.map((reel) => <PoolComponent key={reel.id} pool={reel} />)}
      {reels && reels.pools.length == 0 && (
        <p className="text font-semibold text-slate-900">No Reels Followed</p>
      )}
    </div>
  );
};

const AuthedContent = () => {
  const { data: session } = useSession();

  const { data: profile } = trpc.user.fromId.useQuery(session!.user!.id);

  const tabs = ["REELS", "HIGHLIGHTS", "PROFILE"];

  const reelTabs = ["FOLLOWING", "DISCOVER"];

  const [openTab, setOpenTab] = useState("REELS");

  const [reelTab, setReelTab] = useState("FOLLOWING");

  if (!profile) {
    return <p>Invalid Config</p>;
  }

  if (!profile.username || profile.public == null) {
    return <UserFinish />;
  }

  return (
    <>
      <p className="my-4 text-center text-3xl font-bold text-slate-900">
        {profile.username}
      </p>
      <div className="mx-4">
        <TabSelect
          initial={tabs[0]!}
          tabs={tabs}
          small={false}
          onChange={(tab: string) => {
            setOpenTab(tab);
          }}
        >
          {openTab == tabs[0] && (
            <div className="mx-10">
              <TabSelect
                initial={reelTabs[0]!}
                tabs={reelTabs}
                small={false}
                onChange={(tab: string) => {
                  setReelTab(tab);
                }}
              >
                {reelTab == reelTabs[0] && <ReelsFeed />}
                {reelTab == reelTabs[1] && <DiscoverFeed />}
              </TabSelect>
            </div>
          )}
          {openTab == tabs[1] && (
            <p className="text-slate-900">Highlight Reels</p>
          )}
        </TabSelect>
      </div>
    </>
  );
};

const HomePage: NextPage = () => {
  const { data: session } = useSession();

  if (!session) {
    return <UnauthedContent />;
  }

  return <AuthedContent />;
};

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  return {
    props: {
      session: await getServerAuthSession(ctx),
    },
  };
};

export default HomePage;
