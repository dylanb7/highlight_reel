import { Suspense, useMemo } from "react";

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
import { Card, CardContent, CardTitle } from "@/shadcn/ui/card";
import { cn } from "@/cnutils";

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
    <Card className={cn("flex flex-col gap-1 p-1 sm:flex-row", gridSizing)}>
      <CardTitle className="text-sm">
        {first && (
          <div className="flex flex-row gap-2 sm:w-20 sm:flex-col">
            <p>
              {dayjs
                .unix(Number(first.timestampUtc))
                .utc()
                .local()
                .format("LT")}
            </p>
            {highlights > 1 && <p>{`${highlights} angles`}</p>}
          </div>
        )}
      </CardTitle>
      <CardContent className="h-full w-full p-0">
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
                    />
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="ml-14 h-10 w-10" />
            <CarouselNext className="mr-14 h-10 w-10" />
          </Carousel>
        )}
      </CardContent>
    </Card>
  );
};

export const ImageComponent: React.FC<{
  start: number;
  length: number;
  index: number;
  continuous: boolean;
  highlight: HighlightThumbnail;
}> = ({ highlight, start, length, index, continuous }) => {
  const { query, pathname } = useRouter();

  const aspect =
    highlight.aspectRatioNumerator && highlight.aspectRatioDenominator
      ? highlight.aspectRatioDenominator / highlight.aspectRatioNumerator
      : 9 / 16;

  const href: UrlObject = useMemo(() => {
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
    continuous,
    pathname,
    query,
    highlight.timestampUtc,
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
      <div className={"absolute inset-0"}>
        {highlight.thumbnailUrl && (
          <Suspense fallback={<Skeleton />}>
            <Image
              className="z-10 group-hover:opacity-50"
              src={highlight.thumbnailUrl}
              unoptimized
              alt={"Highlight"}
              width={highlight.aspectRatioNumerator ?? 500}
              height={highlight.aspectRatioDenominator ?? 500}
            />
          </Suspense>
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
