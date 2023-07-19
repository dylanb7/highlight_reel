"use client";

import { useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { api } from "../../utils/trpc";
import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";
import { LoadingSpinner } from "../misc/loading";
import Link from "next/link";
import { useResizeDetector } from "react-resize-detector";
import { type PoolFollowing } from "../../types/pool-out";

const FetchResults: React.FC<{
  searchTerm: string;
  setClosed: () => void;
  width: number;
}> = ({ searchTerm, setClosed, width }) => {
  const { data: results, isLoading } = api.pool.poolSearch.useQuery(searchTerm);

  return (
    <ScrollArea.Root
      className={"h-72 overflow-hidden pb-2"}
      style={{ width: width }}
    >
      <ScrollArea.Viewport className="h-full w-full">
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
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        className="mb-2 flex w-2 rounded-full bg-slate-300 hover:bg-slate-400"
      >
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-900 dark:bg-white" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
};

const PoolRow: React.FC<{
  pool: PoolFollowing;
  setClosed: () => void;
}> = ({ pool, setClosed }) => {
  return (
    <Link
      href={"/reels/" + encodeURIComponent(pool.id)}
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
          <input
            className="w-full appearance-none rounded-lg border border-gray-300 bg-white p-2 leading-tight text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-2 dark:border-white"
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
          className={
            "relative z-50 overflow-clip rounded-lg border border-gray-500 bg-white shadow-sm radix-side-bottom:animate-slide-down"
          }
          onInteractOutside={setClosed}
        >
          <PopoverPrimitive.Arrow className="fill-gray-500" />
          <div className="flex flex-row items-center justify-between">
            <h3 className="pl-2 text-sm font-semibold text-slate-900 underline">
              Search Results
            </h3>
            <PopoverPrimitive.Close
              onMouseDown={setClosed}
              className="inline-flex items-center justify-center rounded-full pt-1 pr-2 outline-none"
            >
              <Cross2Icon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </PopoverPrimitive.Close>
          </div>

          {searching && (
            <FetchResults
              searchTerm={search}
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
