import { useMemo } from "react";

import { type UrlObject } from "url";

import { ActionRowGrid } from "./action-row";

import dayjs from "dayjs";
import * as utc from "dayjs/plugin/utc";
import * as localizedFormat from "dayjs/plugin/localizedFormat";

import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/shadcn/ui/carousel";
import { Skeleton } from "@/shadcn/ui/skeleton";

import {
  type ThumbnailAngles,
  type HighlightThumbnail,
} from "~/server/types/highlight-out";
import { AspectRatio } from "@/shadcn/ui/aspect-ratio";
import { useRouter } from "next/router";
import Link from "next/link";

import { Label } from "@/shadcn/ui/label";
import { useGridContext } from "../contexts/highlight-grid-context";

dayjs.extend(utc.default);
dayjs.extend(localizedFormat.default);

export const gridSizing = "h-full w-full ";

export const CarouselRow: React.FC<{
  start: number;
  length: number;
  index: number;
  continuous: boolean;
  angles: ThumbnailAngles;
}> = ({ start, length, index, continuous, angles }) => {
  const highlights = angles.angles.length;

  const first = angles.angles.at(0);

  return (
    <div className="relative h-full w-full ">
      <div className="insets-0 p-0">
        {highlights == 1 && first && (
          <ImageComponent
            start={start}
            length={length}
            index={index}
            continuous={continuous}
            highlight={first}
          />
        )}
        {highlights > 1 && (
          <Carousel orientation="horizontal" className="w-full">
            <CarouselContent>
              {angles.angles.map((angle, index) => {
                return (
                  <CarouselItem key={index}>
                    <ImageComponent
                      start={start}
                      length={length}
                      index={index}
                      continuous={continuous}
                      highlight={angle}
                      angles={angles.angles.length}
                    />
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="ml-14 h-10 w-10" />
            <CarouselNext className="mr-14 h-10 w-10" />
          </Carousel>
        )}
      </div>
    </div>
  );
};

export const ImageComponent: React.FC<{
  start: number;
  length: number;
  index: number;
  continuous: boolean;
  highlight: HighlightThumbnail;
  angles?: number;
}> = ({ highlight, start, length, index, continuous, angles }) => {
  const { query, pathname } = useRouter();

  const { overrideClickPath } = useGridContext();

  const aspect =
    highlight.aspectRatioNumerator && highlight.aspectRatioDenominator
      ? highlight.aspectRatioDenominator / highlight.aspectRatioNumerator
      : 9 / 16;

  const href: UrlObject = useMemo(() => {
    if (overrideClickPath) return overrideClickPath(highlight);
    if (continuous)
      return {
        pathname: `${pathname}/feed/[...slug]`,
        query: { ...query, slug: encodeURIComponent(highlight.timestampUtc!) },
      };
    return {
      pathname: `${pathname}/feed/[...slug]`,
      query: {
        ...query,
        slug: [
          encodeURIComponent(start),
          encodeURIComponent(index + 1),
          encodeURIComponent(length),
        ],
      },
    };
  }, [
    overrideClickPath,
    highlight,
    continuous,
    pathname,
    query,
    start,
    index,
    length,
  ]);

  return (
    <AspectRatio
      ratio={aspect}
      className="group flex h-full w-full overflow-clip rounded-md border border-gray-300 hover:border-slate-900 hover:shadow-xl dark:border-gray-500 dark:hover:border-white"
      key={highlight.id}
    >
      <div className={"absolute inset-0 bg-black"}>
        <Label className="text-md absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-slate-900 to-slate-900/10 px-3 pb-1 pt-1 text-white">
          {dayjs
            .unix(Number(highlight.timestampUtc))
            .utc()
            .local()
            .format("LT")}
          {angles && ` • ${angles} angles`}
        </Label>
        {highlight.thumbnailUrl && (
          <Image
            className="z-10 group-hover:opacity-50"
            src={highlight.thumbnailUrl}
            unoptimized
            alt={"Highlight"}
            width={highlight.aspectRatioNumerator ?? 500}
            height={highlight.aspectRatioDenominator ?? 500}
          />
        )}
        {highlight.thumbnailUrl === undefined && <Skeleton />}

        <Link href={href}>
          <div className="absolute inset-x-0 bottom-[30px] top-0 z-30" />
        </Link>
        <div className="absolute inset-x-0 bottom-0 z-30">
          <ActionRowGrid highlight={highlight} />
        </div>
      </div>
    </AspectRatio>
  );
};
