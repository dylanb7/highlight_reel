import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import SignInComponent from "./misc/sign-in";

import { useAuth } from "@clerk/nextjs";
import { usePoolButtonContext } from "./contexts/follow-pool-context";

const ButtonStyle: React.FC<{ poolId: number }> = ({ poolId }) => {
  const { action, state } = usePoolButtonContext();

  const buttonState = state(poolId);

  return (
    <button
      onClick={() => {
        action(poolId);
      }}
      disabled={buttonState.disabled}
      className={
        "rounded-lg px-3 py-1 text-sm font-semibold no-underline transition " +
        (buttonState.pending
          ? "bg-gray-500 text-white hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 "
          : "bg-indigo-500 text-white hover:bg-indigo-600 hover:dark:bg-indigo-400") +
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

export const PoolFollowButton: React.FC<{
  poolId: number;
}> = ({ poolId }) => {
  const auth = useAuth();

  const [open, setOpen] = useState(false);

  if (auth.userId) {
    return <ButtonStyle poolId={poolId} />;
  }

  return (
    <Popover.Root open={open}>
      <Popover.Trigger
        onClick={() => {
          setOpen(!open);
        }}
      >
        <div
          className={
            "rounded-lg bg-indigo-500 px-3 py-1 text-sm font-semibold text-white no-underline opacity-80 transition hover:bg-indigo-700"
          }
        >
          Follow
        </div>
      </Popover.Trigger>

      <Popover.Content
        onInteractOutside={() => {
          setOpen(false);
        }}
        className="w-fit max-w-xs rounded-lg bg-white p-1 shadow-lg border border-gray-300 radix-side-bottom:animate-slide-down dark:border-gray-500 dark:bg-slate-900"
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
