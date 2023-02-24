import * as Separator from "@radix-ui/react-separator";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";
import { PoolComponent } from "./highlight-pool-card";
import { ProfileList } from "./profile-scroll-components";
import type { RouterOutputs } from "../utils/trpc";
import { useSession } from "next-auth/react";
import { ProfileFollowButton } from "./follow-profile";
import type { PoolInfo, ProfilePoolFetch } from "../types/pool-out";

import type { UserInfo } from "../types/user-out";

export const PoolScroll: React.FC<{
  pools: PoolInfo[];
  title: string;
  initialOpen: boolean;
  fetch: ProfilePoolFetch;
}> = ({ pools, title, initialOpen, fetch }) => {
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
            <ScrollArea.Viewport className="h-full w-full">
              {hasPools && (
                <div className="my-3 flex flex-row gap-4 px-6 pb-1">
                  {pools &&
                    pools.map((pool) => (
                      <PoolComponent
                        key={pool.id}
                        pool={pool}
                        fetch={{
                          profile: fetch,
                          discover: undefined,
                        }}
                      />
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
  const { data } = useSession();
  return (
    <div className="justify-left ml-8 w-fit">
      <div className="flex flex-shrink flex-row items-center justify-between gap-4">
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">
          {user.username}
        </p>
        {data?.user?.id !== user.id && (
          <ProfileFollowButton
            info={{
              userFetch: undefined,
              poolFetch: undefined,
            }}
            profile={{
              ...user,
            }}
          />
        )}
      </div>
      <Separator.Root
        orientation="horizontal"
        decorative
        className="my-1 h-px bg-slate-900 dark:bg-white"
      />
      <div className="flex flex-row justify-start">
        <ProfileList
          text={"Following: " + user.following}
          header={"Following"}
          fetch={{
            userFetch: {
              userId: user.id,
              refId: data?.user?.id,
              following: true,
            },
          }}
        />

        <Separator.Root
          orientation="vertical"
          decorative
          className="mx-1 w-px bg-slate-900 dark:bg-white"
        />
        <ProfileList
          text={"Followers: " + user.followedBy}
          header={"Followers"}
          fetch={{
            userFetch: {
              userId: user.id,
              refId: data?.user?.id,
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
  refId?: string | undefined;
}> = ({ id, refId }) => {
  return (
    <div className="flex flex-col">
      <p className="ml-8 text-2xl font-semibold text-slate-900 dark:text-white">
        Highlights
      </p>
    </div>
  );
};

export const ProfileComponent: React.FC<{
  profile: RouterOutputs["user"]["profileQuery"];
}> = ({ profile }) => {
  const { data: session } = useSession();

  if (!profile) return <h3>Profile not found</h3>;

  const owner = profile.id === session?.user?.id;

  return (
    <div className="flex flex-col justify-start gap-1 pt-10">
      <ProfileData user={profile} />
      <PoolScroll
        pools={profile.pools}
        title={"Followed Reels"}
        initialOpen={true}
        fetch={{
          userId: profile.id,
          refId: session?.user?.id,
          kind: "followed",
        }}
      />
      {owner && (
        <PoolScroll
          pools={profile.ownedPools}
          title={"Owned Reels"}
          initialOpen={false}
          fetch={{
            userId: profile.id,
            refId: session?.user?.id,
            kind: "owned",
          }}
        />
      )}
      {owner && (
        <PoolScroll
          pools={profile.modPools}
          title={"Mod Reels"}
          initialOpen={false}
          fetch={{
            userId: profile.id,
            refId: session?.user?.id,
            kind: "mod",
          }}
        />
      )}
      <ProfileHighlights id={profile.id} refId={session?.user?.id} />
    </div>
  );
};
