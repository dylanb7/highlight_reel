import { Popover, PopoverContent, PopoverTrigger } from "@/shadcn/ui/popover";

import SignInComponent from "../misc/sign-in";

import { useAuth } from "@clerk/nextjs";
import { usePoolButtonContext } from "../contexts/follow-reel-context";
import { cn } from "@/cnutils";
import { Button, buttonVariants } from "@/shadcn/ui/button";
import { Label } from "@/shadcn/ui/label";

export const ReelFollowButton: React.FC<{
  reelId: number;
}> = ({ reelId: poolId }) => {
  const auth = useAuth();

  const { action, state } = usePoolButtonContext();

  const buttonState = state(poolId);

  if (auth?.userId) {
    return (
      <Button
        disabled={buttonState.disabled}
        variant={buttonState.pending ? "secondary" : "default"}
        className={`${!buttonState.pending && "bg-indigo-500"}`}
        onClick={() => action(poolId)}
      >
        {buttonState.follows
          ? "Unfollow"
          : buttonState.pending
          ? "Requested"
          : "Follow"}
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger>
        <div className={cn(buttonVariants(), "bg-indigo-500")}>Follow</div>
      </PopoverTrigger>

      <PopoverContent className="border-2 bg-background">
        <div className="m-1 flex flex-col items-center justify-center gap-2">
          <Label>Must be signed in to follow</Label>
          <SignInComponent />
        </div>
      </PopoverContent>
    </Popover>
  );
};
