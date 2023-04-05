import type { Highlight, User } from "@prisma/client";

export type HighlightVideo = {
  id: string;
  poolId: string | null;
  timestampUTC: bigint | null;
  aspectRatioNumerator: number | null;
  aspectRatioDenominator: number | null;
  upvotes: number;
  bookmarked: boolean;
  upvoted: boolean;
  url: string;
};

export type HighlightThumbnail = {
  id: string;
  poolId: string | null;
  timestampUTC: bigint | null;
  aspectRatioNumerator: number | null;
  aspectRatioDenominator: number | null;
  upvotes: number;
  bookmarked: boolean;
  upvoted: boolean;
  thumbnailUrl?: string;
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
