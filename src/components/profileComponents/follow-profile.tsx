import { Popover, PopoverContent, PopoverTrigger } from "@/shadcn/ui/popover";
import { useProfileButtonContext } from "../contexts/follow-profile-context";
import SignInComponent from "../misc/sign-in";
import { useAuth } from "@clerk/nextjs";
import { Button, buttonVariants } from "@/shadcn/ui/button";
import { cn } from "@/cnutils";

export const ProfileFollowButton: React.FC<{
  profileId: string;
}> = ({ profileId }) => {
  const { action, state } = useProfileButtonContext();

  const buttonState = state(profileId);

  const user = useAuth();
  if (user?.userId) {
    if (user?.userId === profileId) {
      return (
        <div className={buttonVariants({ variant: "secondary", size: "sm" })}>
          You
        </div>
      );
    }
    return (
      <Button
        disabled={buttonState.disabled}
        variant={buttonState.pending ? "ghost" : "secondary"}
        size={"sm"}
        onClick={() => action(profileId)}
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
        <div
          className={cn(buttonVariants({ variant: "secondary" }), "opacity-80")}
        >
          Follow
        </div>
      </PopoverTrigger>

      <PopoverContent>
        <div className="m-1 flex flex-col items-center justify-center gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Must be signed in to follow
          </p>
          <SignInComponent />
        </div>
      </PopoverContent>
    </Popover>
  );
};
