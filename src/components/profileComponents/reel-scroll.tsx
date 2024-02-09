import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shadcn/ui/collapsible";

import { Spinner } from "../misc/loading";

import { ScrollArea, ScrollBar } from "@/shadcn/ui/scroll-area";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { ReelComponent } from "../reel-components/highlight-reel-card";
import { type ReelInfo } from "~/server/types/pool-out";

export const ReelScroll: React.FC<{
  reels: ReelInfo[];
  hasNextPage: boolean;
  loading: boolean;
  fetchNextPage: () => Promise<void>;
  title: string;
  initialOpen: boolean;
}> = ({ reels, title, initialOpen, hasNextPage, fetchNextPage, loading }) => {
  const [open, setOpen] = useState(initialOpen);

  const { ref, inView } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (inView && !loading && hasNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage, loading]);

  const hasReels = reels.length > 0;

  if (!hasReels) return <></>;

  return (
    <Collapsible
      defaultOpen={initialOpen}
      onOpenChange={(open) => {
        setOpen(open);
      }}
      className="flex flex-col"
    >
      <CollapsibleTrigger asChild>
        {hasReels && (
          <div className="ml-4 flex w-fit cursor-pointer flex-row items-center gap-1 sm:ml-8">
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
      </CollapsibleTrigger>
      <CollapsibleContent className="radix-state-open:animate-slide-down h-fit">
        <ScrollArea className="snap-x scroll-pl-4">
          {hasReels && (
            <div className="my-3 flex flex-row gap-4 px-3 pb-1 sm:px-6">
              {reels.map((reel) => {
                return (
                  <div key={reel.id} className="snap-center">
                    <ReelComponent key={reel.id} reel={reel} hasLink={true} />
                  </div>
                );
              })}
              <div ref={ref}>{hasNextPage && <Spinner />}</div>
            </div>
          )}

          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
};
