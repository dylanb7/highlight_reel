import ReactPlayer from "react-player";
import { HighlightFetchInfo } from "../types/highlight-out";
import {
  BookmarkIcon,
  BookmarkFilledIcon,
  HeartIcon,
  HeartFilledIcon,
  Share2Icon,
} from "@radix-ui/react-icons";
import { IconButton, twIcons } from "./icon-button";
import { trpc } from "../utils/trpc";
import { useSession } from "next-auth/react";

export const HighlightView: React.FC<{
  highlight: HighlightFetchInfo;
}> = ({ highlight }) => {
  const utils = trpc.useContext();

  const { data: session } = useSession();

  const { mutate: upvote, isLoading: upvoting } =
    trpc.user.upvoteHighlight.useMutation({
      onSettled() {
        utils.pool.getPoolHighlightsPaginated.invalidate();
      },
    });

  const { mutate: bookmark, isLoading: bookmarking } =
    trpc.user.toggleHighlight.useMutation({
      onSettled() {
        utils.pool.getPoolHighlightsPaginated.invalidate();
      },
    });
  return (
    <div className="m-4 overflow-clip rounded-lg bg-white shadow-lg dark:bg-slate-900">
      <ReactPlayer url={highlight.url} loop={true} playing={true} />
      <div className="flex h-12 w-full flex-row items-center justify-between px-4">
        <p className="text--slate-900 w-24 truncate text-sm dark:text-white">
          {highlight.upvotes + " upvotes"}
        </p>
        <div className="flex h-full w-full flex-row items-center justify-end gap-4">
          <IconButton
            onClick={() => {
              if (session && session.user) {
                upvote({
                  userId: session.user.id,
                  liked: highlight.upvoted,
                  highlightId: highlight.id,
                });
              }
            }}
            disabled={upvoting || session?.user?.id == undefined}
          >
            {highlight.upvoted ? (
              <HeartFilledIcon className={twIcons} />
            ) : (
              <HeartIcon className={twIcons} />
            )}
          </IconButton>
          <IconButton
            onClick={() => {
              if (session && session.user) {
                bookmark({
                  userId: session.user.id,
                  add: !highlight.bookmarked,
                  highlightId: highlight.id,
                });
              }
            }}
            disabled={bookmarking || session?.user?.id == undefined}
          >
            {highlight.bookmarked ? (
              <BookmarkFilledIcon className={twIcons} />
            ) : (
              <BookmarkIcon className={twIcons} />
            )}
          </IconButton>
          <IconButton onClick={() => {}}>
            <Share2Icon className={twIcons} />
          </IconButton>
        </div>
      </div>
    </div>
  );
};
