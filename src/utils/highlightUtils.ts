import type { Highlight, User } from "@prisma/client";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type {
  HighlightReturn,
  HighlightThumbnail,
  HighlightVideo,
  URLFetch,
} from "../types/highlight-out";

const REGION = "us-east-1";

const s3Client = new S3Client({ region: REGION });

const fetchS3Highlight = async (info: URLFetch) => {
  const bucketParams = {
    Bucket: info.s3bucket ?? undefined,
    Key: info.id,
    Body: "BODY",
  };

  const command = new GetObjectCommand(bucketParams);

  return await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });
};

export const packageHighlightsPaginated = async (
  amount: number,
  highlightsRecieved: HighlightReturn,
  cursor: string | null | undefined
) => {
  const rawHighlights =
    highlightsRecieved === null || highlightsRecieved === undefined
      ? []
      : highlightsRecieved;

  let nextCursor: typeof cursor | undefined = undefined;

  if (rawHighlights.length > amount && rawHighlights.length > 0) {
    const extra = rawHighlights.pop();
    nextCursor = extra?.id;
  }

  const highlights: HighlightVideo[] = [];

  for (const rawHighlight of rawHighlights) {
    const bucket = rawHighlight.s3bucket ?? "";

    const url = await fetchS3Highlight({
      s3bucket: bucket,
      id: rawHighlight.id,
    });

    highlights.push({
      ...rawHighlight,
      id: removeExt(rawHighlight.id),
      upvotes: rawHighlight._count.upvotes,
      bookmarked: rawHighlight.addedBy.length > 0,
      upvoted: rawHighlight.upvotes.length > 0,
      url,
    });
  }
  return {
    highlights,
    nextCursor,
  };
};

export const removeExt = (id: string) => id.replace(".mp4", "");

export const addExt = (id: string) => id + ".mp4";

export const packageHighlights = async (
  highlightsRecieved: HighlightReturn
) => {
  const rawHighlights =
    highlightsRecieved === null || highlightsRecieved === undefined
      ? []
      : highlightsRecieved;

  const highlights: HighlightVideo[] = [];

  for (const rawHighlight of rawHighlights) {
    const bucket = rawHighlight.s3bucket ?? "";

    const url = await fetchS3Highlight({
      s3bucket: bucket,
      id: rawHighlight.id,
    });

    const thumbnailUrl = rawHighlight.thumbnail
      ? await fetchS3Highlight({
          s3bucket: bucket,
          id: rawHighlight.thumbnail,
        })
      : undefined;

    highlights.push({
      ...rawHighlight,
      id: removeExt(rawHighlight.id),
      upvotes: rawHighlight._count.upvotes,
      bookmarked: rawHighlight.addedBy.length > 0,
      upvoted: rawHighlight.upvotes.length > 0,
      url,
      thumbnailUrl,
    });
  }
  return highlights;
};

export const packageThumbnailsPaginated = async (
  amount: number,
  highlightsRecieved: HighlightReturn,
  cursor: string | null | undefined
) => {
  const rawHighlights =
    highlightsRecieved === null || highlightsRecieved === undefined
      ? []
      : highlightsRecieved;

  let nextCursor: typeof cursor | undefined = undefined;

  if (rawHighlights.length > amount && rawHighlights.length > 0) {
    const extra = rawHighlights.pop();
    nextCursor = extra?.id;
  }

  const highlights: HighlightThumbnail[] = [];

  for (const rawHighlight of rawHighlights) {
    const bucket = rawHighlight.s3bucket ?? "";

    const thumbnailUrl = rawHighlight.thumbnail
      ? await fetchS3Highlight({
          s3bucket: bucket,
          id: rawHighlight.thumbnail,
        })
      : undefined;

    highlights.push({
      ...rawHighlight,
      id: removeExt(rawHighlight.id),
      upvotes: rawHighlight._count.upvotes,
      bookmarked: rawHighlight.addedBy.length > 0,
      upvoted: rawHighlight.upvotes.length > 0,
      thumbnailUrl,
    });
  }
  return {
    highlights,
    nextCursor,
  };
};

export const addUnathedProps = (
  val:
    | (Highlight & {
        _count: {
          upvotes: number;
        };
        addedBy?: User[];
        upvotes?: User[];
      })[]
    | null
    | undefined
): HighlightReturn => {
  return val
    ? val.map((highlight) => {
        return { ...highlight, addedBy: [], upvotes: [] };
      })
    : null;
};
