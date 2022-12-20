import * as Separator from "@radix-ui/react-separator";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { HighlightPool, User } from "@prisma/client";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";
import { trpc } from "../utils/trpc";
import { PoolComponent } from "./highlight-pool-card";

export const FollowedPoolScroll: React.FC<{
  id: string;
  refId?: string | undefined;
}> = ({ id, refId }) => {
  const [open, setOpen] = useState(true);

  const { data: all } = trpc.pool.getAllPoolsFollowRef.useQuery({
    id: id,
    ref: refId,
  });

  return <PoolScroll pools={all?.pools} title={"Followed Reels"} />;
};

export const PoolScroll: React.FC<{
  pools:
    | (HighlightPool & {
        pending: User[];
        followers: User[];
        _count: {
          highlights: number;
          followers: number;
        };
      })[]
    | null
    | undefined;
  title: string;
}> = ({ pools, title }) => {
  const [open, setOpen] = useState(true);

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
                      <PoolComponent key={pool.id} pool={pool} />
                    ))}
                </div>
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="horizontal"
              className="mx-8 flex h-2 flex-col rounded-full bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
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
  user: User & {
    _count: {
      followedBy: number;
      following: number;
    };
  };
}> = ({ user }) => {
  return (
    <div className="justify-left ml-8 w-fit">
      <p className="text-2xl font-semibold text-slate-900 dark:text-white">
        {user.username}
      </p>
      <Separator.Root
        orientation="horizontal"
        decorative
        className="my-1 h-px bg-slate-900 dark:bg-white"
      />
      <div className="flex flex-row justify-between">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">
          Following: {user._count.following}
        </p>
        <Separator.Root
          orientation="vertical"
          decorative
          className="mx-1 w-px bg-slate-900 dark:bg-white"
        />
        <p className="text-xs font-semibold text-slate-900 dark:text-white">
          Followers: {user._count.followedBy}
        </p>
      </div>
    </div>
  );
};

export const ProfileHighlights: React.FC<{
  id: string;
  refId?: string | undefined;
}> = ({ id, refId }) => {
  return (
    <div className="mt-5 flex flex-col">
      <p className="ml-8 text-2xl font-semibold text-slate-900 dark:text-white">
        Highlights
      </p>
    </div>
  );
};
