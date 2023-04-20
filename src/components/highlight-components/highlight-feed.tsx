import * as AspectRatio from "@radix-ui/react-aspect-ratio";
import {
  PauseIcon,
  PlayIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { HighlightVideo } from "../../types/highlight-out";

import { IconButton, twIcons } from "../misc/icon-button";

import { ActionRow } from "./action-row";
import dynamic from "next/dynamic";

import dayjs from "dayjs";
import * as reltiveTime from "dayjs/plugin/relativeTime";
import * as utc from "dayjs/plugin/utc";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import { removeExt } from "../../utils/highlightUtils";

dayjs.extend(reltiveTime.default);
dayjs.extend(utc.default);
dayjs.extend(LocalizedFormat);

const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

export const ContinuousFeed: React.FC<{
  highlights: HighlightVideo[];
  backPath: string;
  fetching?: boolean;
  from: string;
  hasNext: boolean;
  hasPrev: boolean;
  fetchNext: () => Promise<string | undefined>;
  fetchPrev: () => Promise<string | undefined>;
}> = ({
  highlights,
  backPath,
  fetching,
  from,
  hasNext,
  hasPrev,
  fetchNext,
  fetchPrev,
}) => {
  const { push, query } = useRouter();

  const { startId } = query;

  const length = highlights.length;

  useEffect(() => {
    const initial = highlights.at(0);
    if (startId === undefined && initial) {
      push(
        {
          query: {
            ...query,
            startId: encodeURIComponent(removeExt(initial.id)),
          },
        },
        undefined,
        {
          shallow: true,
        }
      );
    }
  }, [highlights, push, query, startId]);

  const current = useMemo(() => {
    if (typeof startId !== "string") return undefined;
    const index = highlights.findIndex((highlight) => {
      return removeExt(highlight.id) === startId;
    });
    return index == -1 ? undefined : index;
  }, [highlights, startId]);

  const highlight = useMemo(() => {
    return current !== undefined ? highlights.at(current) : undefined;
  }, [current, highlights]);

  const hasCachedNext = current !== undefined && current < length - 1;

  const hasCachedPrev = current !== undefined && current > 0;

  const goNext = async () => {
    const nextHighlight =
      current !== undefined ? highlights.at(current + 1) : undefined;
    if (nextHighlight) {
      return push(
        {
          query: {
            ...query,
            startId: encodeURIComponent(removeExt(nextHighlight.id)),
          },
        },
        undefined,
        {
          shallow: true,
        }
      );
    }
    const id = await fetchNext();
    if (!id) return;
    push(
      {
        query: { ...query, startId: encodeURIComponent(removeExt(id)) },
      },
      undefined,
      {
        shallow: true,
      }
    );
  };

  const goPrev = async () => {
    const prevHighlight =
      current !== undefined ? highlights.at(current - 1) : undefined;
    if (prevHighlight) {
      return push(
        {
          query: {
            ...query,
            startId: encodeURIComponent(removeExt(prevHighlight.id)),
          },
        },
        undefined,
        {
          shallow: true,
        }
      );
    }
    const id = await fetchPrev();
    if (!id) return;
    push(
      {
        query: { ...query, startId: encodeURIComponent(removeExt(id)) },
      },
      undefined,
      {
        shallow: true,
      }
    );
  };

  if (length == 0)
    return (
      <div className="flex justify-center">
        <h3 className="py-3 text-2xl font-semibold text-slate-900 dark:text-white">
          Empty Feed
        </h3>
      </div>
    );

  return (
    <BaseCompontent
      hasNext={() => hasCachedNext || hasNext}
      hasPrev={() => hasCachedPrev || hasPrev}
      next={goNext}
      prev={goPrev}
      highlight={highlight}
      nextHighlight={
        hasNext ? highlights.at(current ?? 0 + 1)?.thumbnailUrl : undefined
      }
      previousHighlight={
        hasPrev ? highlights.at(current ?? 0 - 1)?.thumbnailUrl : undefined
      }
      fetching={fetching ?? false}
      backPath={backPath}
      from={from}
    />
  );
};

export const IndexedFeed: React.FC<{
  highlights: HighlightVideo[];
  backPath: string;
  fetching?: boolean;
  from?: string;
  initial?: number;
}> = ({ highlights, fetching, from, backPath }) => {
  const { push, query } = useRouter();

  const { current } = query;

  const setIndex = useCallback(
    (newValue: number) => {
      push({ query: { ...query, current: newValue } }, undefined, {
        shallow: true,
      });
    },
    [push, query]
  );

  const validIndex =
    typeof current === "string" && !Number.isNaN(parseInt(current));

  const index = validIndex ? parseInt(current) : 0;

  const length = highlights.length;

  const hasNext = () => {
    return index < length - 1;
  };

  const next = () => {
    if (!hasNext()) return;
    if (index < length - 1) return setIndex(index + 1);
  };

  const hasPrev = () => {
    return index > 0;
  };

  const prev = () => {
    if (!hasPrev()) return;
    setIndex(index - 1);
  };

  const highlight = highlights.at(index);

  if (length == 0)
    return (
      <div className="flex justify-center">
        <h3 className="py-3 text-2xl font-semibold text-slate-900 dark:text-white">
          Empty Feed
        </h3>
      </div>
    );

  const progress = `${index + 1}/${length}`;

  return (
    <BaseCompontent
      highlight={highlight}
      from={from}
      progress={progress}
      hasNext={hasNext}
      hasPrev={hasPrev}
      next={next}
      prev={prev}
      fetching={fetching ?? false}
      backPath={backPath}
      nextHighlight={
        hasNext() ? highlights.at(index + 1)?.thumbnailUrl : undefined
      }
      previousHighlight={
        hasPrev() ? highlights.at(index - 1)?.thumbnailUrl : undefined
      }
    />
  );
};

const BaseCompontent: React.FC<{
  hasNext: () => boolean;
  hasPrev: () => boolean;
  next: () => void;
  prev: () => void;
  fetching: boolean;
  highlight?: HighlightVideo;
  nextHighlight?: string;
  previousHighlight?: string;
  backPath: string;
  from?: string;
  progress?: string;
}> = ({
  hasNext,
  hasPrev,
  next,
  prev,
  highlight,
  backPath,
  from,
  progress,
  nextHighlight,
  previousHighlight,
}) => {
  const relativeTime = useMemo(() => {
    if (!highlight || !highlight.timestampUTC) return undefined;
    return dayjs().to(dayjs.unix(Number(highlight.timestampUTC)).utc().local());
  }, [highlight]);

  const dateTime = useMemo(() => {
    if (!highlight || !highlight.timestampUTC) return undefined;
    const date = dayjs.unix(Number(highlight.timestampUTC)).utc().local();
    return date.format("lll");
  }, [highlight]);

  const aspect = useMemo(() => {
    if (
      !highlight ||
      !highlight.aspectRatioNumerator ||
      !highlight.aspectRatioDenominator
    )
      return 9 / 16;
    return highlight.aspectRatioDenominator / highlight.aspectRatioNumerator;
  }, [highlight]);

  if (!highlight)
    return (
      <div className="flex justify-center">
        <h3 className="py-3 text-2xl font-semibold text-slate-900 dark:text-white">
          Not Found
        </h3>
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-start px-2 md:px-8">
      <div className="flex w-full flex-row items-center justify-start gap-2">
        <div className="py-2">
          <IconStyleLink url={backPath}>
            <ChevronLeftIcon className={twIcons(8, 2)} />
          </IconStyleLink>
        </div>
        <h3 className="py-3 text-xl font-semibold text-slate-900 dark:text-white">
          {from ? `${from} - ` : ""}
          {relativeTime && <span>{relativeTime}</span>}
        </h3>
      </div>
      <div className="flex h-full w-full flex-col gap-3 sm:flex-row">
        <div className="flex h-full w-full flex-col divide-y divide-black overflow-clip rounded-md border border-black dark:divide-white dark:border-white">
          <div className="w-full grow overflow-hidden">
            <AspectRatio.Root ratio={aspect}>
              <Player url={highlight.url} />
            </AspectRatio.Root>
          </div>
          <ActionRow highlight={highlight} />
        </div>
        <div className="flex flex-row items-center justify-center gap-3 p-3 sm:flex-col">
          {progress && (
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {progress}
            </h2>
          )}
          <ThumbnailStack
            prev={previousHighlight}
            current={highlight.thumbnailUrl}
            next={nextHighlight}
            aspect={aspect}
            goNext={next}
            goPrev={prev}
            hasNext={hasNext}
            hasPrev={hasPrev}
          />
          <div className="grow" />
          {highlight && (
            <div className="flex flex-col items-end justify-start">
              <h2 className="text-sm text-slate-900 dark:text-white ">
                Captured By:
              </h2>
              {highlight.wristbandId && (
                <IconStyleLink
                  url={`/reels/${highlight?.poolId}/band/${highlight.wristbandId}`}
                >
                  <h2 className="px-2 text-lg font-bold text-slate-900 underline dark:text-white">
                    Band
                  </h2>
                </IconStyleLink>
              )}

              <IconStyleLink url={`/reels/${highlight?.poolId}`}>
                <h2 className="px-2 text-lg font-bold text-slate-900 underline dark:text-white">
                  Reel
                </h2>
              </IconStyleLink>
            </div>
          )}
        </div>
      </div>

      {dateTime && (
        <p className="text-lg font-bold text-slate-900 dark:text-white">
          {dateTime}
        </p>
      )}
    </div>
  );
};

const ThumbnailStack: React.FC<{
  prev?: string;
  current?: string;
  next?: string;
  aspect: number;
  goNext: () => void;
  goPrev: () => void;
  hasPrev: () => boolean;
  hasNext: () => boolean;
}> = ({ prev, current, next, aspect, goNext, goPrev, hasPrev, hasNext }) => {
  const smallHeight = 60;

  const bigHeight = smallHeight * 1.15;

  const smallWidth = smallHeight * aspect;

  const bigWidth = bigHeight * aspect;

  const placeholder = (width: number, height: number) => (
    <div
      className={`bg-gray-200 dark:bg-slate-700`}
      style={{ width: width, height: height }}
    />
  );

  return (
    <div className="flex flex-row">
      <div className="relative w-32" style={{ height: bigHeight * 1.6 }}>
        {hasPrev() && (
          <div
            onClick={() => {
              goPrev();
            }}
            className={
              "absolute inset-x-0 top-0 mx-auto overflow-clip rounded-md border border-black opacity-75 hover:-top-2 dark:border-white"
            }
            style={{ width: smallWidth, height: smallHeight }}
          >
            {prev ? (
              <Image
                src={prev}
                unoptimized
                alt={"Highlight"}
                width={smallWidth}
                height={smallHeight}
              />
            ) : (
              placeholder(smallWidth, smallHeight)
            )}
          </div>
        )}
        <div
          className="absolute inset-0 z-10 m-auto overflow-clip rounded-md border border-black dark:border-white"
          style={{ width: bigWidth, height: bigHeight }}
        >
          {current ? (
            <Image
              src={current}
              unoptimized
              alt={"Highlight"}
              width={bigWidth}
              height={bigHeight}
            />
          ) : (
            placeholder(bigWidth, bigHeight)
          )}
        </div>
        {hasNext() && (
          <div
            onClick={() => {
              goNext();
            }}
            className="absolute inset-x-0 bottom-0 mx-auto overflow-clip rounded-md border border-black opacity-75 hover:-bottom-2 dark:border-white"
            style={{ width: smallWidth, height: smallHeight }}
          >
            {next ? (
              <Image
                src={next}
                unoptimized
                alt={"Highlight"}
                width={smallWidth}
                height={smallHeight}
              />
            ) : (
              placeholder(smallWidth, smallHeight)
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-2 pl-2">
        <IconButton
          disabled={!hasPrev()}
          onClick={() => {
            goPrev();
          }}
        >
          <ChevronUpIcon className={twIcons(8, 0)} />
        </IconButton>

        <IconButton
          disabled={!hasNext()}
          onClick={() => {
            goNext();
          }}
        >
          <ChevronDownIcon className={twIcons(8, 0)} />
        </IconButton>
      </div>
    </div>
  );
};

const IconStyleLink: React.FC<React.PropsWithChildren<{ url: string }>> = ({
  url,
  children,
}) => {
  return (
    <Link
      href={url}
      className="flex items-center justify-center rounded-lg transition-all hover:bg-indigo-500/20 active:bg-indigo-500/30 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:hover:bg-slate-700/50 dark:active:bg-slate-700/30"
    >
      {children}
    </Link>
  );
};

const Player: React.FC<{ url: string }> = ({ url }) => {
  const [playing, setPlaying] = useState(true);

  const [focused, setFocused] = useState(false);

  const [progress, setProgress] = useState({ loaded: 0, played: 0 });

  return (
    <div
      onMouseEnter={() => setFocused(true)}
      onMouseLeave={() => setFocused(false)}
      className="overflow-hidden"
    >
      <Suspense
        fallback={
          <div className="animate-pulse">
            <div className="rounded-lg bg-gray-100 dark:bg-slate-800" />
          </div>
        }
      >
        <ReactPlayer
          url={url}
          loop={true}
          style={{ objectFit: "contain" }}
          playing={playing}
          controls={false}
          playsinline={true}
          pip={true}
          width={"100%"}
          height={"100%"}
          muted={true}
          progressInterval={1}
          onProgress={(state) => {
            setProgress({ loaded: state.loaded, played: state.played });
          }}
        />
      </Suspense>

      {focused && (
        <div className="z-1 absolute left-4 bottom-0 right-4 mb-2 rounded-lg bg-white/70 py-1 dark:bg-slate-900/70">
          <div className="relative flex flex-row items-center justify-end gap-1 px-4">
            <IconButton
              onClick={() => {
                setPlaying((playing) => !playing);
              }}
            >
              {playing ? (
                <PauseIcon className={twIcons(5, 1)} />
              ) : (
                <PlayIcon className={twIcons(5, 1)} />
              )}
            </IconButton>

            <div className="h-2 w-full transition-transform duration-[660ms]">
              <div className="h-2 w-full overflow-clip rounded-full bg-slate-800">
                <div
                  className=" h-2 bg-slate-600"
                  style={{ width: `${progress.loaded * 100}%` }}
                >
                  <div
                    className="h-2 bg-white transition-transform duration-[660ms]"
                    style={{ width: `${progress.played * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
