import ReactPlayer from "react-player/lazy";
import type { HighlightFetchInfo } from "../types/highlight-out";
import {
  BookmarkIcon,
  BookmarkFilledIcon,
  HeartIcon,
  HeartFilledIcon,
  Share2Icon,
  PlayIcon,
  PauseIcon,
} from "@radix-ui/react-icons";
import * as AspectRatio from "@radix-ui/react-aspect-ratio";
import { IconButton, twIcons } from "./icon-button";
import { trpc } from "../utils/trpc";
import { useSession } from "next-auth/react";
import { useState } from "react";

export const HighlightView: React.FC<{
  highlight: HighlightFetchInfo;
}> = ({ highlight }) => {
  const aspect =
    highlight.aspectRatioNumerator && highlight.aspectRatioDenominator
      ? highlight.aspectRatioNumerator / highlight.aspectRatioDenominator
      : 16 / 9;
  return (
    <div className=" m-4 w-full cursor-pointer divide-y divide-gray-300 overflow-clip rounded-lg border border-gray-300 bg-white shadow-sm hover:divide-slate-900 hover:border-slate-900 dark:divide-gray-500 dark:border-gray-500 dark:bg-slate-900 dark:hover:divide-white dark:hover:border-white">
      <div className="flex w-full grow items-center justify-center">
        <AspectRatio.Root ratio={aspect}>
          <Player url={highlight.url} />
        </AspectRatio.Root>
      </div>
      <ActionRow highlight={highlight}></ActionRow>
    </div>
  );
};

const ActionRow: React.FC<{ highlight: HighlightFetchInfo }> = ({
  highlight,
}) => {
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
    <div className="flex h-12 w-full flex-row items-center justify-between px-3">
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

const Player: React.FC<{ url: string }> = ({ url }) => {
  const isPlaying = false;

  const [focused, setFocused] = useState(false);

  const [progress, setProgress] = useState({ loaded: 0, played: 0 });

  const [duration, setDuration] = useState<number | undefined>(undefined);

  const validLink = ReactPlayer.canPlay(url);

  console.log(focused);

  return (
    <div
      onMouseEnter={() => setFocused(true)}
      onMouseLeave={() => setFocused(false)}
      className="absolute left-0 top-0 h-full w-full"
    >
      {validLink ? (
        <>
          <ReactPlayer
            url={url}
            loop={true}
            playing={isPlaying}
            width={"100%"}
            height={"100%"}
            controls={false}
            onDuration={(dur) => {
              setDuration(dur);
            }}
            playsinline={true}
            onProgress={(state) => {
              setProgress({ loaded: state.loaded, played: state.played });
            }}
          />

          {focused && (
            <div className="absolute bottom-0 left-0 z-10 mx-1 mb-2 flex flex-row gap-2 rounded-lg shadow-lg shadow-white transition-opacity dark:shadow-slate-900">
              <IconButton
                onClick={() => {
                  return;
                }}
              >
                {isPlaying ? (
                  <PauseIcon className={twIcons} />
                ) : (
                  <PlayIcon className={twIcons} />
                )}
              </IconButton>
              <div className="grow"></div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center rounded-lg bg-gray-200 text-slate-900 dark:bg-slate-700 dark:text-white">
          Cannot load content
        </div>
      )}
    </div>
  );
};
