import { type Highlight } from "~/server/db/schema";

export type HighlightVideo = BaseHighlight & {
  url: string;
  thumbnailUrl?: string;
};

export interface VideoAngles {
  angles: HighlightVideo[];
  timestamp: number;
  poolId: number;
}

export type HighlightThumbnail = BaseHighlight & {
  thumbnailUrl?: string;
};

export interface ThumbnailAngles {
  angles: HighlightThumbnail[];
  timestamp: number;
  poolId: number;
}

export type HighlightReturn = BaseHighlight & {
  s3Bucket: string | null;
  thumbnail: string | null;
};

export type BaseHighlight = Highlight & {
  upvotes: number;
  bookmarked: boolean;
  upvoted: boolean;
};

export interface URLFetch {
  s3bucket: string;
  id: string;
}
