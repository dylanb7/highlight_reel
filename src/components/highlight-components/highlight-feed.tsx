import {
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { HighlightVideo } from "../../types/highlight-out";

import { IconButton } from "../misc/icon-button";

import { ActionRow, ActionRowCompactFeed } from "./action-row";
import dynamic from "next/dynamic";

import dayjs from "dayjs";
import * as reltiveTime from "dayjs/plugin/relativeTime";
import * as utc from "dayjs/plugin/utc";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import { removeExt } from "../../utils/highlightUtils";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shadcn/ui/sheet";

dayjs.extend(reltiveTime.default);
dayjs.extend(utc.default);
dayjs.extend(LocalizedFormat);

const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

interface NavProps {
  hasNext: boolean;
  hasPrev: boolean;
  next: () => void;
  prev: () => void;
}

export const continuousSlug = z.string();

export const indexedSlug = z.object({});

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
  const { push, replace, query } = useRouter();

  const { slug } = query;

  const currentId = !slug || typeof slug === "string" ? undefined : slug[0];

  const length = highlights.length;

  useEffect(() => {
    const initial = highlights.at(0);
    if (
      (currentId === undefined || Number.isInteger(Number(currentId))) &&
      initial
    ) {
      void replace(
        {
          query: {
            ...query,
            slug: [encodeURIComponent(removeExt(initial.id))],
          },
        },
        undefined,
        {
          shallow: true,
        }
      );
    }
  }, [highlights, query, currentId, replace]);

  const current = useMemo(() => {
    if (typeof currentId !== "string") return undefined;
    const index = highlights.findIndex((highlight) => {
      return removeExt(highlight.id) === currentId;
    });
    return index == -1 ? undefined : index;
  }, [highlights, currentId]);

  const highlight = current !== undefined ? highlights.at(current) : undefined;

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
            slug: [encodeURIComponent(removeExt(nextHighlight.id))],
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
    void push(
      {
        query: { ...query, slug: [encodeURIComponent(removeExt(id))] },
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
            slug: encodeURIComponent(removeExt(prevHighlight.id)),
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
    void push(
      {
        query: { slug: encodeURIComponent(removeExt(id)) },
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
      next={() => {
        void goNext();
      }}
      prev={() => {
        void goPrev();
      }}
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

  const { slug } = query;

  const current = slug?.at(1);

  const validIndex =
    typeof current === "string" && !Number.isNaN(parseInt(current));

  const index = validIndex ? parseInt(current) - 1 : 1;

  const length = highlights.length;

  const hasNext = index < length - 1;

  const setIndex = useCallback(
    (newValue: number) => {
      void push(
        {
          query: {
            ...query,
            slug: [
              removeExt(highlights[0]!.id),
              encodeURIComponent(newValue + 1),
              encodeURIComponent(length),
            ],
          },
        },
        undefined,
        {
          shallow: true,
        }
      );
    },
    [highlights, length, push, query]
  );

  const next = () => {
    if (!hasNext) void Promise.resolve(undefined);
    if (index < length - 1) setIndex(index + 1);
    return Promise.resolve(undefined);
  };

  const hasPrev = index > 0;

  const prev = () => {
    if (!hasPrev) void Promise.resolve(undefined);
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
      next={() => {
        void next();
      }}
      prev={() => {
        void prev();
      }}
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
    if (!highlight || !highlight.timestampUtc) return undefined;
    return dayjs().to(dayjs.unix(Number(highlight.timestampUtc)).utc().local());
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
          Highlight not found
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
    <div className="flex w-full flex-row items-center justify-start gap-2">
      <IconStyleLink url={backPath}>
        <ChevronLeftIcon
          className={
            "m-1 h-6 w-6 text-slate-900 hover:text-slate-800 dark:text-white dark:hover:text-gray-100"
          }
        />
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
}) => {
  return (
    <div className="flex flex-col justify-center gap-1">
      <IconButton
        disabled={!hasPrev}
        onClick={() => {
          prev();
        }}
      >
        <ChevronUpIcon
          className={
            "m-0 h-5 w-5 text-white hover:text-slate-800 dark:hover:text-gray-100 md:h-8 md:w-8"
          }
        />
      </IconButton>

      <IconButton
        disabled={!hasNext}
        onClick={() => {
          next();
        }}
      >
        <ChevronDownIcon
          className={
            "m-0 h-5 w-5 text-white hover:text-slate-800 dark:hover:text-gray-100 md:h-8 md:w-8"
          }
        />
      </IconButton>
    </div>
  );
};

const Time: React.FC<{ highlight: HighlightVideo }> = ({ highlight }) => {
  const dateTime = useMemo(() => {
    if (!highlight.timestampUtc) return undefined;
    const date = dayjs.unix(Number(highlight.timestampUtc)).utc().local();
    return [
      date.format("MMM DD"),
      date.format("YYYY"),
      ...date.format("LT").split(" "),
    ];
  }, [highlight]);

  return (
    <div className="flex flex-row items-start justify-start gap-8 ">
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

const Source: React.FC<{ poolId: number; wristbandId?: string | null }> = ({
  poolId,
  wristbandId,
}) => {
  return (
    <div className="flex flex-col items-start justify-start text-sm font-semibold text-slate-500 dark:text-gray-300">
      <p className="text-lg font-bold text-slate-900 dark:text-white">
        Captured By
      </p>
      <IconStyleLink url={`/reels/${poolId}`}>
        <span className="text-sm font-semibold text-slate-500 dark:text-gray-300">
          Reel&nbsp;‣&nbsp;{poolId}
        </span>
      </IconStyleLink>
      {wristbandId && (
        <IconStyleLink
          url={`/reels/${encodeURIComponent(poolId)}/band/${encodeURIComponent(
            wristbandId
          )}`}
        >
          <span className="text-sm font-semibold text-slate-500 dark:text-gray-300">
            Band&nbsp;‣&nbsp;{wristbandId}
          </span>
        </IconStyleLink>
      )}
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
      className="flex items-center justify-center rounded-lg p-1 transition-all hover:bg-indigo-500/20 active:bg-indigo-500/30 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:hover:bg-slate-700/50 dark:active:bg-slate-700/30"
    >
      {children}
    </Link>
  );
};

const Overlay: React.FC<
  {
    isLandscape: boolean;
    highlight: HighlightVideo | undefined;
    progress?: string;
  } & NavProps
> = ({ isLandscape, highlight, hasNext, hasPrev, next, prev, progress }) => {
  const [focused, setFocused] = useState(true);

  return (
    <div
      className="absolute inset-0"
      onMouseLeave={() => setFocused(false)}
      onMouseMove={() => setFocused(true)}
      onClick={() => setFocused((val) => !val)}
    >
      {isLandscape && focused && (
        <div className="absolute right-2 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-md bg-slate-900/80 p-0.5 md:p-1">
          <div className="flex flex-row">
            {progress && (
              <h2 className="self-center text-xl font-semibold text-white">
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
          {highlight && <ActionRowCompactFeed highlight={highlight} />}
        </div>
      )}
    </div>
  );
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

  const hasGutter = true;

  return (
    <div className="relative flex h-full w-full flex-col items-start justify-start">
      <div className="flex w-full flex-row items-center justify-between bg-white px-2 shadow-md dark:bg-slate-900">
        <BackNav
          backPath={backPath}
          from={from}
          relativeTime={relativeTime}
          iconSize={6}
        />
        {landscape && (
          <Sheet>
            <SheetTrigger>
              <InfoCircledIcon
                className={
                  "h-6 w-6 text-slate-900 hover:text-slate-800 dark:text-white dark:hover:text-gray-100"
                }
              />
            </SheetTrigger>

            <SheetContent>
              <SheetHeader>
                <SheetTitle>Highlight Info</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col items-start justify-start">
                {highlight && <Time highlight={highlight} />}
                {highlight && highlight.poolId && (
                  <Source
                    poolId={highlight.poolId}
                    wristbandId={highlight.wristbandId}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <div className="relative h-full w-full overflow-clip">
        <div
          style={{
            maxHeight: hasGutter ? "calc(100vh - 2.5rem)" : "100vh",
            maxWidth: "100%",
            objectFit: "contain",
            aspectRatio: aspect,
          }}
          className="items-center justify-center"
        >
          <Player url={highlight.url} aspect={aspect} />
        </div>
      </div>

      <div className="flex h-full w-full flex-col gap-4 pb-4">
        <div className="bg-white dark:bg-slate-900">
          <ActionRow highlight={highlight} />
        </div>
        <div className="flex flex-row items-start justify-between px-4">
          <div className="flex shrink flex-col">
            <Time highlight={highlight} />
            {highlight.poolId && (
              <Source
                poolId={highlight.poolId}
                wristbandId={highlight.wristbandId}
              />
            )}
          </div>
          <div className="flex flex-row items-start justify-start gap-2 text-xl">
            {progress && (
              <h2 className="self-center font-semibold text-slate-900 dark:text-white ">
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
      </div>
    </div>
  );
};

const Player: React.FC<{
  url: string;
  aspect: number;
}> = ({ url }) => {
  const [playing, setPlaying] = useState(true);

  return (
    <div className="absolute inset-0 mx-auto">
      <ReactPlayer
        url={url}
        loop={true}
        style={{ objectFit: "cover" }}
        controls={true}
        playsinline={true}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        playing={playing}
        pip={true}
        width={"100%"}
        height={"100%"}
        muted={true}
        progressInterval={1}
      />
    </div>
  );
};
