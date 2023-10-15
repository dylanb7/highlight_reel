import * as Separator from "@radix-ui/react-separator";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useEffect, useMemo, useState } from "react";
import { PoolComponent } from "./highlight-pool-card";
import { ProfileList } from "./profile-scroll-components";
import { ProfileFollowButton } from "./follow-profile";

import type { UserInfo } from "../types/user-out";

import { ProfileButtonProvider } from "./contexts/follow-profile-context";
import type { ButtonContext } from "./contexts/button-types";
import { api } from "../utils/trpc";
import { HighlightGridsComponent } from "./highlight-components/highlight-grid";
import type { HighlightGridActions } from "./contexts/highlight-grid-context";
import { HighlightGridContextProvider } from "./contexts/highlight-grid-context";
import type { HighlightThumbnail } from "../types/highlight-out";
import { LoadingSpinner, Spinner } from "./misc/loading";
import {
  bookmarkActionUpdate,
  likeActionUpdate,
} from "./contexts/action-types";
import { useAuth } from "@clerk/nextjs";
import { useInView } from "react-intersection-observer";
import { type PoolInfo } from "../types/pool-out";
import { PoolButtonProvider } from "./contexts/follow-pool-context";
import { ScrollArea, ScrollBar } from "@/shadcn/ui/scroll-area";

export const PoolScroll: React.FC<{
  profileId: string;
  title: string;
  type: "followed" | "modded" | "owned";
  initialOpen: boolean;
}> = ({ type, title, initialOpen, profileId }) => {
  const util = api.useContext();

  const queryKey = {
    type,
    userId: profileId,
  };

  const {
    data: allPools,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = api.user.profilePoolsQuery.useInfiniteQuery(queryKey, {
    getNextPageParam: (nextPage) => nextPage?.nextCursor,
  });

  const { ref, inView } = useInView({
    threshold: 0,
  });

  const [open, setOpen] = useState(initialOpen);

  const pools = useMemo(() => {
    return allPools?.pages.flatMap((page) => page?.poolsInfo ?? []) ?? [];
  }, [allPools]);

  const poolMap = useMemo(() => {
    const poolMap = new Map<number, PoolInfo>();

    for (const pool of pools) {
      poolMap.set(pool.id, pool);
    }
    return poolMap;
  }, [pools]);

  const { mutate: add, isLoading: adding } = api.user.addPool.useMutation({
    onSettled() {
      void util.user.profilePoolsQuery.invalidate(queryKey);
    },
  });

  const { mutate: remove, isLoading: removing } =
    api.user.removePool.useMutation({
      onSettled() {
        void util.user.profilePoolsQuery.invalidate(queryKey);
      },
    });

  const buttonContext: ButtonContext = {
    action: (poolId) => {
      if (typeof poolId !== "number") return;
      const poolInfo = poolMap.get(poolId);
      if (!poolInfo || !poolInfo.followInfo) return;
      if (poolInfo.followInfo.follows || poolInfo.followInfo.requested) {
        remove({
          poolId: poolId,
          requested: poolInfo.followInfo.requested,
        });
      } else {
        add({
          poolId: poolId,
          isPublic: poolInfo.isPublic,
        });
      }
    },
    state: (poolId) => {
      if (typeof poolId !== "number")
        return {
          follows: false,
          pending: false,
          disabled: adding || removing,
        };
      const poolInfo = poolMap.get(poolId);
      return {
        follows: poolInfo?.followInfo?.follows ?? false,
        pending: poolInfo?.followInfo?.requested ?? false,
        disabled: adding || removing,
      };
    },
  };

  useEffect(() => {
    if (inView && !isLoading && hasNextPage) {
      void fetchNextPage();
    }
  }, [isLoading, inView, pools, hasNextPage, fetchNextPage]);

  const hasPools = pools && pools.length > 0;

  if (!hasPools) return <></>;

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div className="flex flex-col">
        <Collapsible.Trigger asChild>
          {hasPools && (
            <div className="ml-4 flex w-fit cursor-pointer flex-row items-center gap-1 sm:ml-8">
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                {title}
              </p>
              {open ? (
                <ChevronDownIcon className="h-5 w-5 text-slate-900 dark:text-white" />
              ) : (
                <ChevronUpIcon className="h-5 w-5 text-slate-900 dark:text-white" />
              )}
            </div>
          )}
        </Collapsible.Trigger>
        <Collapsible.Content className="radix-state-open:animate-slide-down h-fit">
          <ScrollArea className="snap-x scroll-pl-4">
            <PoolButtonProvider value={buttonContext}>
              {hasPools && (
                <div className="my-3 flex flex-row gap-4 px-3 pb-1 sm:px-6">
                  {pools?.map((pool) => {
                    if (!pool) return <></>;
                    return (
                      <div key={pool.id} className="snap-center">
                        <PoolComponent key={pool.id} pool={pool} />
                      </div>
                    );
                  })}
                  <div ref={ref}>{hasNextPage && <Spinner />}</div>
                </div>
              )}
            </PoolButtonProvider>

            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
};

export const ProfileData: React.FC<{
  user: UserInfo & {
    followedBy: number;
    following: number;
  };
}> = ({ user }) => {
  const utils = api.useContext();

  const queryKey = user.id;

  const { mutate: follow, isLoading: following } =
    api.user.followUser.useMutation({
      async onMutate() {
        await utils.user.profileQuery.cancel(queryKey);
        const prev = utils.user.profileQuery.getData(queryKey);
        if (prev) {
          const isPublic = prev.isPublic ?? false;
          utils.user.profileQuery.setData(queryKey, {
            ...prev,
            followInfo: {
              follows: isPublic,
              requested: !isPublic,
            },
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        utils.user.profileQuery.setData(queryKey, context?.prev);
      },
      onSettled() {
        void utils.user.profileQuery.invalidate(queryKey);
      },
    });

  const { mutate: unfollow, isLoading: unfollowing } =
    api.user.unfollowUser.useMutation({
      async onMutate() {
        await utils.user.profileQuery.cancel(queryKey);
        const prev = utils.user.profileQuery.getData(queryKey);
        if (prev) {
          utils.user.profileQuery.setData(queryKey, {
            ...prev,
            followInfo: {
              follows: false,
              requested: false,
            },
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        utils.user.profileQuery.setData(queryKey, context?.prev);
      },
      onSettled() {
        void utils.user.profileQuery.invalidate(queryKey);
      },
    });

  const buttonContext: ButtonContext = {
    action: () => {
      if (user.followInfo?.follows ?? user.followInfo?.requested) {
        unfollow({
          followId: user.id,
          requested: user.followInfo?.requested ?? false,
        });
      } else {
        follow({
          followId: user.id,
          public: user.isPublic ?? false,
        });
      }
    },
    state: () => {
      return {
        follows: user.followInfo?.follows ?? false,
        pending: user.followInfo?.requested ?? false,
        disabled: following || unfollowing,
      };
    },
  };

  return (
    <div className="justify-left ml-4 w-fit sm:ml-8">
      <div className="flex flex-shrink flex-row items-center justify-between gap-4">
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">
          {user.username}
        </p>
        <ProfileButtonProvider value={buttonContext}>
          <ProfileFollowButton profileId={user.id} />
        </ProfileButtonProvider>
      </div>
      <Separator.Root
        orientation="horizontal"
        decorative
        className="my-1 h-px bg-gray-300 dark:bg-gray-500"
      />
      <div className="flex flex-row justify-start">
        <ProfileList
          text={"Following: " + user.following}
          header={"Following"}
          fetch={{
            userFetch: { id: user.id, following: true },
          }}
        />

        <Separator.Root
          orientation="vertical"
          decorative
          className="mx-1 w-px bg-gray-300 dark:bg-gray-500"
        />
        <ProfileList
          text={"Followers: " + user.followedBy}
          header={"Followers"}
          fetch={{
            userFetch: { id: user.id, following: false },
          }}
        />
      </div>
    </div>
  );
};

export const ProfileBookmarks: React.FC<{
  id: string;
}> = ({ id }) => {
  const user = useAuth();
  const isOwner = id === user.userId;

  const loadAmount = 6;

  const queryKey = {
    amount: loadAmount,
    userId: id,
  };

  const { data, isLoading, hasNextPage, fetchNextPage } =
    api.user.getUserBookmarksPaginated.useInfiniteQuery(queryKey, {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const util = api.useContext();

  const highlights = useMemo(() => {
    return data?.pages.flatMap((page) => page.highlights) ?? [];
  }, [data]);

  const highlightMap = useMemo(() => {
    const highlightMap = new Map<string, HighlightThumbnail>();

    for (const highlight of highlights) {
      highlightMap.set(highlight.id, highlight);
    }
    return highlightMap;
  }, [highlights]);

  const { mutate: bookmark, isLoading: bookmarking } =
    api.user.toggleHighlight.useMutation({
      async onMutate(variables) {
        await util.user.getUserBookmarksPaginated.cancel(queryKey);
        const prev =
          util.user.getUserBookmarksPaginated.getInfiniteData(queryKey);
        if (prev) {
          util.user.getUserBookmarksPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: bookmarkActionUpdate(prev, variables),
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.user.getUserBookmarksPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
      },
      onSettled() {
        void util.user.getUserBookmarksPaginated.invalidate();
      },
    });

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      async onMutate(variables) {
        await util.user.getUserBookmarksPaginated.cancel();
        const prev =
          util.user.getUserBookmarksPaginated.getInfiniteData(queryKey);
        if (prev) {
          util.user.getUserBookmarksPaginated.setInfiniteData(queryKey, {
            ...prev,
            pages: likeActionUpdate(prev, variables),
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.user.getUserBookmarksPaginated.setInfiniteData(
          queryKey,
          context?.prev
        );
      },
      onSettled() {
        void util.user.getUserBookmarksPaginated.invalidate();
      },
    });

  if (isLoading) return <LoadingSpinner loadingType={"Loading Highlights"} />;

  const actions: HighlightGridActions = {
    basePath: isOwner ? "bookmarks" : `profiles/${id}/feed`,
    fetchMore: () => {
      void fetchNextPage();
    },
    hasMore: () => hasNextPage ?? false,
    bookmark: (id: string) => {
      const highlight = highlightMap.get(id);
      if (!highlight) return;
      bookmark({ highlightId: highlight.id, add: !highlight.bookmarked });
    },
    like: (id: string) => {
      const highlight = highlightMap.get(id);
      if (!highlight) return;
      upvote({ highlightId: highlight.id, like: !highlight.upvoted });
    },
    disabled: bookmarking || upvoting,
  };

  return (
    <HighlightGridContextProvider value={actions}>
      <div className="mx-4 sm:mx-8">
        <HighlightGridsComponent
          highlights={highlights}
        ></HighlightGridsComponent>
      </div>
    </HighlightGridContextProvider>
  );
};

export const ProfileComponent: React.FC<{
  userId: string;
}> = ({ userId }) => {
  const { data: profile, isLoading } = api.user.profileQuery.useQuery(userId);

  if (isLoading) {
    return (
      <div className="flex flex-row items-center justify-center gap-2 text-xl text-slate-900 dark:text-white">
        <Spinner />
        Loading Profile
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center text-xl text-slate-900 dark:text-white">
        Profile not found
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-start gap-1 pt-10">
      <ProfileData user={{ ...profile }} />
      <PoolScroll
        type={"followed"}
        title={"Followed Reels"}
        initialOpen={true}
        profileId={profile.id}
      />

      <PoolScroll
        type={"owned"}
        title={"Owned Reels"}
        initialOpen={false}
        profileId={profile.id}
      />
      <PoolScroll
        type={"modded"}
        title={"Mod Reels"}
        initialOpen={false}
        profileId={profile.id}
      />

      <ProfileBookmarks id={profile.id} />
    </div>
  );
};
