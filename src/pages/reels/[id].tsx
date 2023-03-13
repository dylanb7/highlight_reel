import type { HighlightPool } from "@prisma/client";
import type { GetStaticProps } from "next";
import { useSession } from "next-auth/react";
import React from "react";
import { prisma } from "../../server/db/client";
import SignInComponent from "../../components/sign-in";
import { trpc } from "../../utils/trpc";
import { LoadingSpinner } from "../../components/loading";
import {
  PoolData,
  PoolMessageCard,
} from "../../components/highlight-pool-card";
import { HighlightView } from "../../components/highlight";

import { PoolButtonProvider } from "../../components/contexts/follow-pool-context";
import type { ButtonContext } from "../../components/contexts/button-types";

const PoolView = (props: { pool: HighlightPool }) => {
  const { pool } = props;

  if (!pool) {
    return (
      <PoolMessageCard isCenter={true}>
        <p className="font-semibold text-slate-900 dark:text-white">
          The reel you are looking for is unavailible
        </p>
      </PoolMessageCard>
    );
  }

  return <PoolComponent poolId={pool.id} />;
};

const PoolComponent: React.FC<{ poolId: string }> = ({ poolId }) => {
  const { data: session } = useSession();

  const util = trpc.useContext();

  const queryKey = {
    poolId: poolId,
    userId: session?.user?.id,
  };

  const { data: poolInfo, isLoading } =
    trpc.pool.getPoolById.useQuery(queryKey);

  const { mutate: add, isLoading: adding } = trpc.user.addPool.useMutation({
    async onMutate() {
      await util.pool.getPoolById.cancel(queryKey);
      const prev = util.pool.getPoolById.getData(queryKey);
      if (prev) {
        util.pool.getPoolById.setData(queryKey, {
          ...prev,
          followInfo: {
            follows: prev.public,
            requested: !prev.public,
          },
        });
      }
      return { prev };
    },
    onError(_, __, context) {
      util.pool.getPoolById.setData(queryKey, context?.prev);
    },
    onSettled() {
      util.pool.getPoolById.invalidate();
    },
  });

  const { mutate: remove, isLoading: removing } =
    trpc.user.removePool.useMutation({
      async onMutate() {
        await util.pool.getPoolById.cancel(queryKey);
        const prev = util.pool.getPoolById.getData(queryKey);
        if (prev) {
          util.pool.getPoolById.setData(queryKey, {
            ...prev,
            followInfo: {
              follows: false,
              requested: false,
            },
          });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.pool.getPoolById.setData(queryKey, context?.prev);
      },
      onSettled() {
        util.pool.getPoolById.invalidate(queryKey);
      },
    });

  const followInfo = {
    follows: poolInfo?.followInfo?.follows ?? false,
    requested: poolInfo?.followInfo?.requested ?? false,
  };

  const hasSession = session && session.user;

  const hasHighlights = poolInfo && (poolInfo.public || followInfo.follows);

  const privateNoSession = poolInfo && !poolInfo.public && !hasSession;

  const privateNoFollow =
    poolInfo && !poolInfo.public && !followInfo.follows && hasSession;

  const buttonContext: ButtonContext = {
    action: () => {
      if (!session || !session.user || !poolInfo) return;
      if (followInfo.follows || followInfo.requested) {
        remove({
          poolId: poolId,
          userId: session.user.id,
          requested: poolInfo.followInfo?.requested ?? false,
        });
      } else {
        add({
          poolId: poolId,
          userId: session.user.id,
          isPublic: poolInfo.public,
        });
      }
    },
    state: () => {
      return {
        follows: followInfo.follows,
        pending: followInfo.requested,
        disabled: adding || removing,
      };
    },
  };

  return (
    <PoolButtonProvider value={buttonContext}>
      <div className="m-4 flex flex-col items-center justify-center">
        <PoolMessageCard isCenter={true}>
          {isLoading && <LoadingSpinner loadingType={"Loading Reel"} />}
          {poolInfo ? (
            <div className="flex flex-col">
              <PoolData pool={poolInfo} />
              {privateNoSession && (
                <>
                  <p className="mt-5 font-semibold text-slate-900 dark:text-white">
                    This{" "}
                    <span className="font-semibold text-indigo-500">Reel</span>{" "}
                    is private. Sign in to follow.
                  </p>
                  <div className="mt-2 flex items-center justify-center">
                    <SignInComponent />
                  </div>
                </>
              )}
              {privateNoFollow && (
                <p className="mt-5 text-center font-semibold text-slate-900 dark:text-white">
                  This{" "}
                  <span className="font-semibold text-indigo-500">Reel</span> is
                  private. You can request to follow it.
                </p>
              )}
            </div>
          ) : (
            !isLoading && (
              <p className="mt-5 font-semibold text-slate-900 dark:text-white">
                Unable to fetch reel
              </p>
            )
          )}
        </PoolMessageCard>
        {hasHighlights && (
          <div className="mt-4">
            <HighlightFeed
              userId={session?.user?.id}
              poolId={poolInfo.id}
              isPublic={poolInfo.public}
            />
          </div>
        )}
      </div>
    </PoolButtonProvider>
  );
};

const HighlightFeed: React.FC<{
  userId: string | undefined;
  poolId: string;
  isPublic: boolean;
}> = ({ userId, poolId, isPublic }) => {
  const loadAmount = 2;

  const { data, isLoading } =
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

  const highlights = data?.pages.flatMap((page) => page.lights) ?? [];

  return (
    <>
      <p></p>
      {highlights?.map((highlight) => (
        <HighlightView highlight={highlight} key={highlight.id} />
      ))}
    </>
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
