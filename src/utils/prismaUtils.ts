import { Prisma } from "@prisma/client";

type infiniteQueryProps = {
  cursor: string | null | undefined;
  userId?: string;
  amount: number;
  initialCursor?: string | null;
  includeLiked?: boolean;
  includeBookmarked?: boolean;
  leftPad?: number;
  rightPad?: number;
  wristbandId?: string;
};

export const infiniteHighlightQuery = ({
  cursor,
  initialCursor,
  includeLiked = true,
  userId,
  includeBookmarked = true,
  leftPad = 0,
  amount,
  rightPad = 1,
  wristbandId,
}: infiniteQueryProps) => {
  const cursorId = cursor ?? initialCursor;
  const like = includeLiked && userId !== undefined;
  const bookmark = includeBookmarked && userId !== undefined;
  const includeInfo = Prisma.validator<Prisma.HighlightInclude>()({
    _count: {
      select: {
        upvotes: true,
      },
    },
    upvotes: like
      ? {
          where: {
            id: userId,
          },
        }
      : undefined,
    addedBy: bookmark
      ? {
          where: {
            id: userId,
          },
        }
      : undefined,
  });

  const where = Prisma.validator<Prisma.HighlightFindManyArgs>()(
    wristbandId !== undefined
      ? {
          where: {
            wristbandId: wristbandId,
          },
        }
      : {}
  );

  const grab = Prisma.validator<Prisma.HighlightFindManyArgs>()({
    skip: cursorId ? -leftPad : 0,
    take: cursorId ? leftPad + amount + rightPad : amount + rightPad,
  });

  return Prisma.validator<Prisma.HighlightFindManyArgs>()({
    orderBy: {
      timestampUTC: "desc",
    },
    ...where,
    include: includeInfo,
    ...grab,
    cursor: cursorId
      ? {
          id: cursorId,
        }
      : undefined,
  });
};

export const canViewPool = (
  poolId: string,
  userId: string | null | undefined
) => {
  return Prisma.validator<Prisma.HighlightPoolWhereInput>()(
    userId
      ? {
          OR: [
            {
              public: true,
            },
            {
              followers: {
                some: {
                  id: userId,
                },
              },
            },
          ],
          AND: {
            id: poolId,
          },
        }
      : { id: poolId, public: true }
  );
};
