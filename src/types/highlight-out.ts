export type HighlightVideo = BaseHighlight & {
  url: string;
  thumbnailUrl?: string;
};

export type HighlightThumbnail = BaseHighlight & {
  thumbnailUrl?: string;
};

export type HighlightReturn = BaseHighlight & {
  s3Bucket: string | null;
  thumbnail: string | null;
};

export interface BaseHighlight {
  id: string;
  poolId: number | null;
  timestampUtc: number | null;
  aspectRatioNumerator: number | null;
  aspectRatioDenominator: number | null;
  wristbandId: string | null;
  upvotes: number;
  bookmarked: boolean;
  upvoted: boolean;
}

export interface URLFetch {
  s3bucket: string;
  id: string;
}
