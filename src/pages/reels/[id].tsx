import { Highlight, HighlightPool } from "@prisma/client";
import { GetStaticProps } from "next";
import * as Separator from "@radix-ui/react-separator";
import { useSession } from "next-auth/react";
import React from "react";
import { prisma } from "../../server/db/client";
import SignInComponent from "../../components/layout/sign-in";
import { trpc } from "../../utils/trpc";
import { PoolFollowButton } from "../../components/follow-pool";
import { LoadingSpinner } from "../../components/loading";

const PoolView = (props: {
  pool: HighlightPool & {
    _count: {
      highlights: number;
      followers: number;
    };
  };
}) => {
  const { pool } = props;

  const { data: session } = useSession();

  if (!pool) {
    return (
      <PoolMessageCard>
        <p className="font-semibold text-slate-900">
          The reel you are looking for is unavailible
        </p>
      </PoolMessageCard>
    );
  }
  if (!pool.public) return <PrivatePool pool={pool} />;

  return (
    <div className="m-4 flex flex-col items-center justify-center">
      <PoolData pool={pool} />
      <div className="mt-4">
        <HighlightFeed
          userId={session?.user?.id ?? null}
          poolId={pool.id}
          isPublic={pool.public}
        />
      </div>
    </div>
  );
};

const PrivatePool: React.FC<{
  pool: HighlightPool & {
    _count: {
      highlights: number;
      followers: number;
    };
  };
}> = ({ pool }) => {
  const { data: session } = useSession();

  const { data: follows } = trpc.pool.userState.useQuery({
    poolId: pool.id,
    userId: session?.user?.id,
  });

  if (!session || !session.user) {
    return (
      <PoolMessageCard>
        <div className="flex flex-col">
          <PoolData pool={pool} />
          <p className="mt-5 font-semibold text-slate-900">
            This <span className="font-semibold text-indigo-500">Reel</span> is
            private. Sign in to follow.
          </p>
          <div className="mt-2 flex items-center justify-center">
            <SignInComponent />
          </div>
        </div>
      </PoolMessageCard>
    );
  }

  if (!follows || !follows.follows) {
    return (
      <PoolMessageCard>
        <div className="flex flex-col">
          <PoolData pool={pool} />
          <p className="mt-5 font-semibold text-slate-900">
            This <span className="font-semibold text-indigo-500">Reel</span> is
            private. You can request.
          </p>
          <div className="mt-2 flex items-center justify-center">
            <PoolFollowButton
              pool={pool}
              followData={{
                following: false,
                pending: follows?.requested ?? false,
              }}
            />
          </div>
        </div>
      </PoolMessageCard>
    );
  }

  return <></>;
};

const HighlightFeed: React.FC<{
  userId: string | null;
  poolId: string;
  isPublic: boolean;
}> = ({ userId, poolId, isPublic }) => {
  const loadAmount = 4;

  const { data, hasNextPage, fetchNextPage, isLoading } =
    trpc.pool.getPoolHighlightsPaginated.useInfiniteQuery(
      {
        amount: loadAmount,
        userId: userId,
        poolId: poolId,
        isPublic: isPublic,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  if (isLoading) return <LoadingSpinner loadingType={"Loading Highlights"} />;

  return <></>;
};

const PoolMessageCard: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="mt-8 flex h-full items-center justify-center">
      <div className="m-4 flex w-fit items-center justify-center place-self-center rounded-lg p-4 shadow-lg">
        {children}
      </div>
    </div>
  );
};

const PoolData: React.FC<{
  pool: HighlightPool & {
    _count: {
      highlights: number;
      followers: number;
    };
  };
}> = ({ pool }) => {
  return (
    <div className="justify-left">
      <p className="text-2xl font-semibold text-slate-900">{pool.name}</p>
      <Separator.Root
        orientation="horizontal"
        decorative
        className="my-1 h-px bg-slate-900"
      />
      <div className="flex flex-row justify-between">
        <p className="text-xs font-semibold text-slate-900">
          Highlights: {pool._count.highlights}
        </p>
        <Separator.Root
          orientation="vertical"
          decorative
          className="mx-1 w-px bg-slate-900"
        />
        <p className="text-xs font-semibold text-slate-900">
          Followers: {pool._count.followers}
        </p>
        <Separator.Root
          orientation="vertical"
          decorative
          className="mx-1 w-px bg-slate-900"
        />
        <p className="text-xs font-semibold text-slate-900">
          Created: {pool.createdAt.toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params || !params.id || typeof params.id !== "string") {
    return {
      notFound: true,
    };
  }

  const pool = await prisma.highlightPool.findUnique({
    where: {
      id: params.id,
    },
    include: {
      _count: {
        select: {
          highlights: true,
          followers: true,
        },
      },
    },
  });

  if (!pool) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      pool: pool,
    },
  };
};

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

export default PoolView;
