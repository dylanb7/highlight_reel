import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";

import { useState, useDeferredValue } from "react";

import { useResizeDetector } from "react-resize-detector";
import { type ReelFollowing } from "~/server/types/pool-out";
import { api } from "~/utils/trpc";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { LoadingSpinner } from "../misc/loading";
import { ScrollArea } from "@/shadcn/ui/scroll-area";
import Link from "next/link";
import { Button } from "@/shadcn/ui/button";
import { Input } from "@/shadcn/ui/input";

const FetchResults: React.FC<{
  searchTerm: string;
  setClosed: () => void;
  width: number;
}> = ({ searchTerm, setClosed, width }) => {
  const { data: results, isLoading } = api.reel.reelSearch.useQuery(searchTerm);

  return (
    <ScrollArea className={"h-72 pb-2"} style={{ width: width }}>
      <div className="flex flex-col items-center justify-between divide-y">
        {isLoading && <LoadingSpinner loadingType={"Searching..."} />}
        {results && results.length > 0 ? (
          <>
            {results.map((item) => (
              <PoolRow key={item.id} pool={item} setClosed={setClosed} />
            ))}
          </>
        ) : (
          !isLoading && (
            <div className="flex h-full w-full items-center justify-center">
              <p className="text-md font-semibold text-slate-900">
                No Reels match that name
              </p>
            </div>
          )
        )}
      </div>
    </ScrollArea>
  );
};

const PoolRow: React.FC<{
  pool: ReelFollowing;
  setClosed: () => void;
}> = ({ pool, setClosed }) => {
  return (
    <Link
      href={{
        pathname: "/reels/[id]",
        query: { id: pool.id },
      }}
      onClick={setClosed}
      className="w-full"
    >
      <div className="flex w-full flex-row items-center justify-between p-1 hover:bg-gray-300">
        <p className="pl-1 text-sm font-semibold text-slate-900">{pool.name}</p>
        <div className="rounded-lg bg-slate-900 px-2 py-1 text-center text-xs font-semibold text-white">
          {pool.followInfo?.follows ?? false
            ? "Following"
            : pool.public
            ? "Public"
            : "Private"}
        </div>
      </div>
    </Link>
  );
};

const PoolSearchComponent: React.FC = () => {
  const [search, setSearch] = useState("");

  const [searching, setSearching] = useState(false);

  const searchTerm = useDeferredValue(search);

  const setClosed = () => {
    setSearching(false);
    setSearch("");
  };

  const { width, ref } = useResizeDetector();

  return (
    <div
      className="mx-4 flex w-full max-w-sm flex-row justify-start gap-2 sm:mx-6 lg:mx-12 lg:max-w-md"
      ref={ref}
    >
      <PopoverPrimitive.Root open={searching}>
        <PopoverPrimitive.Anchor className="w-full">
          <Input
            placeholder="Reel Name..."
            value={search}
            disabled={searching}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.length > 0) {
                setSearching(true);
              }
            }}
            onChange={(e) => setSearch(e.target.value)}
          />
        </PopoverPrimitive.Anchor>
        {search.length > 0 && (
          <Button
            className="w-10"
            size={"icon"}
            variant={"outline"}
            disabled={searching}
            onClick={() => setSearching(true)}
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
          </Button>
        )}

        <PopoverPrimitive.Content
          align="start"
          side="bottom"
          avoidCollisions={false}
          className={
            "radix-side-bottom:animate-slide-down relative z-50 overflow-clip rounded-lg border border-gray-500 bg-white shadow-sm"
          }
          onInteractOutside={setClosed}
        >
          <PopoverPrimitive.Arrow className="fill-gray-500" />
          <div className="flex flex-row items-center justify-between">
            <h3 className="text-md pb-2 pl-2 font-semibold text-slate-900 underline">
              Search Results
            </h3>
            <PopoverPrimitive.Close
              onMouseDown={setClosed}
              className="inline-flex items-center justify-center rounded-full pr-2 pt-1 outline-none"
            >
              <Cross2Icon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </PopoverPrimitive.Close>
          </div>

          {searching && (
            <FetchResults
              searchTerm={searchTerm}
              setClosed={setClosed}
              width={width ?? 0}
            />
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
    </div>
  );
};

export default PoolSearchComponent;
