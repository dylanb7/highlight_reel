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

import { PersonIcon, CameraIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/router";
import { PoolButtonProvider } from "../components/contexts/follow-pool-context";
import type { PoolInfo } from "../types/pool-out";
import type { ButtonContext } from "../components/contexts/button-types";

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

  const util = trpc.useContext();

  const { data, hasNextPage, fetchNextPage, isLoading } =
    trpc.pool.getPublicPoolsPaginated.useInfiniteQuery(
      {
        amount: amount,
        userId: session?.user?.id,
        dicover: discover,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  const queryKey = {
    cursor: data?.pages.at(-1)?.nextCursor,
    userId: session?.user?.id,
    discover: discover,
    amount: amount,
  };

  const pools = data?.pages.flatMap((page) => page.info) ?? [];

  const poolMap = new Map<string, PoolInfo>();

  for (const pool of pools) {
    poolMap.set(pool.id, pool);
  }

  const { mutate: add, isLoading: adding } = trpc.user.addPool.useMutation({
    async onMutate() {
      await util.pool.getPublicPoolsPaginated.cancel(queryKey);
      const prev = util.pool.getPublicPoolsPaginated.getInfiniteData(queryKey);

      return { prev };
    },
    onError(_, __, context) {
      util.pool.getPublicPoolsPaginated.setInfiniteData(
        queryKey,
        context?.prev
      );
    },
    onSettled() {
      util.pool.getPublicPoolsPaginated.invalidate();
    },
  });

  const { mutate: remove, isLoading: removing } =
    trpc.user.removePool.useMutation({
      async onMutate() {
        await util.pool.getPublicPoolsPaginated.cancel(queryKey);
        const prev =
          util.pool.getPublicPoolsPaginated.getInfiniteData(queryKey);
        return { prev };
      },
      onError(_, __, context) {
        util.pool.getPublicPoolsPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
      },
      onSettled() {
        util.pool.getPublicPoolsPaginated.invalidate(queryKey);
      },
    });

  const buttonContext: ButtonContext = {
    action: (poolId) => {
      if (!session || !session.user) return;
      const poolInfo = poolMap.get(poolId);
      if (!poolInfo || !poolInfo.followInfo) return;
      if (poolInfo.followInfo.follows || poolInfo.followInfo.requested) {
        remove({
          poolId: poolId,
          userId: session.user.id,
          requested: poolInfo.followInfo.requested,
        });
      } else {
        add({
          poolId: poolId,
          userId: session.user.id,
          isPublic: poolInfo.public,
        });
      }
    },
    state: (poolId) => {
      const poolInfo = poolMap.get(poolId);
      return {
        follows: poolInfo?.followInfo?.follows ?? false,
        pending: poolInfo?.followInfo?.requested ?? false,
        disabled: adding || removing,
      };
    },
  };

  return (
    <ScrollArea.Root className="h-full w-full overflow-hidden">
      <ScrollArea.Viewport className="h-full w-full">
        <PoolButtonProvider value={buttonContext}>
          <div className="flex flex-col items-center justify-center">
            <p className="mb-2 pt-4 text-center text-2xl font-semibold text-slate-900 dark:text-white">
              {discover ? "Discover Reels" : "Public Reels"}
            </p>
            <div className="grid max-w-6xl grid-cols-1 items-center justify-center gap-4 py-4 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {isLoading && <LoadingSpinner loadingType={"Loading discover"} />}
              {data &&
                pools.map((reel) => (
                  <PoolComponent key={reel.id} pool={reel} />
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
        </PoolButtonProvider>
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
  const tabs = ["discover", "profile"];

  const useTabsValue = (): [
    TabsValue: number,
    TabsOnChange: (newVal: number) => void
  ] => {
    const router = useRouter();

    const QUERY_PARAM_TAB = "tab";

    const currentTab = router.query[QUERY_PARAM_TAB] ?? 0;

    return [
      Number(currentTab),
      (newValue: number) => {
        router.push(`/?${QUERY_PARAM_TAB}=${newValue}`);
      },
    ];
  };

  const { data: session } = useSession();

  const id = session?.user?.id;

  const [value, onChange] = useTabsValue();

  return (
    <Tab.Root
      className="flex flex-col"
      defaultValue={tabs[value]}
      onValueChange={(value) => {
        onChange(tabs.indexOf(value));
      }}
    >
      <div className="mb-14">
        <Tab.Content value="discover">
          <PoolsFeed discover={true} />
        </Tab.Content>
        <Tab.Content value="profile">
          {id ? (
            <ProfileLayout userId={id} />
          ) : (
            <p className="mb-2 pt-4 text-center text-2xl font-semibold text-slate-900 dark:text-white">
              Must be signed in to view profile
            </p>
          )}
        </Tab.Content>
      </div>

      <footer className="border-grey-300 fixed inset-x-0 bottom-0 z-20 h-14 border-t bg-white pb-3 shadow-lg dark:border-white dark:bg-slate-900">
        <div className="mx-5 mt-3">
          <Tab.List className="flex flex-row items-center justify-around gap-8 ">
            <Tab.Trigger
              value="discover"
              className="flex flex-col items-center text-xs font-semibold radix-state-active:text-indigo-500 radix-state-inactive:text-slate-900 hover:radix-state-inactive:text-indigo-700 dark:radix-state-inactive:text-white dark:hover:radix-state-inactive:text-indigo-300"
            >
              <CameraIcon className="h-6 w-6" />
              Discover
            </Tab.Trigger>
            <Tab.Trigger
              value="profile"
              className="flex flex-col items-center text-xs font-semibold radix-state-active:text-indigo-500 radix-state-inactive:text-slate-900 hover:radix-state-inactive:text-indigo-700 dark:radix-state-inactive:text-white dark:hover:radix-state-inactive:text-indigo-300"
            >
              <PersonIcon className="h-6 w-6" />
              Profile
            </Tab.Trigger>
          </Tab.List>
        </div>
      </footer>
    </Tab.Root>
  );
};

const ProfileLayout: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: profile, isLoading } = trpc.user.profileQuery.useQuery({
    user: userId,
    ref: userId,
  });

  if (isLoading)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner loadingType={null} />
      </div>
    );

  if (!profile)
    return (
      <p className="mb-2 pt-4 text-center text-2xl font-semibold text-slate-900 dark:text-white">
        Error fetching your profile
      </p>
    );

  if (!profile.username || profile.public == null) {
    return <UserFinish />;
  }

  return <ProfileComponent profile={profile} />;
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
