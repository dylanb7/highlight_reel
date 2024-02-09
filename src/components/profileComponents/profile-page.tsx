import { api } from "~/utils/trpc";
import { type ButtonContext } from "../contexts/button-types";
import { ReelButtonProvider } from "../contexts/follow-reel-context";
import { ReelScroll } from "./reel-scroll";
import { useMemo } from "react";

import { ProfileButtonProvider } from "../contexts/follow-profile-context";
import { ProfileFollowButton } from "./follow-profile";
import { ProfileList } from "./profile-follower-components";
import { Separator } from "@/shadcn/ui/separator";
import { useAuth } from "@clerk/nextjs";
import {
  bookmarkActionUpdate,
  likeActionUpdate,
} from "../contexts/action-types";
import { LoadingSpinner } from "../misc/loading";
import {
  type HighlightGridActions,
  HighlightGridContextProvider,
} from "../contexts/highlight-grid-context";
import { HighlightGridsComponent } from "../highlight-components/highlight-grid";
import { Label } from "@/shadcn/ui/label";
import { useRouter } from "next/router";
import { LoadingScaffold } from "../highlight-components/grouped-highlight-grid";

const LoadReelScroll: React.FC<{
  profileId: string;
  title: string;
  type: "followed" | "modded" | "owned";
}> = ({ title, profileId, type }) => {
  const util = api.useUtils();

  const queryKey = {
    type,
    userId: profileId,
  };

  const { data, isLoading, fetchNextPage, hasNextPage } =
    api.user.profileReelsQuery.useInfiniteQuery(queryKey, {
      getNextPageParam: (nextPage) => nextPage?.nextCursor,
    });

  const { mutate: add, isPending: adding } = api.user.addReel.useMutation({
    onSettled() {
      void util.user.profileReelsQuery.invalidate(queryKey);
    },
  });

  const { mutate: remove, isPending: removing } =
    api.user.removeReel.useMutation({
      onSettled() {
        void util.user.profileReelsQuery.invalidate(queryKey);
      },
    });

  const reels = useMemo(() => {
    return data?.pages.flatMap((page) => page?.poolsInfo ?? []) ?? [];
  }, [data]);

  const reelButtonContext: ButtonContext = {
    action: (id) => {
      if (typeof id !== "number") return;
      const reelInfo = reels.find((reel) => reel.id === id);
      if (!reelInfo || !reelInfo.followInfo) return;
      if (reelInfo.followInfo.follows || reelInfo.followInfo.requested) {
        remove({
          reelId: id,
          requested: reelInfo.followInfo.requested,
        });
      } else {
        add({
          reelId: id,
          isPublic: reelInfo.isPublic,
        });
      }
    },
    state: (id) => {
      if (typeof id !== "number")
        return {
          follows: false,
          pending: false,
          disabled: adding || removing,
        };
      const reelInfo = reels.find((reel) => reel.id === id);
      return {
        follows: reelInfo?.followInfo?.follows ?? false,
        pending: reelInfo?.followInfo?.requested ?? false,
        disabled: adding || removing,
      };
    },
  };

  return (
    <ReelButtonProvider value={reelButtonContext}>
      <ReelScroll
        reels={reels}
        hasNextPage={hasNextPage}
        loading={isLoading}
        fetchNextPage={async () => {
          await fetchNextPage();
        }}
        title={title}
        initialOpen={type === "followed"}
      />
    </ReelButtonProvider>
  );
};

const LoadProfileData: React.FC<{
  id: string;
}> = ({ id }) => {
  const { data, isLoading } = api.user.profileQuery.useQuery(id);

  const utils = api.useUtils();

  const { mutate: follow, isPending: following } =
    api.user.followUser.useMutation({
      async onMutate() {
        await utils.user.profileQuery.cancel(id);
        const prev = utils.user.profileQuery.getData(id);
        if (prev) {
          const isPublic = prev.isPublic ?? false;
          utils.user.profileQuery.setData(id, {
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
        utils.user.profileQuery.setData(id, context?.prev);
      },
      onSettled() {
        void utils.user.profileQuery.invalidate(id);
      },
    });

  const { mutate: unfollow, isPending: unfollowing } =
    api.user.unfollowUser.useMutation({
      async onMutate() {
        await utils.user.profileQuery.cancel(id);
        const prev = utils.user.profileQuery.getData(id);
        if (prev) {
          utils.user.profileQuery.setData(id, {
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
        utils.user.profileQuery.setData(id, context?.prev);
      },
      onSettled() {
        void utils.user.profileQuery.invalidate(id);
      },
    });

  if (isLoading) return <LoadingSpinner loadingType={"Loading Profile"} />;

  if (!data)
    return (
      <div className="container mx-auto">
        <Label>Unable to load profile</Label>
      </div>
    );

  const buttonContext: ButtonContext = {
    action: () => {
      if (data.followInfo?.follows ?? data.followInfo?.requested) {
        unfollow({
          followId: data.id,
          requested: data.followInfo?.requested ?? false,
        });
      } else {
        follow({
          followId: data.id,
          public: data.isPublic ?? false,
        });
      }
    },
    state: () => {
      return {
        follows: data.followInfo?.follows ?? false,
        pending: data.followInfo?.requested ?? false,
        disabled: following || unfollowing,
      };
    },
  };

  return (
    <div className="justify-left ml-4 w-fit sm:ml-8">
      <div className="flex flex-shrink flex-row items-center justify-between gap-4">
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">
          {data.username}
        </p>
        <ProfileButtonProvider value={buttonContext}>
          <ProfileFollowButton profileId={data.id} />
        </ProfileButtonProvider>
      </div>
      <Separator
        orientation="horizontal"
        decorative
        className="my-1 h-px bg-gray-300 dark:bg-gray-500"
      />
      <div className="flex flex-row justify-start">
        <ProfileList
          text={"Following: " + data.following}
          header={"Following"}
          fetch={{
            userFetch: { id: data.id, following: true },
          }}
        />
        <Separator
          orientation="vertical"
          decorative
          className="mx-1 w-px bg-gray-300 dark:bg-gray-500"
        />
        <ProfileList
          text={"Followers: " + data.followedBy}
          header={"Followers"}
          fetch={{
            userFetch: { id: data.id, following: false },
          }}
        />
      </div>
    </div>
  );
};

const LoadProfileBookmarks: React.FC<{
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

  const util = api.useUtils();

  const highlights = useMemo(() => {
    return data?.pages.flatMap((page) => page.highlights) ?? [];
  }, [data]);

  const { mutate: bookmark, isPending: bookmarking } =
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
        void util.user.getUserBookmarksPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isPending: upvoting } =
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

  if (isLoading) return <LoadingScaffold amount={loadAmount} />;

  const actions: HighlightGridActions = {
    basePath: isOwner
      ? { pathname: "bookmarks" }
      : { pathname: "profiles/[id]/feed", query: { id } },
    fetchMore: () => {
      void fetchNextPage();
    },
    hasMore: () => hasNextPage,
    bookmark: (highlight) => {
      bookmark({ highlightId: highlight.id, add: highlight.bookmarked });
    },
    like: (highlight) => {
      upvote({ highlightId: highlight.id, like: !highlight.upvoted });
    },
    disabled: bookmarking || upvoting,
  };

  return (
    <HighlightGridContextProvider value={actions}>
      <div className="mx-4 sm:mx-8">
        <HighlightGridsComponent highlights={highlights} />
      </div>
    </HighlightGridContextProvider>
  );
};

export const ProfilePage: React.FC = () => {
  const id = useRouter().query.id as "string" | undefined;

  const user = useAuth();

  const userId = id ?? user.userId;

  if (!userId)
    return (
      <div className="container mx-auto">
        <Label>Invalid user id</Label>
      </div>
    );

  const isOwner = id === undefined || id === user.userId;

  return (
    <div className="flex flex-col justify-start gap-1 pt-10">
      <LoadProfileData id={userId} />
      <LoadReelScroll
        type={"followed"}
        title={"Followed Reels"}
        profileId={userId}
      />

      <LoadProfileBookmarks id={userId} />
    </div>
  );
};
