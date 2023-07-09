import * as Separator from "@radix-ui/react-separator";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useMemo, useState } from "react";
import { PoolComponent } from "./highlight-pool-card";
import { ProfileList } from "./profile-scroll-components";
import { ProfileFollowButton } from "./follow-profile";
import type { PoolInfo } from "../types/pool-out";

import type {
  ProfileInfo,
  ProfilePoolsInfo,
  UserInfo,
} from "../types/user-out";

import { ProfileButtonProvider } from "./contexts/follow-profile-context";
import type { ButtonContext } from "./contexts/button-types";
import { api } from "../utils/trpc";
import { HighlightGridsComponent } from "./highlight-components/highlight-grid";
import type { GridActions } from "./contexts/grid-context";
import { GridContextProvider } from "./contexts/grid-context";
import type { HighlightThumbnail } from "../types/highlight-out";
import { LoadingSpinner } from "./misc/loading";
import {
  bookmarkActionUpdate,
  likeActionUpdate,
} from "./contexts/action-types";
import { useAuth } from "@clerk/nextjs";

export const PoolScroll: React.FC<{
  pools: PoolInfo[];
  title: string;
  initialOpen: boolean;
}> = ({ pools, title, initialOpen }) => {
  const [open, setOpen] = useState(initialOpen);

  const hasPools = pools && pools.length > 0;

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
        <Collapsible.Content className="h-fit radix-state-open:animate-slide-down">
          <ScrollArea.Root className="overflow-hidden">
            <ScrollArea.Viewport className="h-full w-full snap-x scroll-pl-4">
              {hasPools && (
                <div className="my-3 flex flex-row gap-4 px-3 pb-1 sm:px-6">
                  {pools &&
                    pools.map((pool) => (
                      <div key={pool.id} className="snap-center">
                        <PoolComponent key={pool.id} pool={pool} />
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="horizontal"
              className="mx-8 flex h-2 flex-col rounded-full bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-800"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-900 dark:bg-white" />
            </ScrollArea.Scrollbar>
            <ScrollArea.Corner />
          </ScrollArea.Root>
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
  const auth = useAuth();

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
        utils.user.profileQuery.invalidate(queryKey);
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
        utils.user.profileQuery.invalidate(queryKey);
      },
    });

  const buttonContext: ButtonContext = {
    action: () => {
      if (user.followInfo?.follows || user.followInfo?.requested) {
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
        {auth.userId !== user.id && (
          <ProfileButtonProvider value={buttonContext}>
            <ProfileFollowButton profileId={user.id} />
          </ProfileButtonProvider>
        )}
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
        util.user.getUserBookmarksPaginated.invalidate();
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
        util.user.getUserBookmarksPaginated.invalidate();
      },
    });

  if (isLoading) return <LoadingSpinner loadingType={"Loading Highlights"} />;

  const actions: GridActions = {
    basePath: isOwner ? "bookmarks" : `profiles/${id}/feed`,
    fetchMore: () => {
      fetchNextPage();
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
    <GridContextProvider value={actions}>
      <div className="mx-4 sm:mx-8">
        <HighlightGridsComponent
          highlights={highlights}
        ></HighlightGridsComponent>
      </div>
    </GridContextProvider>
  );
};

export const ProfileComponent: React.FC<{
  profile: ProfilePoolsInfo;
}> = ({ profile }) => {
  return (
    <ProfilePoolButtonProvider userId={profile.id} profile={profile}>
      <div className="flex flex-col justify-start gap-1 pt-10">
        <ProfileData user={{ ...profile }} />
        <PoolScroll
          pools={profile.followed}
          title={"Followed Reels"}
          initialOpen={true}
        />
        {profile.owned && (
          <PoolScroll
            pools={profile.owned ?? []}
            title={"Owned Reels"}
            initialOpen={false}
          />
        )}
        {profile.modded && (
          <PoolScroll
            pools={profile.modded ?? []}
            title={"Mod Reels"}
            initialOpen={false}
          />
        )}
        <ProfileBookmarks id={profile.id} />
      </div>
    </ProfileButtonProvider>
  );
};
