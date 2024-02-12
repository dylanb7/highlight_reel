import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";

import { useState, useDeferredValue } from "react";

import { useResizeDetector } from "react-resize-detector";
import { type ReelFollowing } from "~/server/types/pool-out";
import { api } from "~/utils/trpc";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { LoadingSpinner } from "../misc/loading";
import { ScrollArea } from "@/shadcn/ui/scroll-area";
import Link from "next/link";
import { Button, buttonVariants } from "@/shadcn/ui/button";
import { Input } from "@/shadcn/ui/input";
import { Label } from "@/shadcn/ui/label";
import { cn } from "@/cnutils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/ui/card";

const FetchResults: React.FC<{
  searchTerm: string;
  setClosed: () => void;
  width: number;
}> = ({ searchTerm, setClosed }) => {
  const { data: results, isLoading } = api.reel.reelSearch.useQuery(searchTerm);

  return (
    <ScrollArea className={"h-full pb-2"}>
      <div className="flex flex-col items-center justify-between divide-y">
        {isLoading && <LoadingSpinner loadingType={"Searching..."} />}
        {results && results.length > 0 ? (
          <>
            {results.map((item) => (
              <ReelRow key={item.id} pool={item} setClosed={setClosed} />
            ))}
          </>
        ) : (
          !isLoading && (
            <div className="flex h-full w-full items-center justify-center">
              <Label>No Reels match that name</Label>
            </div>
          )
        )}
      </div>
    </ScrollArea>
  );
};

const ReelRow: React.FC<{
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
      className={cn(buttonVariants({ variant: "link" }), "w-full px-0")}
    >
      <div className="flex w-full flex-row items-center justify-between">
        <Label>{pool.name}</Label>
        <div
          className={cn(
            "decoration-0",
            buttonVariants({ variant: "secondary", size: "sm" })
          )}
        >
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

const ReelSearchComponent: React.FC = () => {
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
      className="mx-4 flex w-full max-w-sm flex-row justify-start gap-2 sm:mx-6 lg:mx-12 lg:max-w-md xl:max-w-lg"
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
          onInteractOutside={setClosed}
          className="z-50"
          style={{ width }}
        >
          <PopoverPrimitive.Arrow className="bg-forground" />
          <Card className="max-h-dvh h-auto">
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <CardTitle>Results</CardTitle>
                <PopoverPrimitive.Close
                  onMouseDown={setClosed}
                  className="inline-flex items-center justify-center rounded-full "
                >
                  <Cross2Icon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                </PopoverPrimitive.Close>
              </div>
            </CardHeader>
            <CardContent>
              {searching && (
                <FetchResults
                  searchTerm={searchTerm}
                  setClosed={setClosed}
                  width={width ?? 0}
                />
              )}
            </CardContent>
          </Card>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
    </div>
  );
};

export default ReelSearchComponent;
