import { Highlight } from "@prisma/client";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const REGION = "us-east-1";

const s3Client = new S3Client({ region: REGION });

export type HighlightFetchInfo = Highlight & {
  upvotes: number;
  bookmarked: boolean;
  upvoted: boolean;
  url: string;
};

export type URLFetch = {
  s3bucket: string;
  id: string;
};

export const fetchS3Highlight = async (info: URLFetch) => {
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
