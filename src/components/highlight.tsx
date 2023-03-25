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
import { api } from "../utils/trpc";
import { useSession } from "next-auth/react";

import { usePlayingHighlightContext } from "./contexts/highlight-context";
import { useState } from "react";
import { useInView } from "react-intersection-observer";

export const HighlightView: React.FC<{
  highlight: HighlightFetchInfo;
}> = ({ highlight }) => {
  const aspect =
    highlight.aspectRatioNumerator && highlight.aspectRatioDenominator
      ? highlight.aspectRatioNumerator / highlight.aspectRatioDenominator
      : 16 / 9;
  return (
    <div className="my-4 w-72 cursor-pointer divide-y divide-gray-300 overflow-clip rounded-lg border border-gray-300 bg-white shadow-sm hover:divide-slate-900 hover:border-slate-900 dark:divide-gray-500 dark:border-gray-500 dark:bg-slate-900 dark:hover:divide-white dark:hover:border-white lg:w-96">
      <div className="flex w-full items-center justify-center">
        <AspectRatio.Root ratio={aspect}>
          <Player url={highlight.url} highlightId={highlight.id} />
        </AspectRatio.Root>
      </div>
      <ActionRow highlight={highlight}></ActionRow>
    </div>
  );
};

const ActionRow: React.FC<{ highlight: HighlightFetchInfo }> = ({
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

const Player: React.FC<{ url: string; highlightId: string }> = ({
  url,
  highlightId,
}) => {
  const playingContext = usePlayingHighlightContext();

  const isPlaying = playingContext.playingId === highlightId;

  const [focused, setFocused] = useState(false);

  const [progress, setProgress] = useState({ loaded: 0, played: 0 });

  const { ref } = useInView({
    threshold: 1,
    initialInView: true,
    onChange(inView) {
      playingContext.playControl(highlightId, inView);
    },
  });

  const validLink = ReactPlayer.canPlay(url);

  return (
    <div>
      {validLink ? (
        <div
          ref={ref}
          onMouseEnter={() => setFocused(true)}
          onMouseLeave={() => setFocused(false)}
          className="absolute left-0 top-0 h-full w-full"
        >
          <ReactPlayer
            url={url}
            loop={true}
            playing={isPlaying}
            width={"100%"}
            height={"100%"}
            controls={false}
            playsinline={true}
            muted={true}
            progressInterval={1}
            onProgress={(state) => {
              setProgress({ loaded: state.loaded, played: state.played });
            }}
          />

          {focused && (
            <div className="z-1 absolute left-0 bottom-0 right-0 mb-2 rounded-lg shadow-lg shadow-white transition-opacity dark:shadow-slate-900">
              <div className="relative mb-2 flex flex-col items-start justify-end gap-1 px-4">
                <IconButton
                  onClick={() => {
                    playingContext.playControl(highlightId, !isPlaying);
                  }}
                >
                  {isPlaying ? (
                    <PauseIcon className={twIcons} />
                  ) : (
                    <PlayIcon className={twIcons} />
                  )}
                </IconButton>

                <div className="h-2 w-full transition-transform duration-[660ms]">
                  <div className="z-2 h-full w-full overflow-clip rounded-full bg-slate-800">
                    <div
                      className="z-2 h-full bg-slate-600"
                      style={{ width: `${progress.loaded * 100}%` }}
                    >
                      <div
                        className="z-3 h-full bg-white transition-transform duration-[660ms]"
                        style={{ width: `${progress.played * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg bg-gray-200 text-slate-900 dark:bg-slate-700 dark:text-white">
          Cannot load content
        </div>
      )}
    </div>
  );
};

/*
<Progress.Root
value={progress.played}
max={duration}
className="flex h-2 w-32 grow overflow-hidden rounded-full bg-slate-700"
style={{
  transform: "translateZ(0)",
}}
>
<Progress.Indicator
  className="ease-[cubic-bezier(0.65, 0, 0.35, 1)] h-full w-full bg-white transition-transform duration-[200ms]"
  style={{
    transform: `translateX(-${100 - transform}%)`,
  }}
/>
</Progress.Root>*/
