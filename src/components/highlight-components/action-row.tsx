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
import { useAuth } from "@clerk/nextjs";

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
            <HeartFilledIcon className={twIcons(5, 0)} />
          ) : (
            <HeartIcon className={twIcons(5, 0)} />
          )}
        </IconButton>
        <IconButton
          onClick={() => {
            feedContext.bookmark(highlight.id);
          }}
          disabled={noUser || feedContext.disabled}
        >
          {highlight.bookmarked ? (
            <BookmarkFilledIcon className={twIcons(5, 0)} />
          ) : (
            <BookmarkIcon className={twIcons(5, 0)} />
          )}
        </IconButton>
        <IconButton
          onClick={() => {
            //TODO: add share functionality
            return;
          }}
        >
          <Share2Icon className={twIcons(5, 0)} />
        </IconButton>
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

export const ActionRowCompact: React.FC<{
  highlight: HighlightThumbnail;
}> = ({ highlight }) => {
  const auth = useAuth();

  const noUser = !auth.userId;

  const gridContext = useGridContext();

  return (
    <div className="flex w-full flex-row items-center justify-end gap-2 overflow-x-scroll rounded-sm bg-gradient-to-t from-slate-900 px-3 pb-1 pt-2">
      <div className="flex flex-row gap-1 rounded-full border border-slate-900 px-1 dark:border-white">
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
      <IconButton
        onClick={() => {
          gridContext.bookmark(highlight.id);
        }}
        disabled={noUser || gridContext.disabled}
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
