import {
  HeartFilledIcon,
  HeartIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  Share2Icon,
} from "@radix-ui/react-icons";
import type {
  HighlightThumbnail,
  HighlightVideo,
} from "../../types/highlight-out";
import { IconButton, twIcons } from "../misc/icon-button";
import * as Separator from "@radix-ui/react-separator";
import { useGridContext } from "../contexts/grid-context";
import { useFeedContext } from "../contexts/feed-context";

export const ActionRow: React.FC<{ highlight: HighlightVideo }> = ({
  highlight,
}) => {
  const feedContext = useFeedContext();

  return (
    <div className="flex h-12 w-full flex-row items-center justify-between rounded-sm px-3 shadow-sm shadow-gray-300 transition-opacity dark:shadow-slate-900">
      <p className="grow truncate text-sm text-slate-900 dark:text-white">
        {highlight.upvotes + (highlight.upvotes == 1 ? " upvote" : " upvotes")}
      </p>
      <div className="flex flex-row items-center justify-end gap-2">
        <IconButton
          onClick={() => {
            feedContext.like(highlight.id);
          }}
          disabled={feedContext.disabled}
        >
          {highlight.upvoted ? (
            <HeartFilledIcon className={twIcons()} />
          ) : (
            <HeartIcon className={twIcons()} />
          )}
        </IconButton>
        <IconButton
          onClick={() => {
            feedContext.bookmark(highlight.id);
          }}
          disabled={feedContext.disabled}
        >
          {highlight.bookmarked ? (
            <BookmarkFilledIcon className={twIcons()} />
          ) : (
            <BookmarkIcon className={twIcons()} />
          )}
        </IconButton>
        <IconButton
          onClick={() => {
            //TODO: add share functionality
            return;
          }}
        >
          <Share2Icon className={twIcons()} />
        </IconButton>
      </div>
    </div>
  );
};

export const ActionRowCompact: React.FC<{ highlight: HighlightThumbnail }> = ({
  highlight,
}) => {
  const gridContext = useGridContext();

  return (
    <div className="flex w-full flex-row items-center justify-end gap-2 overflow-x-scroll rounded-sm bg-white/70 py-1 px-3 dark:bg-slate-900/70">
      <div className="flex flex-row gap-1 rounded-full border border-slate-900 px-1 dark:border-white">
        <h1 className="px-2 text-sm text-slate-900 dark:text-white">
          {highlight.upvotes}
        </h1>
        <Separator.Root
          className="w-px bg-slate-900 dark:bg-white"
          decorative
          orientation="vertical"
        />
        <IconButton
          onClick={() => {
            gridContext.like(highlight.id);
          }}
          disabled={gridContext.disabled}
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
          gridContext.bookmark(highlight.id);
        }}
        disabled={gridContext.disabled}
      >
        {highlight.bookmarked ? (
          <BookmarkFilledIcon className={twIcons()} />
        ) : (
          <BookmarkIcon className={twIcons()} />
        )}
      </IconButton>
      <IconButton
        onClick={() => {
          //TODO: add share functionality
          return;
        }}
      >
        <Share2Icon className={twIcons()} />
      </IconButton>
    </div>
  );
};
