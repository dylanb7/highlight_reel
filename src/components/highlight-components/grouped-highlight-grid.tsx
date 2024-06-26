import { useEffect, useMemo } from "react";

import type { ThumbnailAngles } from "../../server/types/highlight-out";

import { useGridContext } from "../contexts/highlight-grid-context";

import dayjs from "dayjs";
import * as utc from "dayjs/plugin/utc";

import { useInView } from "react-intersection-observer";
import { Spinner } from "../misc/loading";

import { Skeleton } from "@/shadcn/ui/skeleton";
import { CarouselRow, gridSizing } from "./highlight-thumbnail";
import { Label } from "@/shadcn/ui/label";

dayjs.extend(utc.default);

export interface HighlightGroup {
  highlights: ThumbnailAngles[];
  header: string;
  continuous: boolean;
}

export type GroupingStrategy = (fetch: ThumbnailAngles[]) => HighlightGroup[];

const defaultGroup: GroupingStrategy = (angles) => {
  return [
    {
      header: "Highlights",
      highlights: angles,
      continuous: true,
    },
  ];
};

export const dayGrouping: GroupingStrategy = (
  highlights: ThumbnailAngles[]
) => {
  const dayMap = new Map<string, ThumbnailAngles[]>();

  for (const angle of highlights) {
    if (!angle.timestamp) continue;

    const key = dayjs
      .unix(Number(angle.timestamp))
      .utc()
      .local()
      .format("MMM DD, YYYY");
    const current = dayMap.get(key);
    if (current) {
      current.push(angle);
    } else {
      dayMap.set(key, [angle]);
    }
  }

  const values: HighlightGroup[] = [];

  for (const [key, dayValues] of dayMap) {
    values.push({
      header: key,
      highlights: dayValues,
      continuous: true,
    });
  }

  return values;
};

export const hourGrouping: GroupingStrategy = (angles) => {
  const dayMap = new Map<string, ThumbnailAngles[]>();

  for (const angle of angles) {
    if (!angle.timestamp) continue;

    const key = dayjs
      .unix(Number(angle.timestamp))
      .utc()
      .local()
      .add(1, "hour")
      .format("MMM DD @ h a");
    const current = dayMap.get(key);
    if (current) {
      current.push(angle);
    } else {
      dayMap.set(key, [angle]);
    }
  }

  const values: HighlightGroup[] = [];

  for (const [key, dayValues] of dayMap) {
    values.push({
      header: key,
      highlights: dayValues,
      continuous: true,
    });
  }

  return values;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const individualGroup: GroupingStrategy = (angles) => {
  return angles.map((angle) => {
    return {
      highlights: [angle],
      header: angle.angles.at(0)?.id ?? "_",
      continuous: false,
    };
  });
};

export const HighlightGridGroupsComponent: React.FC<{
  highlights: ThumbnailAngles[];
  grouping?: GroupingStrategy;
}> = ({ highlights, grouping }) => {
  const groupStrat = grouping ?? defaultGroup;

  const { hasMore, fetchMore, disabled } = useGridContext();

  const { ref, inView } = useInView({
    threshold: 0,
  });

  const highlightGroups = useMemo(() => {
    return groupStrat(highlights);
  }, [highlights, groupStrat]);

  useEffect(() => {
    if (inView && hasMore() && !disabled) {
      void fetchMore();
    }
  }, [disabled, fetchMore, hasMore, inView]);

  return (
    <div className="flex w-full flex-col pb-32">
      {highlightGroups.map((group, index) => {
        const length = group.highlights.length;

        const isEmpty = length == 0;
        return (
          <div
            key={group.highlights.at(0)?.timestamp ?? group.header}
            className={index == 0 ? "" : "pt-3"}
          >
            <div className="flex flex-col items-start justify-start">
              <Label className="text-md pb-1">{group.header}</Label>
              {!isEmpty && (
                <GridLayout>
                  {group.highlights.map((angles, index) => (
                    <CarouselRow
                      key={index}
                      angles={angles}
                      length={length}
                      continuous={group.continuous}
                      start={group.highlights.at(0)?.timestamp ?? 0}
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
          </div>
        );
      })}
      <div ref={ref}>{hasMore() && <Spinner />}</div>
    </div>
  );
};

export const LoadingScaffold: React.FC<{ amount: number }> = ({ amount }) => {
  return (
    <GridLayout>
      {Array(amount)
        .fill(1)
        .map((_, index) => {
          return <Skeleton key={index} className={gridSizing} />;
        })}
    </GridLayout>
  );
};

export const GridLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="xl:gap=4 grid w-full grid-cols-1 justify-start gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {children}
    </div>
  );
};

/*
const AngleStack: React.FC<{
  start: number;
  length: number;
  index: number;
  continuous: boolean;
  angles: ThumbnailAngles;
}> = ({ start, length, index, continuous, angles }) => {
  const { basePath } = useGridContext();

  const href: UrlObject = useMemo(() => {
    if (continuous)
      return {
        pathname: `/${basePath.pathname ?? ""}/${encodeURIComponent(
          angles.timestamp
        )}`,
      };

    return {
      pathname: `/${basePath.pathname ?? ""}/${encodeURIComponent(
        start
      )}/${encodeURIComponent(index + 1)}/${encodeURIComponent(length)}`,
    };
  }, [angles.timestamp, basePath, continuous, index, length, start]);

  const highlights = angles.angles.length;

  const first = angles.angles.at(0);

  return (
    <div className="grid">
      {highlights > 1 && (
        <Link href={href}>
          {angles.angles.map((val, index) => {
            return (
              <div
                key={index}
                style={{
                  zIndex: angles.angles.length - index,
                  position: "absolute",
                  top: `${index * 9}px`,
                  left: `${index * 3}px`,
                  bottom: `-${index * 9}px`,
                  right: `${index * 3}px`,
                }}
              >
                <PlainImage highlight={val} />
              </div>
            );
          })}
        </Link>
      )}
      {highlights == 1 && first && (
        <ImageComponent
          start={start}
          length={length}
          index={index}
          continuous={continuous}
          highlight={first}
        />
      )}
    </div>
  );
};

const PlainImage: React.FC<{
  highlight: HighlightThumbnail;
}> = ({ highlight }) => {
  const [loading, setLoading] = useState(true);

  const aspect =
    highlight.aspectRatioNumerator && highlight.aspectRatioDenominator
      ? highlight.aspectRatioDenominator / highlight.aspectRatioNumerator
      : 9 / 16;

  return (
    <AspectRatio ratio={aspect}>
      <div
        key={highlight.id}
        className="group relative h-full w-full overflow-clip rounded-md border border-gray-300 hover:border-slate-900 hover:shadow-xl dark:border-gray-500 dark:hover:border-white"
      >
        {highlight.thumbnailUrl && (
          <Image
            className="z-10 group-hover:opacity-50"
            src={highlight.thumbnailUrl}
            unoptimized
            alt={"Highlight"}
            onLoad={() => setLoading(false)}
            width={highlight.aspectRatioNumerator ?? 500}
            height={highlight.aspectRatioDenominator ?? 500}
          />
        )}
        {(highlight.thumbnailUrl === undefined || loading) && (
          <div className="absolute inset-0 z-20 animate-pulse bg-gray-100 dark:bg-slate-900" />
        )}
      </div>
    </AspectRatio>
  );
};
*/
