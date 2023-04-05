import * as AspectRatio from "@radix-ui/react-aspect-ratio";

import Image from "next/image";
import { useMemo, useState } from "react";

import type { HighlightThumbnail } from "../../types/highlight-out";
import { ActionRowCompact } from "./action-row";
import Link from "next/link";
import { useGridContext } from "../contexts/grid-context";

import dayjs from "dayjs";
import * as utc from "dayjs/plugin/utc";

dayjs.extend(utc.default);

export type HighlightGroup = {
  highlights: HighlightThumbnail[];
  header: string;
};

export type GroupingStrategy = (
  fetch: HighlightThumbnail[]
) => HighlightGroup[];

const defaultGroup: GroupingStrategy = (highlights) => {
  return [
    {
      header: "Highlights",
      highlights,
    },
  ];
};

export const dayGrouping: GroupingStrategy = (highlights) => {
  const dayMap = new Map<string, HighlightThumbnail[]>();

  for (const highlight of highlights) {
    const key = dayjs
      .utc()
      .millisecond(Number(highlight.timestampUTC))
      .local()
      .format("MMM DD, YYYY");

    if (dayMap.has(key)) {
      const current = dayMap.get(key);
      if (!current) continue;
      dayMap.set(key, [...current, highlight]);
    } else {
      dayMap.set(key, [highlight]);
    }
  }

  const values: HighlightGroup[] = [];

  for (const [key, dayValues] of dayMap) {
    values.push({ header: key, highlights: dayValues });
  }

  return values;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const individualGroup: GroupingStrategy = (highlights) => {
  return highlights.map((highlight) => {
    return {
      highlights: [highlight],
      header: highlight.id,
    };
  });
};

export const HighlightGridsComponent: React.FC<{
  highlights: HighlightThumbnail[];
  grouping?: GroupingStrategy;
}> = ({ highlights, grouping }) => {
  const groupStrat = grouping ?? defaultGroup;

  const highlightGroups = useMemo(() => {
    return groupStrat(highlights);
  }, [highlights, groupStrat]);

  const gridContext = useGridContext();

  return (
    <>
      {highlightGroups.map((group) => (
        <HighlightGrid
          group={group}
          key={group.highlights.at(0)?.id ?? group.header}
        />
      ))}
      {gridContext.hasMore() && (
        <div className="mt-4 flex items-center justify-center">
          <button
            className="mb-4 w-fit rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
            onClick={() => gridContext.fetchMore()}
          >
            Load More
          </button>
        </div>
      )}
    </>
  );
};

const HighlightGrid: React.FC<{ group: HighlightGroup }> = ({ group }) => {
  const length = group.highlights.length;

  const isEmpty = length == 0;

  return (
    <div className="flex flex-col items-start justify-start">
      <h3 className="py-3 text-2xl font-semibold text-slate-900 dark:text-white">
        {group.header}
      </h3>
      {!isEmpty && (
        <div className="container grid w-full grid-cols-2 justify-start gap-1 sm:grid-cols-3">
          {group.highlights.map((highlight, index) => (
            <ImageComponent
              key={highlight.id}
              highlight={highlight}
              length={length}
              start={group.highlights.at(0)?.id ?? ""}
              index={index}
            />
          ))}
        </div>
      )}
      {isEmpty && (
        <h3 className="py-3 text-xl font-semibold text-slate-900 dark:text-white">
          No Highlights
        </h3>
      )}
    </div>
  );
};

const ImageComponent: React.FC<{
  start: string;
  length: number;
  index: number;
  highlight: HighlightThumbnail;
}> = ({ highlight, start, length, index }) => {
  const [loading, setLoading] = useState(true);

  const gridContext = useGridContext();

  const aspect =
    highlight.aspectRatioNumerator && highlight.aspectRatioDenominator
      ? highlight.aspectRatioDenominator / highlight.aspectRatioNumerator
      : 9 / 16;

  return (
    <AspectRatio.Root ratio={aspect}>
      <div
        key={highlight.id}
        className="relative h-full w-full overflow-clip rounded-md border border-transparent hover:border-slate-600 hover:border-slate-900 hover:shadow-xl dark:hover:border-white"
      >
        <div className={"absolute left-0 top-0 h-full w-full"}>
          {highlight.thumbnailUrl && (
            <Image
              className="z-10"
              src={highlight.thumbnailUrl}
              alt={"Highlight"}
              onLoadingComplete={() => setLoading(false)}
              onLoad={() => setLoading(true)}
              width={highlight.aspectRatioNumerator ?? 500}
              height={highlight.aspectRatioDenominator ?? 500}
            />
          )}
          {(highlight.thumbnailUrl === undefined || loading) && (
            <div className="absolute inset-0 z-20 animate-pulse bg-gray-100 dark:bg-slate-900" />
          )}

          <Link
            href={{
              pathname: `${gridContext.basePath}/feed/${start}/${length}`,
              query: {
                current: index,
              },
            }}
          >
            <div className="absolute inset-x-0 top-0 bottom-[30px] z-40" />
          </Link>
          <div className="absolute inset-x-0 bottom-0 z-40">
            <ActionRowCompact highlight={highlight} />
          </div>
        </div>
      </div>
    </AspectRatio.Root>
  );
};
