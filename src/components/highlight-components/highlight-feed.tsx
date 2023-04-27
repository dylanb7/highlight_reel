import {
  PauseIcon,
  PlayIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoCircledIcon,
  Cross1Icon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { isMobile } from "react-device-detect";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { HighlightVideo } from "../../types/highlight-out";

import { IconButton, twIcons } from "../misc/icon-button";

import { ActionRow, ActionRowCompactFeed } from "./action-row";
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

type NavProps = {
  hasNext: boolean;
  hasPrev: boolean;
  next: () => void;
  prev: () => void;
};

export const ContinuousFeed: React.FC<{
  highlights: HighlightVideo[];
  backPath: string;
  fetching?: boolean;
  from: string;
  hasNext: boolean;
  hasPrev: boolean;
  next: () => Promise<string | undefined>;
  prev: () => Promise<string | undefined>;
}> = ({
  highlights,
  backPath,
  fetching,
  from,
  hasNext,
  hasPrev,
  next,
  prev,
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
    const id = await next();
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
    const id = await prev();
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
      hasNext={hasCachedNext || hasNext}
      hasPrev={hasCachedPrev || hasPrev}
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

  const hasNext = index < length - 1;

  const next = () => {
    if (!hasNext) Promise.resolve(undefined);
    if (index < length - 1) setIndex(index + 1);
    return Promise.resolve(undefined);
  };

  const hasPrev = index > 0;

  const prev = () => {
    if (!hasPrev) Promise.resolve(undefined);
    setIndex(index - 1);
    return Promise.resolve(undefined);
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
        hasNext ? highlights.at(index + 1)?.thumbnailUrl : undefined
      }
      previousHighlight={
        hasPrev ? highlights.at(index - 1)?.thumbnailUrl : undefined
      }
    />
  );
};

const BaseCompontent: React.FC<
  {
    fetching: boolean;
    highlight?: HighlightVideo;
    nextHighlight?: string;
    previousHighlight?: string;
    backPath: string;
    from?: string;
    progress?: string;
  } & NavProps
> = ({
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
    <MobilePlayer
      aspect={aspect}
      relativeTime={relativeTime}
      hasNext={hasNext}
      hasPrev={hasPrev}
      from={from}
      next={next}
      prev={prev}
      progress={progress}
      highlight={highlight}
      previousHighlight={previousHighlight}
      nextHighlight={nextHighlight}
      backPath={backPath}
    />
  );
  /*
  return (
    <div className="flex flex-col items-center justify-start px-2 md:px-8">
      <BackNav backPath={backPath} from={from} relativeTime={relativeTime} />
      <div className="flex h-full w-full flex-col gap-3 sm:flex-row">
        <div className="flex h-full w-full flex-col divide-y divide-black overflow-clip rounded-md border border-black dark:divide-white dark:border-white">
          <Player url={highlight.url} aspect={aspect} hasGutter={true} />

          <ActionRow highlight={highlight} />
        </div>
        <div className="flex flex-row items-center justify-center gap-3 p-3 sm:flex-col">
          <div className="shrink">
            <Time highlight={highlight} />
          </div>
          {progress && (
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {progress}
            </h2>
          )}
          <ArrowNav
            hasNext={hasNext}
            hasPrev={hasPrev}
            next={next}
            prev={prev}
          />
        </div>
      </div>
      {highlight.poolId && (
        <Source poolId={highlight.poolId} wristbandId={highlight.wristbandId} />
      )}
    </div>
  );*/
};

const MobilePlayer: React.FC<
  {
    aspect: number;
    relativeTime: string | undefined;
    highlight: HighlightVideo;
    nextHighlight?: string;
    previousHighlight?: string;
    backPath: string;
    from?: string;
    progress?: string;
  } & NavProps
> = ({
  aspect,
  relativeTime,
  hasNext,
  hasPrev,
  next,
  prev,
  backPath,
  from,
  progress,
  highlight,
}) => {
  const landscape = useSyncExternalStore(
    (callback) => {
      window.addEventListener("resize", callback);
      return () => {
        window.removeEventListener("resize", callback);
      };
    },
    () => {
      return window.innerWidth > window.innerHeight ? true : false;
    },
    () => false
  );

  const [info, setInfo] = useState(false);

  return (
    <div className="relative flex h-full w-full flex-col items-start justify-start">
      <div className="fixed inset-x-0 top-0 z-50 flex h-8 items-center border-b border-gray-300 bg-white p-4 shadow-sm dark:bg-slate-900">
        <Link href={"/"}>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            H<span className="text-indigo-500">R</span>
          </p>
        </Link>
      </div>
      <div className="relative bottom-0 top-8 w-full overflow-clip">
        {landscape && (
          <div
            className={`absolute inset-y-0 right-0 w-1/3 ${
              info ? "translate-x-0" : "translate-x-full"
            } z-50 flex transform flex-col items-start justify-start gap-4 bg-white p-4 dark:bg-slate-900`}
          >
            <IconButton
              onClick={() => {
                setInfo(false);
              }}
            >
              <Cross1Icon className={twIcons(6, 0)} />
            </IconButton>
            <div className="w-full shrink">
              <Time highlight={highlight} />
            </div>

            {highlight.poolId && (
              <div className="self-center">
                <Source
                  poolId={highlight.poolId}
                  wristbandId={highlight.wristbandId}
                />
              </div>
            )}
          </div>
        )}

        <Player
          url={highlight.url}
          aspect={aspect}
          hasGutter={false}
          highlight={landscape ? highlight : undefined}
        />

        <div className="absolute top-0 flex w-full flex-row items-center justify-between bg-gradient-to-b from-slate-900 px-2">
          <BackNav
            backPath={backPath}
            from={from}
            relativeTime={relativeTime}
            iconSize={6}
          />

          {landscape && (
            <IconButton
              onClick={() => {
                setInfo(true);
              }}
            >
              <InfoCircledIcon className={twIcons(6, 0)} />
            </IconButton>
          )}
        </div>

        {landscape && (
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-row items-center justify-center gap-1 rounded-md bg-slate-900/50 p-1">
            {progress && (
              <h2 className="self-center text-xl font-semibold text-slate-900 dark:text-white">
                {progress}
              </h2>
            )}
            <ArrowNav
              hasNext={hasNext}
              hasPrev={hasPrev}
              next={next}
              prev={prev}
            />
          </div>
        )}
        {!landscape && (
          <div className="flex h-full w-full flex-col gap-4 pb-4">
            <ActionRow highlight={highlight} />
            <div className="flex flex-row items-center justify-between px-4">
              <div className="shrink">
                <Time highlight={highlight} />
              </div>
              <div className="flex flex-row items-start justify-start gap-2">
                {progress && (
                  <h2 className="self-center text-xl font-semibold text-slate-900 dark:text-white">
                    {progress}
                  </h2>
                )}
                <ArrowNav
                  hasNext={hasNext}
                  hasPrev={hasPrev}
                  next={next}
                  prev={prev}
                />
              </div>
            </div>

            {highlight.poolId && (
              <div className="self-center">
                <Source
                  poolId={highlight.poolId}
                  wristbandId={highlight.wristbandId}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ThumbnailStack: React.FC<
  {
    prevThumbnail?: string;
    current?: string;
    nextThumbnail?: string;
    aspect: number;
  } & NavProps
> = ({
  prevThumbnail,
  current,
  nextThumbnail,
  aspect,
  next,
  prev,
  hasPrev,
  hasNext,
}) => {
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
        {hasPrev && (
          <div
            onClick={() => {
              prev();
            }}
            className={
              "absolute inset-x-0 top-0 mx-auto overflow-clip rounded-md border border-black opacity-75 hover:-top-2 dark:border-white"
            }
            style={{ width: smallWidth, height: smallHeight }}
          >
            {prevThumbnail ? (
              <Image
                src={prevThumbnail}
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
        {hasNext && (
          <div
            onClick={() => {
              next();
            }}
            className="absolute inset-x-0 bottom-0 mx-auto overflow-clip rounded-md border border-black opacity-75 hover:-bottom-2 dark:border-white"
            style={{ width: smallWidth, height: smallHeight }}
          >
            {nextThumbnail ? (
              <Image
                src={nextThumbnail}
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
      <ArrowNav next={next} prev={prev} hasNext={hasNext} hasPrev={hasPrev} />
    </div>
  );
};

const BackNav: React.FC<{
  backPath: string;
  from?: string;
  relativeTime?: string;
  iconSize?: number;
}> = ({ backPath, from, relativeTime, iconSize }) => {
  const size = iconSize ?? 8;

  return (
    <div className="flex w-full flex-row items-center justify-start gap-2 py-1">
      <IconStyleLink url={backPath}>
        <ChevronLeftIcon className={twIcons(size, 2)} />
      </IconStyleLink>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
        {from ? `${from} - ` : ""}
        {relativeTime && <span>{relativeTime}</span>}
      </h3>
    </div>
  );
};

const ArrowNav: React.FC<{ iconSize?: number } & NavProps> = ({
  hasNext,
  hasPrev,
  next,
  prev,
  iconSize,
}) => {
  const size = iconSize ?? 8;
  return (
    <div className="flex flex-col justify-center gap-1">
      <IconButton
        disabled={!hasPrev}
        onClick={() => {
          prev();
        }}
      >
        <ChevronUpIcon className={twIcons(size, 0)} />
      </IconButton>

      <IconButton
        disabled={!hasNext}
        onClick={() => {
          next();
        }}
      >
        <ChevronDownIcon className={twIcons(size, 0)} />
      </IconButton>
    </div>
  );
};

const Time: React.FC<{ highlight: HighlightVideo }> = ({ highlight }) => {
  const dateTime = useMemo(() => {
    if (!highlight.timestampUTC) return undefined;
    const date = dayjs.unix(Number(highlight.timestampUTC)).utc().local();
    return [
      date.format("MMM DD"),
      date.format("YYYY"),
      ...date.format("LT").split(" "),
    ];
  }, [highlight]);

  return (
    <div className="mx-auto flex h-full w-full flex-row items-start justify-center gap-8 ">
      <p className="text-center text-lg font-bold text-slate-900 dark:text-white">
        {dateTime?.at(0) ?? ""}
        <br />
        <span className="text-sm font-semibold text-slate-500 dark:text-gray-300">
          {dateTime?.at(1) ?? ""}
        </span>
      </p>
      <p className="text-center text-lg font-bold text-slate-900 dark:text-white">
        {dateTime?.at(2) ?? ""}
        <br />
        <span className="text-sm font-semibold text-slate-500 dark:text-gray-300">
          {dateTime?.at(3) ?? ""}
        </span>
      </p>
    </div>
  );
};

const Source: React.FC<{ poolId: string; wristbandId?: string | null }> = ({
  poolId,
  wristbandId,
}) => {
  return (
    <div className="flex flex-col items-end justify-start">
      <p className="text-lg font-bold text-slate-900 dark:text-white">
        Captured By:
        {wristbandId && (
          <IconStyleLink url={`/reels/${poolId}/band/${wristbandId}`}>
            <h2 className="underline">Band</h2>
          </IconStyleLink>
        )}
        <IconStyleLink url={`/reels/${poolId}`}>
          <h2 className="underline">Reel</h2>
        </IconStyleLink>
      </p>
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

const Player: React.FC<{
  url: string;
  aspect: number;
  hasGutter: boolean;
  highlight?: HighlightVideo;
}> = ({ url, aspect, hasGutter, highlight }) => {
  const [playing, setPlaying] = useState(true);

  const [focused, setFocused] = useState(false);

  const [progress, setProgress] = useState({ loaded: 0, played: 0 });

  return (
    <div
      onMouseEnter={() => setFocused(true)}
      onMouseLeave={() => setFocused(false)}
      className="relative mx-auto"
      style={{
        maxHeight: hasGutter ? "calc(100vh - 16rem)" : "calc(100vh - 2rem)",
        maxWidth: "100%",
        objectFit: "contain",
        aspectRatio: aspect,
      }}
    >
      <ReactPlayer
        url={url}
        loop={true}
        style={{ objectFit: "cover" }}
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

      {focused && (
        <div className="z-1 absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 pb-1">
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

            <div className="justify-cetner flex w-full flex-row items-center">
              <div className="h-2 grow transition-transform duration-[660ms]">
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
              {highlight && (
                <div className="shrink">
                  <ActionRowCompactFeed highlight={highlight} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
