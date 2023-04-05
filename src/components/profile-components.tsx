import * as Separator from "@radix-ui/react-separator";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";
import { PoolComponent } from "./highlight-pool-card";
import { ProfileList } from "./profile-scroll-components";
import { useSession } from "next-auth/react";
import { ProfileFollowButton } from "./follow-profile";
import type { PoolInfo } from "../types/pool-out";

import type { ProfileInfo, UserInfo } from "../types/user-out";
import { ProfilePoolButtonProvider } from "./contexts/follow-pool-context";
import { ProfileButtonProvider } from "./contexts/follow-profile-context";
import type { ButtonContext } from "./contexts/button-types";
import { api } from "../utils/trpc";
import { HighlightGridsComponent } from "./highlight-components/highlight-grid";

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
            <div className="ml-8 flex w-fit cursor-pointer flex-row items-center gap-1">
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
                <div className="my-3 flex flex-row gap-4 px-6 pb-1">
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
  const { data: session } = useSession();

  const utils = api.useContext();

  const queryKey = user.id;

  const { mutate: follow, isLoading: following } =
    api.user.followUser.useMutation({
      async onMutate() {
        await utils.user.profileQuery.cancel(queryKey);
        const prev = utils.user.profileQuery.getData(queryKey);
        if (prev) {
          const isPublic = prev.public ?? false;
          utils.user.profileQuery.setData(queryKey, {
            ...prev,
            follows: isPublic,
            requested: !isPublic,
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
            follows: false,
            requested: false,
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
      if (!session || !session.user) return;
      if (user.follows || user.requested) {
        unfollow({
          followId: user.id,
          requested: user.requested,
        });
      } else {
        follow({
          followId: user.id,
          public: user.public ?? false,
        });
      }
    },
    state: () => {
      return {
        follows: user.follows,
        pending: user.requested,
        disabled: following || unfollowing,
      };
    },
  };

  return (
    <div className="justify-left ml-8 w-fit">
      <div className="flex flex-shrink flex-row items-center justify-between gap-4">
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">
          {user.username}
        </p>
        {session?.user?.id !== user.id && (
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
            userFetch: {
              userId: user.id,
              refId: session?.user?.id,
              following: true,
            },
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
            userFetch: {
              userId: user.id,
              refId: session?.user?.id,
              following: false,
            },
          }}
        />
      </div>
    </div>
  );
};

export const ProfileHighlights: React.FC<{
  id: string;
}> = ({ id }) => {
  const { data } = api.user.getUserBookmarksPaginated.useInfiniteQuery({
    userId: id,
    amount: 6,
  });

  const highlights = data?.pages.flatMap((page) => page.highlights) ?? [];

  return (
    <div className="ml-8">
      <HighlightGridsComponent
        highlights={highlights}
      ></HighlightGridsComponent>
    </div>
  );
};

export const ProfileComponent: React.FC<{
  profile: ProfileInfo;
}> = ({ profile }) => {
  const { data: session } = useSession();

  const owner = profile.id === session?.user?.id;

  return (
    <ProfilePoolButtonProvider userId={profile.id} profile={profile}>
      <div className="flex flex-col justify-start gap-1 pt-10">
        <ProfileData user={{ ...profile }} />
        <PoolScroll
          pools={profile.pools}
          title={"Followed Reels"}
          initialOpen={true}
        />
        {owner && (
          <PoolScroll
            pools={profile.ownedPools}
            title={"Owned Reels"}
            initialOpen={false}
          />
        )}
        {owner && (
          <PoolScroll
            pools={profile.modPools}
            title={"Mod Reels"}
            initialOpen={false}
          />
        )}
        <ProfileHighlights id={profile.id} />
      </div>
    </ProfilePoolButtonProvider>
  );
};
