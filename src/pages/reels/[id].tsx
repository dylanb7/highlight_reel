import type { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import SignInComponent from "../../components/sign-in";
import { api } from "../../utils/trpc";
import { LoadingSpinner } from "../../components/loading";
import {
  PoolData,
  PoolMessageCard,
} from "../../components/highlight-pool-card";
import { HighlightView } from "../../components/highlight";

import { PoolButtonProvider } from "../../components/contexts/follow-pool-context";
import type { ButtonContext } from "../../components/contexts/button-types";
import type { HighlightContext } from "../../components/contexts/highlight-context";
import { HighlightContextProvider } from "../../components/contexts/highlight-context";
import type { HighlightFetchInfo } from "../../types/highlight-out";
import { generateSSGHelper } from "../../utils/ssgHelper";
import { getServerAuthSession } from "../../server/common/get-server-auth-session";

const PoolView: React.FC<{ poolId: string }> = ({ poolId }) => {
  const { data: session } = useSession();

  const util = api.useContext();

  const queryKey = {
    poolId: poolId,
    userId: session?.user?.id,
  };

  const { data: poolInfo, isLoading } = api.pool.getPoolById.useQuery(queryKey);

  const { mutate: add, isLoading: adding } = api.user.addPool.useMutation({
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
    api.user.removePool.useMutation({
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
      <div className="m-4 flex w-full flex-col items-center justify-center">
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
            <LoadFeed
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

const LoadFeed: React.FC<{
  userId: string | undefined;
  poolId: string;
  isPublic: boolean;
}> = ({ userId, poolId, isPublic }) => {
  const loadAmount = 2;

  const { data, isLoading, hasNextPage, fetchNextPage } =
    api.pool.getPoolHighlightsPaginated.useInfiniteQuery(
      {
        amount: loadAmount,
        userId: userId,
        poolId: poolId,
        isPublic: isPublic,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  if (isLoading) return <LoadingSpinner loadingType={"Loading Highlights"} />;

  const highlights = data?.pages.flatMap((page) => page.highlights) ?? [];

  return (
    <>
      <HighlightFeed
        highlights={highlights}
        newPage={data?.pages[-1]?.highlights[0] ?? undefined}
      />
      {hasNextPage && (
        <div className="mt-4 flex items-center justify-center">
          <button
            className="mb-4 w-fit rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
            onClick={() => fetchNextPage()}
            disabled={isLoading || data === null}
          >
            Load More
          </button>
        </div>
      )}
    </>
  );
};

const HighlightFeed: React.FC<{
  highlights: HighlightFetchInfo[];
  newPage: HighlightFetchInfo | undefined;
}> = ({ highlights, newPage }) => {
  const [playing, setPlaying] = useState(newPage?.id);

  const makeRequest = (id: string, playing: boolean) => {
    if (!playing) setPlaying(undefined);
    else setPlaying(id);
  };

  const highlightContext: HighlightContext = {
    playingId: playing,
    playControl: makeRequest,
  };

  return (
    <HighlightContextProvider value={highlightContext}>
      {highlights?.map((highlight) => (
        <HighlightView highlight={highlight} key={highlight.id} />
      ))}
    </HighlightContextProvider>
  );
};

export const getServerSideProps: GetServerSideProps<{
  poolId: string;
}> = async (props) => {
  const { params } = props;
  if (!params || !params.id || typeof params.id !== "string") {
    return {
      notFound: true,
    };
  }

  const poolId = params.id;

  const ssg = generateSSGHelper();

  const session = await getServerAuthSession(props);

  await ssg.pool.getPoolById.prefetch({
    userId: session?.user?.id,
    poolId: poolId,
  });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      poolId,
    },
  };
};

export default PoolView;
