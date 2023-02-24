import type { GetServerSidePropsContext, NextPage } from "next";
import { trpc } from "../utils/trpc";
import { LoadingSpinner } from "../components/loading";
import { PoolComponent } from "../components/highlight-pool-card";
import { UserFinish } from "../components/user-finish";
import { useSession } from "next-auth/react";
import React from "react";
import { getServerAuthSession } from "../server/common/get-server-auth-session";
import * as Tab from "@radix-ui/react-tabs";
import { ProfileComponent } from "../components/profile-components";
import * as ScrollArea from "@radix-ui/react-scroll-area";

const UnauthedContent = () => {
  return (
    <div className="pt-6">
      <PoolsFeed discover={false} />
    </div>
  );
};

const PoolsFeed: React.FC<{ discover: boolean }> = ({ discover }) => {
  const { data: session } = useSession();

  const amount = 5;

  const { data, hasNextPage, fetchNextPage, isLoading } =
    trpc.pool.getPublicPoolsPaginated.useInfiniteQuery(
      {
        amount: amount,
        userId: session?.user?.id,
        dicover: discover,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  const pools = data?.pages.flatMap((page) => page.info) ?? [];

  return (
    <ScrollArea.Root className="h-full w-full overflow-hidden">
      <ScrollArea.Viewport className="h-full w-full bg-white dark:bg-slate-800">
        <div className="flex flex-col items-center justify-center">
          <p className="mb-2 pt-4 text-center text-2xl font-semibold text-slate-900 dark:text-white">
            {discover ? "Discover Reels" : "Public Reels"}
          </p>
          <div className="grid max-w-6xl grid-cols-1 items-center justify-center gap-4 py-4 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {isLoading && <LoadingSpinner loadingType={"Loading discover"} />}
            {data &&
              pools.map((reel) => (
                <PoolComponent
                  key={reel.id}
                  pool={reel}
                  fetch={{
                    profile: undefined,
                    discover: {
                      userId: session?.user?.id ?? undefined,
                      amount: amount,
                      cursor: data.pages[data.pages.length - 1]?.nextCursor,
                      discover: discover,
                    },
                  }}
                />
              ))}
            {data && pools.length == 0 && (
              <p className="text font-semibold text-slate-900">
                No New Reels to Discover
              </p>
            )}
          </div>
          {hasNextPage && (
            <div className="mt-4 flex items-center justify-center">
              <button
                className="mb-4 w-fit rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
                onClick={() => fetchNextPage()}
                disabled={isLoading || data === null}
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        className="flex w-2 rounded-full bg-slate-300 hover:bg-slate-400"
      >
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-900" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
};

const AuthedContent = () => {
  const { data: session } = useSession();

  const id = session?.user?.id ?? "";

  const { data: profile, isLoading } = trpc.user.profileQuery.useQuery({
    user: id,
    ref: id,
  });

  if (isLoading) return <LoadingSpinner loadingType={""} />;

  if (!profile) {
    return <p>Invalid Config</p>;
  }

  if (!profile.username || profile.public == null) {
    return <UserFinish />;
  }

  return (
    <Tab.Root className="flex flex-col" defaultValue={"discover"}>
      <div className="mb-16">
        <Tab.Content value="discover">
          <PoolsFeed discover={true} />
        </Tab.Content>
        <Tab.Content value="profile">
          <ProfileComponent profile={profile} />
        </Tab.Content>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-50 h-16 bg-gray-200 pb-3 dark:bg-slate-700">
        <div className="mx-5 mt-3">
          <Tab.List className="flex flex-row justify-around gap-8 rounded-lg bg-white p-2 shadow-lg dark:bg-slate-900">
            <Tab.Trigger
              value="discover"
              className="text-xl font-semibold radix-state-active:text-indigo-500 radix-state-inactive:text-slate-900 hover:radix-state-inactive:text-indigo-700 dark:radix-state-inactive:text-white dark:hover:radix-state-inactive:text-indigo-300"
            >
              Discover
            </Tab.Trigger>
            <Tab.Trigger
              value="profile"
              className="text-xl font-semibold radix-state-active:text-indigo-500 radix-state-inactive:text-slate-900 hover:radix-state-inactive:text-indigo-700 dark:radix-state-inactive:text-white dark:hover:radix-state-inactive:text-indigo-300"
            >
              Profile
            </Tab.Trigger>
          </Tab.List>
        </div>
      </footer>
    </Tab.Root>
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
