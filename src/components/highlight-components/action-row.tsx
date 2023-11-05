import {
  HeartFilledIcon,
  HeartIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  Share2Icon,
} from "@radix-ui/react-icons";
import type {
  BaseHighlight,
  HighlightThumbnail,
  HighlightVideo,
} from "../../types/highlight-out";
import { IconButton, twIcons } from "../misc/icon-button";
import * as Separator from "@radix-ui/react-separator";
import { useGridContext } from "../contexts/highlight-grid-context";
import { useFeedContext } from "../contexts/feed-context";
import { useAuth } from "@clerk/nextjs";
import { RWebShare } from "react-web-share";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Dialog, DialogTrigger } from "@/shadcn/ui/dialog";
import { DialogContent } from "@radix-ui/react-dialog";

export const ActionRow: React.FC<{ highlight: HighlightVideo }> = ({
  highlight,
}) => {
  const auth = useAuth();

  const noUser = !auth.userId;

  const feedContext = useFeedContext();

  return (
    <div className="flex h-12 w-full flex-row items-center justify-between px-3 shadow-sm shadow-gray-300 transition-opacity dark:shadow-slate-900">
      <p className="grow truncate text-sm text-slate-900 dark:text-white">
        {highlight.upvotes + (highlight.upvotes == 1 ? " upvote" : " upvotes")}
      </p>
      <div className="flex flex-row items-center justify-end gap-3">
        <IconButton
          onClick={() => {
            feedContext.like(highlight.id);
          }}
          disabled={noUser || feedContext.disabled}
        >
          {highlight.upvoted ? (
            <HeartFilledIcon
              className={
                "h-5 w-5 text-slate-900 hover:text-slate-800 dark:text-white dark:hover:text-gray-100"
              }
            />
          ) : (
            <HeartIcon
              className={
                "h-5 w-5 text-slate-900 hover:text-slate-800 dark:text-white dark:hover:text-gray-100"
              }
            />
          )}
        </IconButton>
        <IconButton
          onClick={() => {
            feedContext.bookmark(highlight.id);
          }}
          disabled={noUser || feedContext.disabled}
        >
          {highlight.bookmarked ? (
            <BookmarkFilledIcon
              className={
                "h-5 w-5 text-slate-900 hover:text-slate-800 dark:text-white dark:hover:text-gray-100"
              }
            />
          ) : (
            <BookmarkIcon
              className={
                "h-5 w-5 text-slate-900 hover:text-slate-800 dark:text-white dark:hover:text-gray-100"
              }
            />
          )}
        </IconButton>
        <ShareButton highlight={highlight} />
      </div>
    </div>
  );
};

export const ActionRowCompactFeed: React.FC<{
  highlight: HighlightVideo;
}> = ({ highlight }) => {
  const auth = useAuth();

  const noUser = !auth.userId;

  const feedContext = useFeedContext();

  return (
    <div className="flex w-full flex-row items-center justify-end gap-2 overflow-x-scroll rounded-sm px-3 pb-1 pt-1">
      <div className="flex flex-row gap-1 rounded-full border border-white px-1">
        <h1 className="px-2 text-sm text-white">{highlight.upvotes}</h1>
        <Separator.Root
          className="w-px bg-white"
          decorative
          orientation="vertical"
        />
        <IconButton
          onClick={() => {
            feedContext.like(highlight.id);
          }}
          disabled={noUser || feedContext.disabled}
        >
          {highlight.upvoted ? (
            <HeartFilledIcon className={twIcons()} />
          ) : (
            <HeartIcon className={twIcons()} />
          )}
        </IconButton>
      </div>
      <IconButton
        onClick={() => {
          feedContext.bookmark(highlight.id);
        }}
        disabled={noUser || feedContext.disabled}
      >
        {highlight.bookmarked ? (
          <BookmarkFilledIcon className={twIcons()} />
        ) : (
          <BookmarkIcon className={twIcons()} />
        )}
      </IconButton>
      <ShareButton highlight={highlight} />
    </div>
  );
};

export const ActionRowCompact: React.FC<{
  highlight: HighlightThumbnail;
}> = ({ highlight }) => {
  const auth = useAuth();

  const noUser = !auth.userId;

  const gridContext = useGridContext();

  return (
    <div className="flex w-full flex-row items-center justify-end gap-2 overflow-x-scroll rounded-sm bg-gradient-to-t from-slate-900 px-3 pb-1 pt-2">
      <div className="flex flex-row gap-1 rounded-full border  border-white px-1">
        <h1 className="px-2 text-sm text-white">{highlight.upvotes}</h1>
        <Separator.Root
          className="w-px bg-white"
          decorative
          orientation="vertical"
        />
        <IconButton
          onClick={() => {
            gridContext.like(highlight.id);
          }}
          disabled={noUser || gridContext.disabled}
        >
          {highlight.upvoted ? (
            <HeartFilledIcon className={twIcons()} />
          ) : (
            <HeartIcon className={twIcons()} />
          )}
        </IconButton>
      </div>
      <ShareButton highlight={highlight} />
    </div>
  );
};

const ShareButton: React.FC<{ highlight: BaseHighlight }> = ({ highlight }) => {
  const router = useRouter();

  const url = `${router.basePath}/reels/${highlight.poolId}/feed/${highlight.id}`;

  const shareData: ShareData = {
    url,
    title: "Share Highlight",
  };

  if (
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare(shareData)
  ) {
    return (
      <IconButton
        onClick={() => {
          void navigator.share(shareData);
        }}
      >
        <Share2Icon className={twIcons()} />
      </IconButton>
    );
  }
  return (
    <div className="text-black">
      <Dialog>
        <DialogTrigger></DialogTrigger>
        <DialogContent></DialogContent>
      </Dialog>
      <RWebShare data={shareData}>
        <IconButton
          onClick={() => {
            return;
          }}
        >
          <Share2Icon className={twIcons()} />
        </IconButton>
      </RWebShare>
    </div>
  );
};
