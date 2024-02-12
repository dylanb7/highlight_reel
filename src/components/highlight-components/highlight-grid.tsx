import { useEffect, useMemo } from "react";

import type { HighlightThumbnail } from "../../server/types/highlight-out";

import { useGridContext } from "../contexts/highlight-grid-context";

import dayjs from "dayjs";
import * as utc from "dayjs/plugin/utc";

import { useInView } from "react-intersection-observer";
import { Spinner } from "../misc/loading";
import { ImageComponent } from "./highlight-thumbnail";
import { GridLayout } from "./grouped-highlight-grid";
import { Label } from "@/shadcn/ui/label";

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
      .add(1, "hour")
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

  const { ref, inView } = useInView({
    threshold: 0,
  });

  const highlightGroups = useMemo(() => {
    return groupStrat(highlights);
  }, [highlights, groupStrat]);

  const gridContext = useGridContext();

  useEffect(() => {
    if (inView && gridContext.hasMore() && !gridContext.disabled) {
      void gridContext.fetchMore();
    }
  }, [gridContext, inView]);

  return (
    <div className="flex w-full flex-col pb-32">
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
      <div ref={ref}>{gridContext.hasMore() && <Spinner />}</div>
    </div>
  );
};

const HighlightGrid: React.FC<{ group: HighlightGroup }> = ({ group }) => {
  const length = group.highlights.length;

  const isEmpty = length == 0;

  return (
    <div className="flex flex-col items-start justify-start">
      <Label className="text-md pb-1 ">{group.header}</Label>
      {!isEmpty && (
        <GridLayout>
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
        </GridLayout>
      )}
      {isEmpty && (
        <h3 className="py-3 text-xl font-semibold text-slate-900 dark:text-white">
          No Highlights
        </h3>
      )}
    </div>
  );
};
