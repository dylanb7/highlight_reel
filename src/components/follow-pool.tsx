import { useSession } from "next-auth/react";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import SignInComponent from "./sign-in";
import { trpc } from "../utils/trpc";
import { HighlightPool, User } from "@prisma/client";
import { LoadingSpinner } from "./loading";
import { PoolFetchInfo, PoolInfo } from "../types/pool-out";
import { PHASE_EXPORT } from "next/dist/shared/lib/constants";

const ButtonStyle = (
  follows: boolean,
  pending: boolean,
  disabled: boolean,
  onClick: () => void
) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={
      "rounded-lg px-3 py-1 text-sm font-semibold no-underline transition " +
      (pending
        ? "bg-gray-500 text-white hover:bg-gray-700"
        : "bg-indigo-500 text-white hover:bg-indigo-700") +
      "disabled:opacity-50"
    }
  >
    {follows ? "Unfollow" : pending ? "Requested" : "Follow"}
  </button>
);

const ProfilePoolButton: React.FC<{
  pool: PoolInfo;
  fetch: PoolFetchInfo;
}> = ({ pool, fetch }) => {
  const { data: session } = useSession();

  const util = trpc.useContext();

  const queryKey = {
    user: fetch.profile!.userId,
    ref: fetch.profile!.refId!,
  };

  const mut = async (follow: boolean) => {
    await util.user.profileQuery.cancel(queryKey);
    const prev = util.user.profileQuery.getData(queryKey);
    const kind = fetch.profile!.kind;
    if (prev) {
      let poolData =
        kind === "mod"
          ? prev.modPools
          : kind === "owned"
          ? prev.ownedPools
          : prev.pools;
      const changed = poolData.findIndex((obj) => obj.id === pool.id);
      if (changed >= 0) {
        poolData[changed] = {
          ...pool,
          followInfo: {
            follows: follow && pool.public ? true : false,
            requested: follow && pool.public === false ? true : false,
          },
        };

        util.user.profileQuery.setData(queryKey, {
          ...prev,
          pools: kind === "followed" ? poolData : prev.pools,
          modPools: kind === "mod" ? poolData : prev.modPools,
          ownedPools: kind === "owned" ? poolData : prev.ownedPools,
        });
      }
    }
    return { prev };
  };

  const { mutate: add, isLoading: adding } = trpc.user.addPool.useMutation({
    async onMutate() {
      return await mut(true);
    },
    onError(_, __, context) {
      util.user.profileQuery.setData(queryKey, context?.prev);
    },
    onSettled() {
      util.user.profileQuery.invalidate(queryKey);
    },
  });

  const { mutate: remove, isLoading: removing } =
    trpc.user.removePool.useMutation({
      async onMutate(_) {
        return await mut(false);
      },
      onError(_, __, context) {
        util.user.profileQuery.setData(queryKey, context?.prev);
      },
      onSettled() {
        util.user.profileQuery.invalidate(queryKey);
      },
    });

  return ButtonStyle(
    pool.followInfo!.follows,
    pool.followInfo!.requested,
    adding || removing,
    () => {
      if (pool.followInfo!.follows) {
        remove({
          userId: session!.user!.id,
          poolId: pool.id,
          requested: pool.followInfo!.requested,
        });
      } else {
        add({
          userId: session!.user!.id,
          poolId: pool.id,
          isPublic: pool.public,
        });
      }
    }
  );
};

const DiscoverPoolButton: React.FC<{
  pool: PoolInfo;
  fetch: PoolFetchInfo;
}> = ({ pool, fetch }) => {
  const { data: session } = useSession();

  const util = trpc.useContext();

  const queryKey = {
    cursor: fetch.discover!.cursor,
    userId: fetch.discover!.userId,
    discover: fetch.discover!.discover,
    amount: fetch.discover!.amount,
  };

  const mut = async () => {
    await util.pool.getPublicPoolsPaginated.cancel(queryKey);
    const prev = util.pool.getPublicPoolsPaginated.getInfiniteData(queryKey);
    if (prev) {
      var pools = prev.pages.flatMap((page) => page.info);
      const index = pools.findIndex((obj) => obj.id === pool.id);
      if (index >= 0) {
        pools[index] = {
          ...pool,
          followInfo: {
            follows: true,
            requested: true,
          },
        };
      }
    }
    return { prev };
  };

  const { mutate: add, isLoading: adding } = trpc.user.addPool.useMutation({
    async onMutate() {
      return await mut();
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

  const { mutate: remove, isLoading: removing } =
    trpc.user.removePool.useMutation({
      async onMutate(_) {
        return await mut();
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

  return ButtonStyle(
    pool.followInfo!.follows,
    pool.followInfo!.requested,
    adding || removing,
    () => {
      if (pool.followInfo!.follows) {
        remove({
          userId: session!.user!.id,
          poolId: pool.id,
          requested: pool.followInfo!.requested,
        });
      } else {
        add({
          userId: session!.user!.id,
          poolId: pool.id,
          isPublic: pool.public,
        });
      }
    }
  );
};

const AuthedNoData: React.FC<{ pool: HighlightPool }> = ({ pool }) => {
  const { data: session } = useSession();

  const { data: userState } = trpc.pool.userState.useQuery({
    userId: session?.user?.id,
    poolId: pool.id,
  });

  const util = trpc.useContext();

  const settled = () => {
    util.pool.userState.invalidate();
  };

  const mutate = async (
    state: { userId?: string | null | undefined; poolId: string },
    newData:
      | {
          follows: boolean;
          requested: boolean;
        }
      | undefined
  ) => {
    await util.pool.userState.cancel(state);

    const prev = util.pool.userState.getData(state);

    util.pool.userState.setData(state, (_) => newData);

    return { prev };
  };

  const { mutate: add, isLoading: adding } = trpc.user.addPool.useMutation({
    onMutate(variables) {
      return mutate(variables, {
        follows: pool.public ? true : false,
        requested: pool.public ? false : true,
      });
    },
    onError(_, variables, context) {
      util.pool.userState.setData(variables, context?.prev);
    },
    onSettled: settled,
  });

  const { mutate: remove, isLoading: removing } =
    trpc.user.removePool.useMutation({
      onMutate(variables) {
        return mutate(variables, { follows: false, requested: false });
      },
      onError(_, variables, context) {
        util.pool.userState.setData(variables, context?.prev);
      },
      onSettled: settled,
    });

  if (!session || !session.user || !userState)
    return <LoadingSpinner loadingType={""} />;

  return ButtonStyle(
    userState.follows,
    userState.requested,
    adding || removing,
    () => {
      if (userState.follows) {
        remove({
          userId: session!.user!.id,
          poolId: pool.id,
          requested: userState.requested,
        });
      } else {
        add({
          userId: session!.user!.id,
          poolId: pool.id,
          isPublic: pool.public,
        });
      }
    }
  );
};

export const PoolFollowButton: React.FC<{
  pool: PoolInfo;
  info: PoolFetchInfo;
}> = ({ pool, info }) => {
  const { data: session } = useSession();

  const [open, setOpen] = useState(false);

  if (session && session.user) {
    if (info.discover) {
      return <DiscoverPoolButton pool={pool} fetch={info} />;
    }
    if (info.profile) {
      return <ProfilePoolButton pool={pool} fetch={info} />;
    }
    return <AuthedNoData pool={pool} />;
  }

  return (
    <Popover.Root open={open}>
      <Popover.Trigger>
        {ButtonStyle(false, false, false, () => {
          setOpen((value) => !value);
        })}
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
