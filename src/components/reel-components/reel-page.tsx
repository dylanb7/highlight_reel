import NextError from "next/error";
import React, { useMemo } from "react";

import Head from "next/head";

import { Filters } from "~/components/reel-components/reel-filters";
import {
  HighlightGridGroupsComponent,
  LoadingScaffold,
  hourGrouping,
} from "~/components/highlight-components/grouped-highlight-grid";
import { useRouter } from "next/router";
import { Skeleton } from "@/shadcn/ui/skeleton";
import { toUnix, useInitialDate } from "~/utils/date-helpers";
import { api } from "~/utils/trpc";

import {
  type HighlightGridActions,
  HighlightGridContextProvider,
} from "../contexts/highlight-grid-context";
import {
  type BaseHighlight,
  type HighlightThumbnail,
} from "~/server/types/highlight-out";
import PageWrap from "../layout/page-wrap";
import { ReelPageInfo } from "./reel-page-info";
import { type UrlObject } from "url";
import { ReelButtonProvider } from "../contexts/follow-reel-context";
import { type ButtonContext } from "../contexts/button-types";
import { ShareButtonProvider } from "../contexts/share-context";

const LoadFilters: React.FC<{ reelId: number }> = ({ reelId }) => {
  const { push, query } = useRouter();

  const { bandId } = query;

  const { data: bands } = api.reel.getWristbands.useQuery(reelId);

  return (
    <Filters
      bandProps={{
        wristbands: bands ?? [],
        onSelect: (band) => {
          if (band === "All") {
            void push({ pathname: "/reels/[id]", query: { id: reelId } });
          } else {
            void push({
              pathname: "/reels/[id]/band/[bandId]",
              query: { id: reelId, bandId: band },
            });
          }
        },
        selected: bandId as string | undefined,
      }}
      dateProps={{
        onDate: (date) => {
          console.log(date);
          void push({ query: { ...query, from: toUnix(date) } });
        },
      }}
    />
  );
};

const LoadFeed: React.FC<{
  reelId: number;
  basePath: UrlObject;
}> = ({ reelId, basePath }) => {
  const loadAmount = 6;

  const { query } = useRouter();

  const { bandId } = query;

  const initialCursor = useInitialDate();

  const queryKey = {
    amount: loadAmount,
    reelId,
    initialCursor,
    wristbands: typeof bandId === "string" ? [bandId] : bandId,
  };

  const util = api.useUtils();

  const { data, isLoading, hasNextPage, fetchNextPage, error } =
    api.reel.getReelHighlightsPaginated.useInfiniteQuery(queryKey, {
      getNextPageParam: (lastPage) => lastPage?.nextCursor,
    });

  const highlights = useMemo(() => {
    return data?.pages.flatMap((page) => page.highlights) ?? [];
  }, [data?.pages]);

  const { mutate: bookmark, isPending: bookmarking } =
    api.user.toggleHighlight.useMutation({
      onSettled() {
        void util.reel.getReelHighlightsPaginated.invalidate(queryKey);
      },
    });

  const { mutate: upvote, isPending: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        void util.reel.getReelHighlightsPaginated.invalidate(queryKey);
      },
    });

  const actions: HighlightGridActions = {
    basePath: basePath,
    fetchMore: () => {
      void fetchNextPage();
    },
    hasMore: () => hasNextPage ?? false,
    bookmark: (highlight: HighlightThumbnail) => {
      bookmark({ highlightId: highlight.id, add: !highlight.bookmarked });
    },
    like: (highlight: HighlightThumbnail) => {
      upvote({ highlightId: highlight.id, like: !highlight.upvoted });
    },
    disabled: bookmarking || upvoting,
  };

  if (error)
    return (
      <NextError
        title={error.message}
        statusCode={error.data?.httpStatus ?? 500}
      />
    );

  if (isLoading && !highlights) return <LoadingScaffold amount={loadAmount} />;

  return (
    <HighlightGridContextProvider value={actions}>
      <HighlightGridGroupsComponent
        highlights={highlights}
        grouping={hourGrouping}
      />
    </HighlightGridContextProvider>
  );
};

const LoadReelData: React.FC<{ reelId: number }> = ({ reelId }) => {
  const util = api.useUtils();

  const { data, error, isLoading } = api.reel.getReelById.useQuery(reelId);

  const { mutate: add, isPending: adding } = api.user.addReel.useMutation({
    onSettled() {
      void util.reel.getReelById.invalidate(reelId);
    },
  });

  const { mutate: remove, isPending: removing } =
    api.user.removeReel.useMutation({
      onSettled() {
        void util.reel.getReelById.invalidate(reelId);
      },
    });

  const followButtonContext: ButtonContext = {
    action: () => {
      if (!data || typeof reelId === "string") return;
      data.followInfo?.follows;
      if (data.followInfo?.follows) {
        remove({ reelId, requested: data.followInfo.requested });
      } else {
        add({ reelId, isPublic: data.isPublic });
      }
    },
    state: (): {
      follows: boolean;
      pending: boolean;
      disabled: boolean;
    } => {
      if (!data) return { follows: false, pending: false, disabled: false };
      const followInfo = data.followInfo ?? {
        follows: false,
        requested: false,
      };
      return {
        follows: followInfo.follows,
        pending: followInfo.requested,
        disabled: adding || removing,
      };
    },
  };

  if (error)
    return (
      <NextError
        title={error.message}
        statusCode={error.data?.httpStatus ?? 500}
      />
    );
  return (
    <ReelButtonProvider value={followButtonContext}>
      {data && <ReelPageInfo reelInfo={data} />}
      {isLoading && !data && <Skeleton />}
    </ReelButtonProvider>
  );
};

const ReelPage: React.FC<{ basePath: UrlObject }> = ({ basePath }) => {
  const { id, bandId } = useRouter().query;

  const reelId = Number(id);

  return (
    <PageWrap>
      <Head>
        <title>{`Reel • ${(id as "string") ?? "Loading"}${
          bandId ? ` • ${bandId as "string"}` : ""
        }`}</title>
      </Head>
      <ShareButtonProvider
        value={(highlight: BaseHighlight) => {
          if (bandId)
            return `/reels/${encodeURIComponent(
              id as "string"
            )}/band/${encodeURIComponent(
              bandId as "string"
            )}/feed/${encodeURIComponent(highlight.timestampUtc ?? "")}`;
          return `/reels/${encodeURIComponent(
            id as "string"
          )}/feed/${encodeURIComponent(highlight.timestampUtc ?? "")}`;
        }}
      >
        <div className="flex h-full w-full flex-col items-start justify-start px-4 sm:px-8">
          <div className="mt-8 self-center pb-4">
            <LoadReelData reelId={reelId} />
          </div>
          <LoadFilters reelId={reelId} />
          <LoadFeed reelId={reelId} basePath={basePath} />
        </div>
      </ShareButtonProvider>
    </PageWrap>
  );
};

export default ReelPage;
