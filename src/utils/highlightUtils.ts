import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type {
  HighlightReturn,
  HighlightThumbnail,
  HighlightVideo,
  URLFetch,
} from "../types/highlight-out";
import { z } from "zod";
import { Buffer } from "buffer";

const REGION = "us-east-1";

const client = new S3Client({ region: REGION });

const fetchS3Highlight = async (info: URLFetch) => {
  const bucketParams = {
    Bucket: info.s3bucket ?? undefined,
    Key: info.id,
    Body: "BODY",
  };

  const command = new GetObjectCommand(bucketParams);

  return await getSignedUrl(client, command, {
    expiresIn: 3600,
  });
};

export const packageHighlightsPaginated = async (
  highlightsRecieved: HighlightReturn[] | undefined,
  hasNext: boolean,
  dir?: "prev" | "next"
) => {
  const rawHighlights = highlightsRecieved ?? [];

  const cursors = getCursors(rawHighlights, hasNext, dir ?? "next");

  if (dir === "prev") rawHighlights.reverse();

  const highlights: HighlightVideo[] = [];

  for (const rawHighlight of rawHighlights) {
    const bucket = rawHighlight.s3Bucket ?? "";

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
      thumbnailUrl,
      url,
    });
  }
  return {
    highlights,
    ...cursors,
  };
};

export const removeExt = (id: string) => id.replace(".mp4", "");

export const addExt = (id: string) => id + ".mp4";

export const packageHighlights = async (
  highlightsRecieved: HighlightReturn[] | undefined
) => {
  const rawHighlights = highlightsRecieved ?? [];

  const highlights: HighlightVideo[] = [];

  for (const rawHighlight of rawHighlights) {
    const bucket = rawHighlight.s3Bucket ?? "";

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
      url,
      thumbnailUrl,
    });
  }
  return highlights;
};

export const packageThumbnailsPaginated = async (
  highlightsRecieved: HighlightReturn[] | undefined,
  hasNext: boolean,
  dir?: "prev" | "next"
) => {
  const rawHighlights = highlightsRecieved ?? [];

  const cursors = getCursors(rawHighlights, hasNext, dir ?? "next");

  if (dir === "prev") rawHighlights.reverse();

  const highlights: HighlightThumbnail[] = [];

  for (const rawHighlight of rawHighlights) {
    const bucket = rawHighlight.s3Bucket ?? "";

    const thumbnailUrl = rawHighlight.thumbnail
      ? await fetchS3Highlight({
          s3bucket: bucket,
          id: rawHighlight.thumbnail,
        })
      : undefined;

    highlights.push({
      ...rawHighlight,
      id: removeExt(rawHighlight.id),
      thumbnailUrl,
    });
  }

  return {
    highlights,
    ...cursors,
  };
};

const getCursors = (
  highlights: HighlightReturn[],
  hasNext: boolean,
  dir: "prev" | "next"
) => {
  let nextCursor = undefined;

  let prevCursor = undefined;

  if (highlights.length === 0) {
    return { nextCursor, prevCursor };
  }

  const first = highlights[0];
  const last = highlights[highlights.length - 1];

  if (!first || !last) return { nextCursor, prevCursor };

  const firstRes = cursorSchema.safeParse({
    highlight_id: first.id,
    timestamp: first.timestampUtc,
    dir: "prev",
  });

  const lastRes = cursorSchema.safeParse({
    highlight_id: last.id,
    timestamp: last.timestampUtc,
    dir: "next",
  });

  if (firstRes.success) {
    prevCursor = createCursor(firstRes.data);
  }

  if (lastRes.success) {
    nextCursor = createCursor(lastRes.data);
  }

  if (!hasNext)
    return dir === "next"
      ? { prevCursor, nextCursor: undefined }
      : { prevCursor: undefined, nextCursor };
  return { nextCursor, prevCursor };
};

export const cursorSchema = z.object({
  highlight_id: z.string(),
  timestamp: z.number(),
  dir: z.enum(["next", "prev"]),
});

export type highlightCursor = z.infer<typeof cursorSchema>;

const decode = (str: string): string =>
  Buffer.from(str, "base64").toString("binary");
const encode = (str: string): string =>
  Buffer.from(str, "binary").toString("base64");

export const createCursor = (cursorInfo: highlightCursor) => {
  return encode(
    `${cursorInfo.highlight_id},${cursorInfo.timestamp},${cursorInfo.dir}`
  );
};

export const decodeCursor = (cursor: string) => {
  const decodedData = decode(cursor);
  const vals = decodedData.split(",");
  console.log(vals);
  const cursorObj = {
    highlight_id: vals[0],
    timestamp: vals[1] ? Number(vals[1]) : undefined,
    dir: vals[2],
  };
  const res = cursorSchema.safeParse(cursorObj);
  if (res.success) {
    return res.data;
  }
  return undefined;
};
