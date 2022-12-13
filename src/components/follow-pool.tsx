import { useSession } from "next-auth/react";
import * as Popover from "@radix-ui/react-popover";
import { date } from "zod";
import { useState } from "react";
import SignInComponent from "./layout/sign-in";
import { trpc } from "../utils/trpc";
import { HighlightPool } from "@prisma/client";

const ButtonStyle = (
  follows: boolean,
  pending: boolean,
  onClick: () => void
) => (
  <button
    onClick={onClick}
    className={
      "w-32 rounded-lg px-3 py-2 font-semibold no-underline transition " +
      (pending
        ? "bg-gray-500 text-white hover:bg-gray-700"
        : "bg-indigo-500 text-white hover:bg-indigo-700")
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

  const success = () => {
    util.pool.getPublicPoolsPaginated.invalidate();
    util.user.getAllPools.invalidate();
  };

  const { mutate: add } = trpc.user.addPool.useMutation({
    onSuccess: success,
  });

  const { mutate: unrequest } = trpc.user.removePoolRequest.useMutation({
    onSuccess: success,
  });

  const { mutate: remove } = trpc.user.removePool.useMutation({
    onSuccess: success,
  });

  return ButtonStyle(followData.following, followData.pending, () => {
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
  });
};

const AuthedNoData: React.FC<{ pool: HighlightPool }> = ({ pool }) => {
  const { data: session } = useSession();

  const { data: userState } = trpc.pool.userState.useQuery({
    userId: session?.user?.id,
    poolId: pool.id,
  });

  const util = trpc.useContext();

  const success = () => {
    util.pool.userState.invalidate();
  };

  const { mutate: add } = trpc.user.addPool.useMutation({
    onSuccess: success,
  });

  const { mutate: unrequest } = trpc.user.removePoolRequest.useMutation({
    onSuccess: success,
  });

  const { mutate: remove } = trpc.user.removePool.useMutation({
    onSuccess: success,
  });

  if (!session || !session.user || !userState)
    return ButtonStyle(false, false, () => {});

  return ButtonStyle(userState.follows, userState.requested, () => {
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
  });
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
        {ButtonStyle(false, false, () => {
          setOpen((value) => !value);
        })}
      </Popover.Trigger>
      <Popover.Content
        onInteractOutside={() => {
          setOpen(false);
        }}
        className="w-fit max-w-xs rounded-lg bg-white p-1 shadow-lg radix-side-bottom:animate-slide-down sm:w-screen sm:max-w-sm"
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="font-semibold text-slate-900">
            Must be signed in to follow
          </p>
          <SignInComponent />
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
