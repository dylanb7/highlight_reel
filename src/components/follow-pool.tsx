import { useSession } from "next-auth/react";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import SignInComponent from "./sign-in";
import { trpc } from "../utils/trpc";
import { HighlightPool } from "@prisma/client";
import { LoadingSpinner } from "./loading";

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

const AuthedButton: React.FC<{
  pool: HighlightPool;
  followData: {
    pending: boolean;
    following: boolean;
  };
}> = ({ pool, followData }) => {
  const { data: session } = useSession();

  const util = trpc.useContext();

  const { mutate: add, isLoading: adding } = trpc.user.addPool.useMutation({});

  const { mutate: unrequest, isLoading: unrequesting } =
    trpc.user.removePoolRequest.useMutation({});

  const { mutate: remove, isLoading: removing } =
    trpc.user.removePool.useMutation({});

  return ButtonStyle(
    followData.following,
    followData.pending,
    adding || unrequesting || removing,
    () => {
      if (followData.following) {
        remove({
          userId: session!.user!.id,
          poolId: pool.id,
        });
      } else if (followData.pending) {
        unrequest({
          userId: session!.user!.id,
          poolId: pool.id,
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

  const { mutate: unrequest, isLoading: unrequesting } =
    trpc.user.removePoolRequest.useMutation({
      onMutate(variables) {
        return mutate(variables, {
          follows: false,
          requested: false,
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
    adding || unrequesting || removing,
    () => {
      if (userState.follows) {
        remove({
          userId: session!.user!.id,
          poolId: pool.id,
        });
      } else if (userState.requested) {
        unrequest({
          userId: session!.user!.id,
          poolId: pool.id,
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
  pool: HighlightPool;
  followData:
    | {
        pending: boolean;
        following: boolean;
      }
    | null
    | undefined;
}> = ({ pool, followData }) => {
  const { data: session } = useSession();

  const [open, setOpen] = useState(false);

  if (session && session.user) {
    if (!followData) return <AuthedNoData pool={pool} />;
    return <AuthedButton followData={followData} pool={pool} />;
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
