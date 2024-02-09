import { cn } from "@/cnutils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shadcn/ui/avatar";
import { buttonVariants } from "@/shadcn/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/shadcn/ui/card";

import { type ReelInfo } from "~/server/types/pool-out";
import { ReelFollowButton } from "../reel-components/follow-reel";
import { ProfileList } from "../profileComponents/profile-follower-components";
import { Separator } from "@/shadcn/ui/separator";
import Link from "next/link";

export const ReelComponent: React.FC<
  React.PropsWithChildren<{
    reel: ReelInfo;
    hasLink: boolean;
  }>
> = ({ reel: pool, hasLink, children }) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="py-4">
        <div className="flex flex-row justify-between">
          <div className="flex flex-row items-center gap-2">
            {pool.icon && (
              <Avatar>
                <AvatarImage src={pool.icon} />
                <AvatarFallback>
                  {pool.name && pool.name?.length > 2
                    ? pool.name.substring(0, 2)
                    : "Re"}
                </AvatarFallback>
              </Avatar>
            )}
            <CardTitle>{pool.name}</CardTitle>
          </div>
          <ReelFollowButton reelId={pool.id} />
        </div>
        {pool.bio && <CardDescription>{pool.bio}</CardDescription>}
      </CardHeader>
      <CardContent className="py-1">
        <Separator
          orientation="horizontal"
          decorative
          className="mb-1 h-px bg-gray-300 dark:bg-gray-500"
        />
        <div className="justify-left flex flex-wrap">
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-gray-400">
            Highlights: {pool.highlightCount}
          </p>
          <Separator orientation="vertical" className="mx-1 w-px" />
          <ProfileList
            text={"Followers: " + pool.followerCount}
            header={"Pool Followers"}
            fetch={{
              poolFetch: pool.id,
            }}
          />
          <Separator orientation="vertical" className="mx-1 w-px" />
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-gray-400">
            Created: {pool.createdAt?.toLocaleDateString()}
          </p>
        </div>
        {children}
      </CardContent>
      <CardFooter className="py-4">
        {hasLink && (
          <Link
            className={cn(
              buttonVariants({ variant: "link" }),
              buttonVariants({ variant: "outline" }),
              "w-full"
            )}
            href={{ pathname: "/reels/[id]", query: { id: pool.id } }}
          >
            View Reel
          </Link>
        )}
      </CardFooter>
    </Card>
  );
};
