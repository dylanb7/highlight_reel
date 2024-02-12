import {
  and,
  eq,
  or,
  exists,
  asc,
  desc,
  gt,
  isNotNull,
  lt,
  count,
  lte,
  gte,
} from "drizzle-orm";
import {
  users,
  follows,
  highlight,
  poolsToFollowers,
  highlightPool,
} from "../server/db/schema";
import type { dbType } from "../server/db";
import { type highlightCursor } from "./highlight-utils";
import type {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
} from "drizzle-orm";
import type * as schema from "../server/db/schema";

export const userWhereArgs = (
  currentId: string | null | undefined,
  userId: string,
  db: dbType
) => {
  if (!currentId) return and(eq(users.id, userId), eq(users.public, 1));
  if (currentId === userId) return eq(users.id, userId);
  const followedBy = db
    .select({ followed: count(follows.followedId) })
    .from(follows)
    .where(
      and(eq(follows.followerId, currentId), eq(follows.followedId, userId))
    );
  return and(eq(users.id, userId), or(eq(users.public, 1), exists(followedBy)));
};

export const orderByArgs = (parsedCursor: highlightCursor | undefined) => {
  if (!parsedCursor || parsedCursor.dir === "next")
    return [desc(highlight.timestampUtc), desc(highlight.id)];
  return [asc(highlight.timestampUtc), asc(highlight.id)];
};

export const cursorWhereArgs = (
  parsedCursor: highlightCursor | undefined,
  initialCursor?: number | null
) => {
  const timestamp = parsedCursor?.timestamp ?? initialCursor;
  if (!timestamp) return isNotNull(highlight.id);
  if (!parsedCursor) return lte(highlight.timestampUtc, timestamp);
  if (parsedCursor.dir === "next")
    return or(
      lt(highlight.timestampUtc, parsedCursor.timestamp),
      and(
        eq(highlight.timestampUtc, parsedCursor.timestamp),
        lt(highlight.id, parsedCursor.highlight_id)
      )
    );
  return or(
    gt(highlight.timestampUtc, parsedCursor.timestamp),
    and(
      eq(highlight.timestampUtc, parsedCursor.timestamp),
      gt(highlight.id, parsedCursor.highlight_id)
    )
  );
};

export const canViewPool = (
  userId: string | null | undefined,
  poolId: number,
  db: dbType
) => {
  if (!userId)
    return and(eq(highlightPool.id, poolId), eq(highlightPool.public, 1));
  const userFollowsQuery = db
    .select()
    .from(poolsToFollowers)
    .where(
      and(
        eq(poolsToFollowers.poolId, poolId),
        eq(poolsToFollowers.userId, userId)
      )
    );
  return and(
    eq(highlightPool.id, poolId),
    or(eq(highlightPool.public, 1), exists(userFollowsQuery))
  );
};

export const publicToBool = (value: number | null) => {
  if (value === null) return false;
  return value === 1;
};

type Schema = typeof schema;
type TSchema = ExtractTablesWithRelations<Schema>;

export type IncludeRelation<TableName extends keyof TSchema> = DBQueryConfig<
  "one" | "many",
  boolean,
  TSchema,
  TSchema[TableName]
>["with"];

export type InferResultType<
  TableName extends keyof TSchema,
  With extends IncludeRelation<TableName> | undefined = undefined
> = BuildQueryResult<
  TSchema,
  TSchema[TableName],
  {
    with: With;
  }
>;
