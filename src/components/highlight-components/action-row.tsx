import {
  HeartFilledIcon,
  HeartIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
} from "@radix-ui/react-icons";
import type {
  HighlightThumbnail,
  HighlightVideo,
} from "../../server/types/highlight-out";
import { IconButton, twIcons } from "../misc/icon-button";

import { useGridContext } from "../contexts/highlight-grid-context";
import { useFeedContext } from "../contexts/feed-context";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { Separator } from "@/shadcn/ui/separator";

const ShareButton = dynamic(() => import("./share"), { ssr: false });

export const ActionRow: React.FC<{ highlight: HighlightVideo }> = ({
  highlight,
}) => {
  const auth = useAuth();

  const noUser = !auth.userId;

  const { like, bookmark, disabled } = useFeedContext();

  return (
    <div className="flex h-12 w-full flex-row items-center justify-between px-3 shadow-sm shadow-gray-300 transition-opacity dark:shadow-slate-900">
      <p className="grow truncate text-sm text-slate-900 dark:text-white">
        {highlight.upvotes + (highlight.upvotes == 1 ? " upvote" : " upvotes")}
      </p>
      <div className="flex flex-row items-center justify-end gap-3">
        <IconButton
          onClick={() => {
            like(highlight);
          }}
          disabled={noUser || disabled}
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
            bookmark(highlight);
          }}
          disabled={noUser || disabled}
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

  const { like, bookmark, disabled } = useFeedContext();

  return (
    <div className="flex w-full flex-row items-center justify-end gap-1 overflow-x-scroll rounded-sm px-3 pb-1 pt-1">
      <div className="flex flex-row gap-1 rounded-full border border-white px-1">
        <h1 className="px-1 text-sm text-white">{highlight.upvotes}</h1>
        <IconButton
          onClick={() => {
            like(highlight);
          }}
          disabled={noUser || disabled}
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
          bookmark(highlight);
        }}
        disabled={noUser || disabled}
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

export const ActionRowGrid: React.FC<{
  highlight: HighlightThumbnail;
}> = ({ highlight }) => {
  const auth = useAuth();

  const noUser = !auth.userId;

  const { like, bookmark, disabled } = useGridContext();

  return (
    <div className="flex w-full flex-row items-center justify-end gap-2 overflow-x-scroll rounded-sm bg-gradient-to-t from-slate-900 px-3 pb-1 pt-2">
      <div className="flex flex-row items-center gap-1 rounded-lg border  border-white pl-2">
        <h1 className="px-2 text-white">{highlight.upvotes}</h1>
        <Separator
          className="w-px grow bg-white"
          decorative
          orientation="vertical"
        />
        <IconButton
          onClick={() => {
            like(highlight);
          }}
          disabled={noUser || disabled}
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
          bookmark(highlight);
        }}
        disabled={noUser || disabled}
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
