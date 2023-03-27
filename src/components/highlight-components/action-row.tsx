import {
  HeartFilledIcon,
  HeartIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  Share2Icon,
} from "@radix-ui/react-icons";
import { useSession } from "next-auth/react";
import type { HighlightFetchInfo } from "../../types/highlight-out";
import { api } from "../../utils/trpc";
import { IconButton, twIcons } from "../icon-button";

export const ActionRow: React.FC<{ highlight: HighlightFetchInfo }> = ({
  highlight,
}) => {
  const utils = api.useContext();

  const { data: session } = useSession();

  const { mutate: upvote, isLoading: upvoting } =
    api.user.upvoteHighlight.useMutation({
      onSettled() {
        utils.pool.getPoolHighlightsPaginated.invalidate();
      },
    });

  const { mutate: bookmark, isLoading: bookmarking } =
    api.user.toggleHighlight.useMutation({
      onSettled() {
        utils.pool.getPoolHighlightsPaginated.invalidate();
      },
    });

  return (
    <div className="flex h-12 w-full flex-row items-center justify-between self-end overflow-x-scroll rounded-sm px-3 shadow-sm shadow-gray-300 transition-opacity dark:shadow-slate-900">
      <p className="grow truncate text-sm text-slate-900 dark:text-white">
        {highlight.upvotes + (highlight.upvotes == 1 ? " upvote" : " upvotes")}
      </p>
      <div className="flex flex-row items-center justify-end gap-2 overflow-x-scroll">
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
        <IconButton
          onClick={() => {
            //TODO: add share functionality
            return;
          }}
        >
          <Share2Icon className={twIcons} />
        </IconButton>
      </div>
    </div>
  );
};
