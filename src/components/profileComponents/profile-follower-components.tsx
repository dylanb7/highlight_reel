import Link from "next/link";
import { useState } from "react";
import type { FetchInfo, UserInfo } from "../../server/types/user-out";
import { api } from "../../utils/trpc";
import type { ButtonContext } from "../contexts/button-types";
import { ProfileButtonProvider } from "../contexts/follow-profile-context";
import { ProfileFollowButton } from "./follow-profile";
import { LoadingSpinner } from "../misc/loading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/shadcn/ui/dialog";

import { ScrollArea } from "@/shadcn/ui/scroll-area";
import { DialogTitle } from "@radix-ui/react-dialog";

export const ProfileRow: React.FC<{
  profile: UserInfo;
  dismiss: () => void;
}> = ({ profile, dismiss }) => {
  return (
    <div className="flex flex-row items-center justify-between rounded-lg bg-gray-200 px-2 py-1 shadow-sm dark:bg-slate-900">
      <Link
        href={"/profiles/" + encodeURIComponent(profile.id)}
        onClick={() => {
          dismiss();
        }}
      >
        <p className="truncate font-semibold text-slate-900 dark:text-white">
          {profile.username}
        </p>{" "}
      </Link>
      <ProfileFollowButton profileId={profile.id} />
    </div>
  );
};

const UserRows: React.FC<{
  users: UserInfo[];
  isLoading: boolean;
  dismiss: () => void;
}> = ({ users, isLoading, dismiss }) => {
  if (isLoading) return <LoadingSpinner loadingType={""} />;
  if (users.length === 0)
    return (
      <div className="flex items-center justify-center text-center text-white">
        No Profiles
      </div>
    );
  return (
    <div className="flex h-full w-full flex-col gap-2">
      {users.map((user) => (
        <ProfileRow key={user.id} profile={user} dismiss={dismiss} />
      ))}
    </div>
  );
};

const usersToMap = (users: UserInfo[] | undefined) => {
  const userMap = new Map<string, UserInfo>();
  if (!users) return userMap;
  for (const user of users) {
    userMap.set(user.id, user);
  }
  return userMap;
};

const PoolRowFetch: React.FC<{ fetch: number; dismiss: () => void }> = ({
  fetch,
  dismiss,
}) => {
  const utils = api.useUtils();

  const queryKey = fetch;

  const { data: users, isLoading } =
    api.reel.getReelFollowers.useQuery(queryKey);

  const userMap = usersToMap(users);

  const { mutate: follow, isPending: following } =
    api.user.followUser.useMutation({
      async onMutate(variables) {
        await utils.reel.getReelFollowers.cancel(queryKey);
        const prev = utils.reel.getReelFollowers.getData(queryKey);
        const updated = userMap.get(variables.followId);
        if (prev && updated) {
          const isPublic = updated.isPublic;
          const newValues = [...prev];
          const toUpdate = newValues.findIndex((ele) => ele.id === updated.id);
          newValues[toUpdate] = {
            ...updated,
            followInfo: {
              follows: isPublic,
              requested: !isPublic,
            },
          };
          utils.reel.getReelFollowers.setData(queryKey, newValues);
        }
        return { prev };
      },
      onError(_, __, context) {
        utils.reel.getReelFollowers.setData(queryKey, context?.prev);
      },
      onSettled() {
        void utils.reel.getReelFollowers.invalidate(queryKey);
      },
    });

  const { mutate: unfollow, isPending: unfollowing } =
    api.user.unfollowUser.useMutation({
      async onMutate(variables) {
        await utils.reel.getReelFollowers.cancel(queryKey);
        const prev = utils.reel.getReelFollowers.getData(queryKey);
        const updated = userMap.get(variables.followId);
        if (prev && updated) {
          const newValues = [...prev];
          const toUpdate = newValues.findIndex((ele) => ele.id === updated.id);
          newValues[toUpdate] = {
            ...updated,
            followInfo: {
              follows: false,
              requested: false,
            },
          };
          utils.reel.getReelFollowers.setData(queryKey, newValues);
        }
        return { prev };
      },
      onError(_, __, context) {
        utils.reel.getReelFollowers.setData(queryKey, context?.prev);
      },
      onSettled() {
        void utils.reel.getReelFollowers.invalidate(queryKey);
      },
    });

  const buttonContext: ButtonContext = {
    action: (id) => {
      if (typeof id !== "string") return;
      const user = userMap.get(id);
      if (!user) return;
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
    state: (id) => {
      if (typeof id !== "string")
        return {
          follows: false,
          pending: false,
          disabled: following || unfollowing,
        };
      const user = userMap.get(id);
      return {
        follows: user?.followInfo?.follows ?? false,
        pending: user?.followInfo?.requested ?? false,
        disabled: following || unfollowing,
      };
    },
  };

  return (
    <ProfileButtonProvider value={buttonContext}>
      <UserRows users={users ?? []} isLoading={isLoading} dismiss={dismiss} />
    </ProfileButtonProvider>
  );
};

const FollowersFetch: React.FC<{ fetch: string; dismiss: () => void }> = ({
  fetch,
  dismiss,
}) => {
  const utils = api.useUtils();

  const queryKey = fetch;

  const { data: users, isLoading } = api.user.getFollowers.useQuery(queryKey);

  const userMap = usersToMap(users);

  const { mutate: follow, isPending: following } =
    api.user.followUser.useMutation({
      async onMutate(variables) {
        await utils.user.getFollowers.cancel(queryKey);
        const prev = utils.user.getFollowers.getData(queryKey);
        const updated = userMap.get(variables.followId);
        if (prev && updated) {
          const isPublic = updated.isPublic ?? false;
          const newValues = [...prev];
          const toUpdate = newValues.findIndex((ele) => ele.id === updated.id);
          newValues[toUpdate] = {
            ...updated,
            followInfo: {
              follows: isPublic,
              requested: !isPublic,
            },
          };
          utils.user.getFollowers.setData(queryKey, newValues);
        }
        return { prev };
      },
      onError(_, __, context) {
        utils.user.getFollowers.setData(queryKey, context?.prev);
      },
      onSettled() {
        void utils.user.getFollowers.invalidate(queryKey);
      },
    });

  const { mutate: unfollow, isPending: unfollowing } =
    api.user.unfollowUser.useMutation({
      async onMutate(variables) {
        await utils.user.getFollowers.cancel(queryKey);
        const prev = utils.user.getFollowers.getData(queryKey);
        const updated = userMap.get(variables.followId);
        if (prev && updated) {
          const newValues = [...prev];
          const toUpdate = newValues.findIndex((ele) => ele.id === updated.id);
          newValues[toUpdate] = {
            ...updated,
            followInfo: {
              follows: false,
              requested: false,
            },
          };
          utils.user.getFollowers.setData(queryKey, newValues);
        }
        return { prev };
      },
      onError(_, __, context) {
        utils.user.getFollowers.setData(queryKey, context?.prev);
      },
      onSettled() {
        void utils.user.getFollowers.invalidate(queryKey);
      },
    });

  const buttonContext: ButtonContext = {
    action: (id) => {
      if (typeof id !== "string") return;
      const user = userMap.get(id);
      if (!user) return;
      if (user.followInfo?.follows ?? user.followInfo?.requested) {
        unfollow({
          followId: user.id,
          requested: user.followInfo?.requested ?? false,
        });
      } else {
        follow({
          followId: user.id,
          public: user.isPublic,
        });
      }
    },
    state: (id) => {
      if (typeof id !== "string")
        return {
          follows: false,
          pending: false,
          disabled: following || unfollowing,
        };
      const user = userMap.get(id);
      return {
        follows: user?.followInfo?.follows ?? false,
        pending: user?.followInfo?.requested ?? false,
        disabled: following || unfollowing,
      };
    },
  };

  return (
    <ProfileButtonProvider value={buttonContext}>
      <UserRows users={users ?? []} isLoading={isLoading} dismiss={dismiss} />
    </ProfileButtonProvider>
  );
};

const FollowingFetch: React.FC<{ fetch: string; dismiss: () => void }> = ({
  fetch,
  dismiss,
}) => {
  const utils = api.useUtils();

  const queryKey = fetch;

  const { data: users, isLoading } = api.user.getFollowing.useQuery(queryKey);

  const userMap = usersToMap(users);

  const { mutate: follow, isPending: following } =
    api.user.followUser.useMutation({
      async onMutate(variables) {
        await utils.user.getFollowing.cancel(queryKey);
        const prev = utils.user.getFollowing.getData(queryKey);
        const updated = userMap.get(variables.followId);
        if (prev && updated) {
          const isPublic = updated.isPublic ?? false;
          const newValues = [...prev];
          const toUpdate = newValues.findIndex((ele) => ele.id === updated.id);
          newValues[toUpdate] = {
            ...updated,
            followInfo: {
              follows: isPublic,
              requested: !isPublic,
            },
          };
          utils.user.getFollowing.setData(queryKey, newValues);
        }
        return { prev };
      },
      onError(_, __, context) {
        utils.user.getFollowing.setData(queryKey, context?.prev);
      },
      onSettled() {
        void utils.user.getFollowing.invalidate(queryKey);
      },
    });

  const { mutate: unfollow, isPending: unfollowing } =
    api.user.unfollowUser.useMutation({
      async onMutate(variables) {
        await utils.user.getFollowing.cancel(queryKey);
        const prev = utils.user.getFollowing.getData(queryKey);
        const updated = userMap.get(variables.followId);
        if (prev && updated) {
          const newValues = [...prev];
          const toUpdate = newValues.findIndex((ele) => ele.id === updated.id);
          newValues[toUpdate] = {
            ...updated,
            followInfo: {
              follows: false,
              requested: false,
            },
          };
          utils.user.getFollowing.setData(queryKey, newValues);
        }
        return { prev };
      },
      onError(_, __, context) {
        utils.user.getFollowing.setData(queryKey, context?.prev);
      },
      onSettled() {
        void utils.user.getFollowing.invalidate(queryKey);
      },
    });

  const buttonContext: ButtonContext = {
    action: (id) => {
      if (typeof id !== "string") return;
      const user = userMap.get(id);
      if (!user) return;
      if (user.followInfo?.follows ?? user.followInfo?.requested) {
        unfollow({
          followId: user.id,
          requested: user.followInfo?.requested ?? false,
        });
      } else {
        follow({
          followId: user.id,
          public: user.isPublic,
        });
      }
    },
    state: (id) => {
      if (typeof id !== "string")
        return {
          follows: false,
          pending: false,
          disabled: following || unfollowing,
        };
      const user = userMap.get(id);
      return {
        follows: user?.followInfo?.follows ?? false,
        pending: user?.followInfo?.requested ?? false,
        disabled: following || unfollowing,
      };
    },
  };

  return (
    <ProfileButtonProvider value={buttonContext}>
      <UserRows users={users ?? []} isLoading={isLoading} dismiss={dismiss} />
    </ProfileButtonProvider>
  );
};

export const ProfileList: React.FC<{
  text: string;
  header: string;
  fetch: FetchInfo;
}> = ({ text, header, fetch }) => {
  const [open, setOpen] = useState(false);

  const dismiss = () => {
    setOpen(false);
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger className="cursor-pointer truncate text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline dark:text-gray-400 hover:dark:text-white">
        {text}
      </DialogTrigger>

      <DialogContent className="mx-auto h-fit max-h-[calc(100%-2rem)] max-w-sm lg:max-w-md">
        <DialogHeader>
          <DialogTitle>{header}</DialogTitle>
        </DialogHeader>

        <ScrollArea>
          {open &&
            fetch.userFetch &&
            (fetch.userFetch.following ? (
              <FollowingFetch fetch={fetch.userFetch.id} dismiss={dismiss} />
            ) : (
              <FollowersFetch fetch={fetch.userFetch.id} dismiss={dismiss} />
            ))}
          {open && fetch.poolFetch && (
            <PoolRowFetch fetch={fetch.poolFetch} dismiss={dismiss} />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
