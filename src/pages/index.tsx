import { GetServerSidePropsContext, type NextPage } from "next";

import { trpc } from "../utils/trpc";
import { LoadingSpinner } from "../components/loading";
import { PoolComponent } from "../components/highlight-pool-card";
import { UserFinish } from "../components/user-finish";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import { getServerAuthSession } from "../server/common/get-server-auth-session";
import * as Tab from "@radix-ui/react-tabs";
import {
  FollowedPoolScroll,
  PoolScroll,
  ProfileData,
  ProfileHighlights,
} from "../components/profile-components";
import * as ScrollArea from "@radix-ui/react-scroll-area";

const UnauthedContent = () => {
  const loadAmount = 5;

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {pools.map((value) => (
            <PoolComponent key={value.id} pool={value} />
          ))}
        </div>
        {hasNextPage && (
          <button
            className="mb-5 rounded-full bg-indigo-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
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
        amount: 5,
        userId: session?.user?.id,
        dicover: true,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  const pools = data?.pages.flatMap((page) => page.pools) ?? [];

  return (
    <ScrollArea.Root className="overflow-hidden">
      <p className="mb-4 text-center text-2xl font-semibold text-slate-900 dark:text-white">
        Discover Reels
      </p>
      <ScrollArea.Viewport className="h-full w-full bg-white dark:bg-slate-800">
        <div className="grid auto-cols-auto items-center justify-center gap-4 md:gap-8">
          {isLoading && <LoadingSpinner loadingType={"Loading discover"} />}
          {data &&
            pools.map((reel) => <PoolComponent key={reel.id} pool={reel} />)}
          {data && pools.length == 0 && (
            <p className="text font-semibold text-slate-900">
              No New Reels to Discover
            </p>
          )}
          {hasNextPage && (
            <div className="flex items-center justify-center">
              <button
                className="w-fit rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
                onClick={() => fetchNextPage()}
                disabled={isLoading || data === null}
              >
                Load More
              </button>
            </div>
          )}
          <div className="pb-64" />
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

  const { data: profile, isLoading } = trpc.user.profileQuery.useQuery(
    session!.user!.id
  );

  if (isLoading) return <LoadingSpinner loadingType={""} />;

  if (!profile) {
    return <p>Invalid Config</p>;
  }

  if (!profile.username || profile.public == null) {
    return <UserFinish />;
  }

  return (
    <Tab.Root className="flex flex-col" defaultValue="discover">
      <div className="inline-block">
        <Tab.Content value="discover" className="pt-10">
          <DiscoverFeed />
        </Tab.Content>
        <Tab.Content
          value="profile"
          className="flex flex-col justify-start pt-10"
        >
          <ProfileData user={profile} />
          <div className="pb-4" />
          <FollowedPoolScroll id={profile.id} refId={session?.user?.id} />
          <PoolScroll pools={profile.ownedPools} title={"Owned Reels"} />
          <PoolScroll pools={profile.modPools} title={"Mod Reels"} />
          <ProfileHighlights id={profile.id} refId={session?.user?.id} />
        </Tab.Content>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-50 bg-gray-200 pb-3 dark:bg-slate-700">
        <div className="mx-5 mt-3 sm:w-fit">
          <Tab.List className="flex flex-row justify-around gap-8 rounded-lg bg-white p-3 shadow-lg dark:bg-slate-900 sm:justify-end">
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
