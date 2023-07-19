import { useAuth } from "@clerk/nextjs";
import { api } from "../../utils/trpc";
import type { ButtonContext } from "../contexts/button-types";

import { PoolMessageCard, PoolData } from "../highlight-pool-card";
import { LoadingSpinner } from "../misc/loading";
import SignInComponent from "../misc/sign-in";
import { PoolButtonProvider } from "../contexts/follow-pool-context";

export const PoolInfo: React.FC<{ poolId: number }> = ({ poolId }) => {
  const util = api.useContext();

  const { data: poolInfo, isLoading } = api.pool.getPoolById.useQuery(poolId);

  const { mutate: add, isLoading: adding } = api.user.addPool.useMutation({
    async onMutate() {
      await util.pool.getPoolById.cancel(poolId);
      const prev = util.pool.getPoolById.getData(poolId);
      if (prev) {
        util.pool.getPoolById.setData(poolId, {
          ...prev,
          followInfo: {
            follows: prev.isPublic,
            requested: !prev.isPublic,
          },
        });
      }
      return { prev };
    },
    onError(_, __, context) {
      util.pool.getPoolById.setData(poolId, context?.prev);
    },
    onSettled() {
      void util.pool.getPoolById.invalidate();
    },
  });

  const { mutate: remove, isLoading: removing } =
    api.user.removePool.useMutation({
      async onMutate() {
        await util.pool.getPoolById.cancel(poolId);
        const prev = util.pool.getPoolById.getData(poolId);
        if (prev) {
          util.pool.getPoolById.setData(poolId, {
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
        util.pool.getPoolById.setData(poolId, context?.prev);
      },
      onSettled() {
        void util.pool.getPoolById.invalidate(poolId);
      },
    });

  const followInfo = {
    follows: poolInfo?.followInfo?.follows ?? false,
    requested: poolInfo?.followInfo?.requested ?? false,
  };

  const auth = useAuth();

  const privateNoSession = poolInfo && !poolInfo.public && !auth.userId;

  const privateNoFollow =
    poolInfo && !poolInfo.public && !followInfo.follows && auth.userId;

  const buttonContext: ButtonContext = {
    action: () => {
      if (followInfo.follows || followInfo.requested) {
        remove({
          poolId: poolId,
          requested: poolInfo?.followInfo?.requested ?? false,
        });
      } else {
        add({
          poolId: poolId,
          isPublic: poolInfo?.isPublic ?? false,
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
      <PoolMessageCard>
        {isLoading && <LoadingSpinner loadingType={"Loading Reel"} />}
        {poolInfo ? (
          <div className="flex flex-col">
            <PoolData pool={poolInfo} />
            {privateNoSession && (
              <>
                <p className="mt-5 font-semibold text-slate-900 dark:text-white">
                  This{" "}
                  <span className="font-semibold text-indigo-500">Reel</span> is
                  private. Sign in to follow.
                </p>
                <div className="mt-2 flex items-center justify-center">
                  <SignInComponent />
                </div>
              </>
            )}
            {privateNoFollow && (
              <p className="mt-5 text-center font-semibold text-slate-900 dark:text-white">
                This <span className="font-semibold text-indigo-500">Reel</span>{" "}
                is private. You can request to follow it.
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
    </PoolButtonProvider>
  );
};
