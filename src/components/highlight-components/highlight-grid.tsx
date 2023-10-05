import * as AspectRatio from "@radix-ui/react-aspect-ratio";

import Image from "next/image";
import { useMemo, useState } from "react";

import type { HighlightThumbnail } from "../../types/highlight-out";
import { ActionRowCompact } from "./action-row";
import Link from "next/link";
import { useGridContext } from "../contexts/grid-context";

import dayjs from "dayjs";
import * as utc from "dayjs/plugin/utc";
import type { UrlObject } from "url";

dayjs.extend(utc.default);

export interface HighlightGroup {
  highlights: HighlightThumbnail[];
  header: string;
  continuous: boolean;
}

export type GroupingStrategy = (
  fetch: HighlightThumbnail[]
) => HighlightGroup[];

const defaultGroup: GroupingStrategy = (highlights) => {
  return [
    {
      header: "Highlights",
      highlights,
      continuous: true,
    },
  ];
};

export const dayGrouping: GroupingStrategy = (highlights) => {
  const dayMap = new Map<string, HighlightThumbnail[]>();

  for (const highlight of highlights) {
    if (!highlight.timestampUtc) continue;

    const key = dayjs
      .unix(Number(highlight.timestampUtc))
      .utc()
      .local()
      .format("MMM DD, YYYY");
    const current = dayMap.get(key);
    if (current) {
      current.push(highlight);
    } else {
      dayMap.set(key, [highlight]);
    }
  }

  const values: HighlightGroup[] = [];

  for (const [key, dayValues] of dayMap) {
    values.push({
      header: key,
      highlights: dayValues,
      continuous: dayValues.length > 15,
    });
  }

  return values;
};

export const hourGrouping: GroupingStrategy = (highlights) => {
  const dayMap = new Map<string, HighlightThumbnail[]>();

  for (const highlight of highlights) {
    if (!highlight.timestampUtc) continue;

    const key = dayjs
      .unix(Number(highlight.timestampUtc))
      .utc()
      .local()
      .format("MMM DD @ h a");
    const current = dayMap.get(key);
    if (current) {
      current.push(highlight);
    } else {
      dayMap.set(key, [highlight]);
    }
  }

  const values: HighlightGroup[] = [];

  for (const [key, dayValues] of dayMap) {
    values.push({
      header: key,
      highlights: dayValues,
      continuous: dayValues.length > 15,
    });
  }

  return values;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const individualGroup: GroupingStrategy = (highlights) => {
  return highlights.map((highlight) => {
    return {
      highlights: [highlight],
      header: highlight.id,
      continuous: false,
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
    <div className="flex w-full flex-col">
      {highlightGroups.map((group, index) => {
        return (
          <div
            key={group.highlights.at(0)?.id ?? group.header}
            className={index == 0 ? "" : "pt-3"}
          >
            <HighlightGrid group={group} />
          </div>
        );
      })}

      <div className="self-center py-8">
        {gridContext.hasMore() && (
          <button
            className="w-fit rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
            onClick={() => gridContext.fetchMore()}
          >
            Load More
          </button>
        )}
      </div>
    </div>
  );
};

const HighlightGrid: React.FC<{ group: HighlightGroup }> = ({ group }) => {
  const length = group.highlights.length;

  const isEmpty = length == 0;

  return (
    <div className="flex flex-col items-start justify-start">
      <h3 className="pb-3 text-2xl font-semibold text-slate-900 dark:text-white">
        {group.header}
      </h3>
      {!isEmpty && (
        <div className="grid w-full grid-cols-2 justify-start gap-2 sm:grid-cols-3">
          {group.highlights.map((highlight, index) => (
            <ImageComponent
              key={highlight.id}
              highlight={highlight}
              length={length}
              continuous={group.continuous}
              start={group.highlights.at(0)!.timestampUtc!}
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
  start: number;
  length: number;
  index: number;
  continuous: boolean;
  highlight: HighlightThumbnail;
}> = ({ highlight, start, length, index, continuous }) => {
  const [loading, setLoading] = useState(true);

  const gridContext = useGridContext();

  const aspect =
    highlight.aspectRatioNumerator && highlight.aspectRatioDenominator
      ? highlight.aspectRatioDenominator / highlight.aspectRatioNumerator
      : 9 / 16;

  const href: UrlObject = useMemo(() => {
    if (continuous)
      return {
        pathname: `/${gridContext.basePath}/${highlight.timestampUtc}`,
      };
    return {
      pathname: `/${gridContext.basePath}/${encodeURIComponent(
        start
      )}/${encodeURIComponent(length)}/${encodeURIComponent(index)}`,
    };
  }, [
    continuous,
    gridContext.basePath,
    highlight.timestampUtc,
    index,
    length,
    start,
  ]);

  return (
    <AspectRatio.Root ratio={aspect}>
      <div
        key={highlight.id}
        className="group relative h-full w-full overflow-clip rounded-md border border-gray-300 hover:border-slate-900 hover:shadow-xl dark:border-gray-500 dark:hover:border-white"
      >
        <div className={"absolute inset-0"}>
          {highlight.thumbnailUrl && (
            <Image
              className="z-10 group-hover:opacity-50"
              src={highlight.thumbnailUrl}
              unoptimized
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

          <Link href={href}>
            <div className="absolute inset-x-0 bottom-[30px] top-0 z-30" />
          </Link>
          <div className="absolute inset-x-0 bottom-0 z-30">
            <ActionRowCompact highlight={highlight} />
          </div>
        </div>
      </div>
    </AspectRatio.Root>
  );
};
