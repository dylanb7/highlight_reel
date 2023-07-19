import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { useProfileButtonContext } from "./contexts/follow-profile-context";
import SignInComponent from "./misc/sign-in";
import { useAuth } from "@clerk/nextjs";

const ButtonStyle: React.FC<{ profileId: string }> = ({ profileId }) => {
  const { action, state } = useProfileButtonContext();

  const buttonState = state(profileId);

  return (
    <button
      onClick={() => {
        action(profileId);
      }}
      disabled={buttonState.disabled}
      className={
        "rounded-lg px-3 py-1 text-sm font-semibold no-underline transition " +
        (buttonState.pending
          ? "bg-gray-500 text-white hover:bg-gray-700"
          : "bg-indigo-500 text-white hover:bg-indigo-700") +
        "disabled:opacity-50"
      }
    >
      {buttonState.follows
        ? "Unfollow"
        : buttonState.pending
        ? "Requested"
        : "Follow"}
    </button>
  );
};

/*
const ProfileFollow: React.FC<{ profile: UserInfo; userId: string }> = ({
  profile,
  userId,
}) => {
  const utils = trpc.useContext();

  const queryId = {
    user: profile.id,
    ref: userId,
  };

  const mutate = async (unfollow: boolean) => {
    await utils.user.profileQuery.cancel(queryId);
    const prev = utils.user.profileQuery.getData(queryId);
    if (prev) {
      const changed = {
        ...prev,
        requested: !(unfollow || prev.requested),
        follows: !(unfollow || prev.public === false),
      };

      utils.user.profileQuery.setData(queryId, changed);
    }

    return {
      prev,
    };
  };

  const { mutate: follow, isLoading: following } =
    trpc.user.followUser.useMutation({
      async onMutate() {
        return await mutate(false);
      },
      onError(_, __, context) {
        utils.user.profileQuery.setData(queryId, context?.prev);
      },
      onSettled() {
        utils.user.profileQuery.invalidate(queryId);
      },
    });

  const { mutate: unfollow, isLoading: unfollowing } =
    trpc.user.unfollowUser.useMutation({
      async onMutate() {
        return await mutate(true);
      },
      onError(_, __, context) {
        utils.user.profileQuery.setData(queryId, context?.prev);
      },
      onSettled() {
        utils.user.profileQuery.invalidate(queryId);
      },
    });
  return ButtonStyle(
    profile.follows,
    profile.requested,
    following || unfollowing,
    () => {
      if (profile.follows === false && profile.requested === false) {
        follow({
          public: profile.public ?? false,
          userId: userId,
          followId: profile.id,
        });
      } else {
        unfollow({
          userId: userId,
          followId: profile.id,
          requested: profile.requested,
        });
      }
    }
  );
};

const ProfileFollowingFollow: React.FC<{
  userInfo: UserFetch;
  profile: UserInfo;
  userId: string;
}> = ({ userInfo, profile, userId }) => {
  const utils = trpc.useContext();

  const queryId = {
    refId: userInfo.refId,
    userId: userInfo.userId,
  };

  const mutate = async (
    unfollow: boolean,
    variables?: {
      userId: string;
      public: boolean;
      followId: string;
    }
  ) => {
    await utils.user.getFollowing.cancel(queryId);
    const prev = utils.user.getFollowing.getData(queryId);
    if (prev) {
      const changed = prev.findIndex((obj) => obj.id === profile.id);
      if (changed >= 0) {
        const newVals = prev;
        newVals[changed] = {
          ...profile,
          follows: unfollow || variables?.public === false ? false : true,
          requested: unfollow || variables?.public ? false : true,
        };
        utils.user.getFollowing.setData(queryId, newVals);
      }
    }
    return {
      prev,
    };
  };

  const { mutate: follow, isLoading: following } =
    trpc.user.followUser.useMutation({
      async onMutate(variables) {
        return await mutate(false, variables);
      },
      onError(_, __, context) {
        utils.user.getFollowing.setData(queryId, context?.prev);
      },
      onSettled() {
        utils.user.getFollowing.invalidate(queryId);
      },
    });

  const { mutate: unfollow, isLoading: unfollowing } =
    trpc.user.unfollowUser.useMutation({
      async onMutate() {
        return await mutate(true);
      },
      onError(_, __, context) {
        utils.user.getFollowing.setData(queryId, context?.prev);
      },
      onSettled() {
        utils.user.getFollowing.invalidate(queryId);
      },
    });

  return ButtonStyle(
    profile.follows,
    profile.requested,
    following || unfollowing,
    () => {
      if (profile.follows === false && profile.requested === false) {
        follow({
          public: profile.public ?? false,
          userId: userId,
          followId: profile.id,
        });
      } else {
        unfollow({
          userId: userId,
          followId: profile.id,
          requested: profile.requested,
        });
      }
    }
  );
};

const ProfileFollowersFollow: React.FC<{
  userInfo: UserFetch;
  profile: UserInfo;
  userId: string;
}> = ({ userInfo, profile, userId }) => {
  const utils = trpc.useContext();

  const queryId = {
    refId: userInfo.refId,
    userId: userInfo.userId,
  };

  const mutate = async (
    unfollow: boolean,
    variables?: {
      userId: string;
      public: boolean;
      followId: string;
    }
  ) => {
    await utils.user.getFollowers.cancel(queryId);
    const prev = utils.user.getFollowers.getData(queryId);
    if (prev) {
      const changed = prev.findIndex((obj) => obj.id === profile.id);
      if (changed >= 0) {
        const newVals = prev;
        newVals[changed] = {
          ...profile,
          follows: unfollow || variables?.public === false ? false : true,
          requested: unfollow || variables?.public ? false : true,
        };
        utils.user.getFollowers.setData(queryId, newVals);
      }
    }
    return {
      prev,
    };
  };

  const { mutate: follow, isLoading: following } =
    trpc.user.followUser.useMutation({
      async onMutate(variables) {
        return await mutate(false, variables);
      },
      onError(_, __, context) {
        utils.user.getFollowers.setData(queryId, context?.prev);
      },
      onSettled() {
        utils.user.getFollowers.invalidate(queryId);
      },
    });

  const { mutate: unfollow, isLoading: unfollowing } =
    trpc.user.unfollowUser.useMutation({
      async onMutate() {
        return await mutate(true);
      },
      onError(_, __, context) {
        utils.user.getFollowers.setData(queryId, context?.prev);
      },
      onSettled() {
        utils.user.getFollowers.invalidate(queryId);
      },
    });

  return ButtonStyle(
    profile.follows,
    profile.requested,
    following || unfollowing,
    () => {
      if (profile.follows === false && profile.requested === false) {
        follow({
          public: profile.public ?? false,
          userId: userId,
          followId: profile.id,
        });
      } else {
        unfollow({
          userId: userId,
          followId: profile.id,
          requested: profile.requested,
        });
      }
    }
  );
};

const PoolProfileFollow: React.FC<{
  poolInfo: PoolUserFetch;
  profile: UserInfo;
  userId: string;
}> = ({ poolInfo, profile, userId }) => {
  const utils = trpc.useContext();

  const queryId = {
    poolId: poolInfo.poolId,
    refId: poolInfo.refId,
  };

  const mutate = async (
    unfollow: boolean,
    variables?: {
      userId: string;
      public: boolean;
      followId: string;
    }
  ) => {
    await utils.pool.getPoolFollowers.cancel(queryId);
    const prev = utils.pool.getPoolFollowers.getData(queryId);
    if (prev) {
      const changed = prev.findIndex((obj) => obj.id === profile.id);
      if (changed >= 0) {
        const newVals = prev;
        newVals[changed] = {
          ...profile,
          follows: unfollow || variables?.public === false ? false : true,
          requested: unfollow || variables?.public ? false : true,
        };
        utils.pool.getPoolFollowers.setData(queryId, newVals);
      }
    }
    return {
      prev,
    };
  };

  const { mutate: follow, isLoading: following } =
    trpc.user.followUser.useMutation({
      async onMutate(variables) {
        return await mutate(false, variables);
      },
      onError(_, __, context) {
        utils.pool.getPoolFollowers.setData(queryId, context?.prev);
      },
      onSettled() {
        utils.pool.getPoolFollowers.invalidate(queryId);
      },
    });

  const { mutate: unfollow, isLoading: unfollowing } =
    trpc.user.unfollowUser.useMutation({
      async onMutate() {
        return await mutate(true);
      },
      onError(_, __, context) {
        utils.pool.getPoolFollowers.setData(queryId, context?.prev);
      },
      onSettled() {
        utils.pool.getPoolFollowers.invalidate();
      },
    });
  return ButtonStyle(
    profile.follows,
    profile.requested,
    following || unfollowing,
    () => {
      if (profile.follows === false && profile.requested === false) {
        follow({
          public: profile.public ?? false,
          userId: userId,
          followId: profile.id,
        });
      } else {
        unfollow({
          userId: userId,
          followId: profile.id,
          requested: profile.requested,
        });
      }
    }
  );
};*/

export const ProfileFollowButton: React.FC<{
  profileId: string;
}> = ({ profileId }) => {
  const user = useAuth();

  const [open, setOpen] = useState(false);

  if (user.userId) {
    if (user.userId === profileId) {
      return (
        <div className="rounded-lg bg-indigo-500 px-3 py-1 text-sm font-semibold text-white no-underline transition">
          You
        </div>
      );
    }
    return <ButtonStyle profileId={profileId} />;
  }

  return (
    <Popover.Root open={open}>
      <Popover.Trigger>
        <button
          onClick={() => {
            setOpen((value) => !value);
          }}
          disabled={open}
          className={
            "rounded-lg bg-indigo-500 px-3 py-1 text-sm font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-50"
          }
        >
          Follow
        </button>
      </Popover.Trigger>
      <Popover.Content
        onInteractOutside={() => {
          setOpen(false);
        }}
        className="w-fit max-w-xs rounded-lg bg-white p-1 shadow-lg radix-side-bottom:animate-slide-down dark:bg-slate-900"
      >
        <div className="m-1 flex flex-col items-center justify-center gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Must be signed in to follow
          </p>
          <SignInComponent isHead={false} />
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
