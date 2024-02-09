import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type {
  HighlightReturn,
  HighlightThumbnail,
  HighlightVideo,
  ThumbnailAngles,
  URLFetch,
  VideoAngles,
} from "../server/types/highlight-out";
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

const toVideo = async (ret: HighlightReturn) => {
  const bucket = ret.s3Bucket ?? "";

  const url = await fetchS3Highlight({
    s3bucket: bucket,
    id: ret.id,
  });

  const thumbnailUrl = ret.thumbnail
    ? await fetchS3Highlight({
        s3bucket: bucket,
        id: ret.thumbnail,
      })
    : undefined;
  return {
    ...ret,
    id: removeExt(ret.id),
    url,
    thumbnailUrl,
  } as HighlightVideo;
};

const toThumbnail = async (ret: HighlightReturn) => {
  const bucket = ret.s3Bucket ?? "";

  const thumbnailUrl = ret.thumbnail
    ? await fetchS3Highlight({
        s3bucket: bucket,
        id: ret.thumbnail,
      })
    : undefined;
  return {
    ...ret,
    id: removeExt(ret.id),
    thumbnailUrl,
  } as HighlightThumbnail;
};

export const groupHighlights = (
  allAngles: HighlightReturn[][],
  take: number,
  dir: "next" | "prev" = "next"
): HighlightReturn[][] => {
  const removeEmpty = (values: HighlightReturn[][]) =>
    values.filter((angle) => angle.length);

  let angles = removeEmpty(allAngles);

  if (angles.length <= 1) return angles[0] ? angles[0].map((val) => [val]) : [];

  const concurrent: HighlightReturn[][] = [];

  const timestamp = (value: HighlightReturn | undefined) =>
    value?.timestampUtc ??
    (dir === "next" ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER);

  const isBefore = (
    value: HighlightReturn | undefined,
    compare: HighlightReturn | undefined
  ) => {
    const valueStamp = timestamp(value);
    const compareStamp = timestamp(compare);
    if (dir === "next") return valueStamp >= compareStamp;
    return valueStamp <= compareStamp;
  };

  while (concurrent.length < take && angles.length > 0) {
    const firsts = angles.map((val) => val.at(0));

    let first = 0;
    for (let i = 0; i < firsts.length; i++) {
      if (isBefore(firsts.at(i), firsts.at(first))) {
        first = i;
      }
    }

    const initialAngle = angles[first]?.shift();
    if (!initialAngle) break;

    const otherAngles = [];

    for (let i = 0; i < angles.length; i++) {
      const angleHighlights = angles.at(i);
      if (i === first || !angleHighlights) continue;

      for (let j = 0; j < angleHighlights.length; j++) {
        const test = angleHighlights[j];

        if (
          test?.cameraId === initialAngle.cameraId ||
          test?.wristbandId !== initialAngle.wristbandId
        )
          continue;

        const timeDifference = Math.abs(
          (test.timestampUtc ?? Number.MAX_SAFE_INTEGER) -
            (initialAngle.timestampUtc ?? Number.MIN_SAFE_INTEGER)
        );

        const secondsTolerance = 10;

        if (timeDifference > secondsTolerance) continue;

        otherAngles.push(test);
        angles[i] = angleHighlights.splice(j, 1);
        break;
      }
    }
    concurrent.push([initialAngle, ...otherAngles]);
    angles = removeEmpty(angles);
  }

  return concurrent;
};

export const packageHighlightsPaginated = async (
  highlightsRecieved: HighlightReturn[] | undefined,
  hasNext: boolean,
  dir: "prev" | "next" = "next"
) => {
  const rawHighlights = highlightsRecieved ?? [];

  const cursors = getCursors(rawHighlights, hasNext, dir);

  if (dir === "prev") rawHighlights.reverse();

  const highlights: HighlightVideo[] = [];

  for (const rawHighlight of rawHighlights) {
    const vid = await toVideo(rawHighlight);
    highlights.push(vid);
  }
  return {
    highlights,
    ...cursors,
  };
};

export const packageHighlightGroupsPaginated = async (
  highlightsRecieved: HighlightReturn[][] | undefined,
  poolId: number,
  hasNext: boolean,
  dir: "prev" | "next" = "next"
) => {
  const rawHighlights = highlightsRecieved ?? [];

  const cursors = getCursors(rawHighlights.flat(), hasNext, dir);

  if (dir === "prev") rawHighlights.reverse();

  const highlights: VideoAngles[] = [];

  for (const sublist of rawHighlights) {
    const toAdd = [];
    for (const rawHighlight of sublist) {
      const thumbnail = await toVideo(rawHighlight);
      toAdd.push(thumbnail);
    }
    highlights.push({
      angles: toAdd,
      timestamp: toAdd.at(0)?.timestampUtc ?? 0,
      poolId,
    });
  }

  return {
    highlights,
    ...cursors,
  };
};

export const packageHighlightGroups = async (
  highlightsRecieved: HighlightReturn[][] | undefined,
  poolId: number
) => {
  const rawHighlights = highlightsRecieved ?? [];

  const highlights: VideoAngles[] = [];

  for (const subList of rawHighlights) {
    const toAdd = [];
    for (const rawHighlight of subList) {
      const vid = await toVideo(rawHighlight);
      toAdd.push(vid);
    }
    highlights.push({
      angles: toAdd,
      timestamp: toAdd.at(0)?.timestampUtc ?? 0,
      poolId,
    });
  }
  return highlights;
};

export const packageThumbnailsPaginated = async (
  highlightsRecieved: HighlightReturn[] | undefined,
  hasNext: boolean,
  dir: "prev" | "next" = "next"
) => {
  const rawHighlights = highlightsRecieved ?? [];

  const cursors = getCursors(rawHighlights, hasNext, dir);

  if (dir === "prev") rawHighlights.reverse();

  const highlights: HighlightThumbnail[] = [];

  for (const rawHighlight of rawHighlights) {
    const thumbnail = await toThumbnail(rawHighlight);

    highlights.push(thumbnail);
  }

  return {
    highlights,
    ...cursors,
  };
};

export const packageThumbnailGroupsPaginated = async (
  highlightsRecieved: HighlightReturn[][] | undefined,
  poolId: number,
  hasNext: boolean,
  dir: "prev" | "next" = "next"
) => {
  const rawHighlights = highlightsRecieved ?? [];

  const cursors = getCursors(rawHighlights.flat(), hasNext, dir);

  if (dir === "prev") rawHighlights.reverse();

  const highlights: ThumbnailAngles[] = [];

  for (const sublist of rawHighlights) {
    const toAdd = [];
    for (const rawHighlight of sublist) {
      const thumbnail = await toThumbnail(rawHighlight);
      toAdd.push(thumbnail);
    }
    highlights.push({
      angles: toAdd,
      timestamp: toAdd.at(0)?.timestampUtc ?? 0,
      poolId,
    });
  }

  return {
    highlights,
    ...cursors,
  };
};

export const removeExt = (id: string) => id.replace(".mp4", "");

export const addExt = (id: string) => id + ".mp4";

const getCursors = (
  highlights: HighlightReturn[],
  hasNext: boolean,
  dir: "prev" | "next" = "next"
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
