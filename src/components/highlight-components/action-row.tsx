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
import { useRouter } from "next/router";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shadcn/ui/dialog";

import {
  EmailIcon,
  EmailShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from "react-share";

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
        <ShareButton highlight={highlight} adaptive={true} />
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
      <ShareButton highlight={highlight} adaptive={false} />
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
      <ShareButton highlight={highlight} adaptive={false} />
    </div>
  );
};

const ShareButton: React.FC<{
  highlight: BaseHighlight;
  adaptive: boolean;
}> = ({ highlight, adaptive }) => {
  const router = useRouter();

  const url = `${router.basePath}/reels/${encodeURIComponent(
    highlight.poolId ?? ""
  )}/feed/${encodeURIComponent(highlight.timestampUtc ?? "")}`;

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
    <Dialog>
      <DialogTrigger>
        <IconButton
          onClick={() => {
            return;
          }}
        >
          <Share2Icon
            className={
              adaptive
                ? "h-5 w-5 text-slate-900 hover:text-slate-800 dark:text-white dark:hover:text-gray-100"
                : twIcons()
            }
          />
        </IconButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Highlight</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="flex-grid flex gap-2">
          <EmailShareButton url={shareData.url!} title={shareData.title}>
            <EmailIcon />
          </EmailShareButton>
          <TwitterShareButton url={shareData.url!} title={shareData.title}>
            <TwitterIcon />
          </TwitterShareButton>
          <WhatsappShareButton url={shareData.url!} title={shareData.title}>
            <WhatsappIcon />
          </WhatsappShareButton>
          <button
            onClick={() => {
              if (typeof navigator !== undefined) {
                void navigator.clipboard.writeText(shareData.url!);
              }
            }}
            className="rws-icon"
            style={{ background: "#718096" }}
          >
            <svg fill="white" viewBox={"0 0 24 24"} width={64} height={64}>
              <path d="M16 1H4a2 2 0 00-2 2v14h2V3h12V1zm3 4H8a2 2 0 00-2 2v14c0 1.1.9 2 2 2h11a2 2 0 002-2V7a2 2 0 00-2-2zm0 16H8V7h11v14z" />
            </svg>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
