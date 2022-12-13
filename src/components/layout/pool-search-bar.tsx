"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { trpc } from "../../utils/trpc";
import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";
import { LoadingSpinner } from "../loading";
import { HighlightPool, User } from "@prisma/client";
import Link from "next/link";

const FetchResults: React.FC<{ searchTerm: string; setClosed: () => void }> = ({
  searchTerm,
  setClosed,
}) => {
  const { data: session } = useSession();

  const { data: results, isLoading } = trpc.pool.poolSearch.useQuery({
    searchTerm: searchTerm,
    id: session?.user?.id,
  });

  return (
    <div className="mt-2 flex flex-col justify-items-stretch overflow-y-scroll">
      <ScrollArea.Root className="max-h-64">
        <ScrollArea.Viewport className="inset-0">
          {isLoading && <LoadingSpinner loadingType={"Searching..."} />}
          {results && results.length > 0 ? (
            <>
              {results.map((item) => (
                <PoolRow key={item.id} pool={item} setClosed={setClosed} />
              ))}
            </>
          ) : (
            <p className="text-md font-semibold text-slate-900">
              No Reels match name
            </p>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="w-2">
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
        <ScrollArea.Corner />
      </ScrollArea.Root>
    </div>
  );
};

const PoolRow: React.FC<{
  pool: HighlightPool & {
    followers: User[];
  };
  setClosed: () => void;
}> = ({ pool, setClosed }) => {
  return (
    <Link href={"/reels/" + encodeURIComponent(pool.id)} onClick={setClosed}>
      <div className="flex w-full flex-row items-center justify-between p-1 hover:bg-gray-100">
        <p className="text-sm font-semibold text-slate-900">{pool.name}</p>
        <div className="rounded-lg bg-slate-900 p-1 text-xs font-semibold text-white">
          {pool.followers.length > 0
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

  const setClosed = () => {
    setSearching(false);
    setSearch("");
  };

  return (
    <div className="mx-4 flex w-full max-w-sm flex-row justify-start gap-2 sm:mx-6 lg:mx-12">
      <PopoverPrimitive.Root open={searching}>
        <PopoverPrimitive.Anchor className="w-full">
          <input
            className="w-full appearance-none rounded-lg border-2 border-gray-200 bg-gray-200 p-2 leading-tight text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
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
          <button
            className="h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 p-2 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
            disabled={searching}
            onClick={() => setSearching(true)}
          >
            <MagnifyingGlassIcon className="h-6 w-6" />
          </button>
        )}

        <PopoverPrimitive.Content
          align="start"
          side="bottom"
          avoidCollisions={false}
          className="w-64 max-w-xs rounded-lg border-4 border-gray-200 bg-white p-1 shadow-lg radix-side-bottom:animate-slide-down sm:w-screen sm:max-w-sm"
          onInteractOutside={setClosed}
        >
          <PopoverPrimitive.Arrow className="fill-gray-200" />
          <div className="flex flex-row items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 underline">
              Search Results
            </h3>
            <PopoverPrimitive.Close
              onMouseDown={setClosed}
              className={
                "inline-flex items-center justify-center rounded-full p-1" +
                "focus:outline-none focus-visible:ring focus-visible:ring-gray-200 focus-visible:ring-opacity-75"
              }
            >
              <Cross2Icon className="h-4 w-4 text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-400" />
            </PopoverPrimitive.Close>
          </div>

          {searching && (
            <FetchResults searchTerm={search} setClosed={setClosed} />
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
    </div>
  );
};

export default PoolSearchComponent;
