import type { Highlight, User } from "@prisma/client";

export type HighlightVideo = BaseHighlight & {
  url: string;
  thumbnailUrl?: string;
};

export type HighlightThumbnail = BaseHighlight & {
  thumbnailUrl?: string;
};

export type BaseHighlight = {
  id: string;
  poolId: string | null;
  timestampUTC: bigint | null;
  aspectRatioNumerator: number | null;
  aspectRatioDenominator: number | null;
  wristbandId: string | null;
  upvotes: number;
  bookmarked: boolean;
  upvoted: boolean;
};

export type HighlightReturn =
  | (Highlight & {
      _count: {
        upvotes: number;
      };
      upvotes: User[];
      addedBy: User[];
    })[]
  | null
  | undefined;

export type URLFetch = {
  s3bucket: string;
  id: string;
};
