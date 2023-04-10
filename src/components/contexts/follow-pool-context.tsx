import { useSession } from "next-auth/react";
import { createContext, useContext, useMemo } from "react";
import type { PoolInfo } from "../../types/pool-out";
import type { ProfileInfo } from "../../types/user-out";
import { api } from "../../utils/trpc";
import type { ButtonContext } from "./button-types";
import { unauthedContext } from "./button-types";

const PoolContext = createContext<ButtonContext>(unauthedContext);

export const PoolButtonProvider: React.FC<
  React.PropsWithChildren<{ value: ButtonContext }>
> = ({ value, children }) => {
  return <PoolContext.Provider value={value}>{children}</PoolContext.Provider>;
};

type PoolLocation = "pools" | "modPools" | "ownedPools";

const toMap = (pools: PoolInfo[] | undefined) => {
  const map: Map<string, PoolInfo> = new Map();
  if (!pools) return map;
  for (const pool of pools) {
    map.set(pool.id, pool);
  }
  return map;
};

export const ProfilePoolButtonProvider: React.FC<
  React.PropsWithChildren<{
    userId: string;
    profile?: ProfileInfo;
  }>
> = ({ userId, profile, children }) => {
  const { data: session } = useSession();

  const util = api.useContext();

  const queryKey = userId;

  const following = useMemo(() => {
    return toMap(profile?.pools);
  }, [profile?.pools]);

  const mod = useMemo(() => {
    return toMap(profile?.modPools);
  }, [profile?.modPools]);

  const owned = useMemo(() => {
    return toMap(profile?.ownedPools);
  }, [profile?.ownedPools]);

  const fromId = (
    poolId: string
  ): { pool: PoolInfo; location: PoolLocation } | undefined => {
    const followed = following.get(poolId);
    if (followed) {
      return { pool: followed, location: "pools" };
    }
    const modded = mod.get(poolId);
    if (modded) {
      return { pool: modded, location: "modPools" };
    }
    const ownedPool = owned.get(poolId);
    if (ownedPool) {
      return { pool: ownedPool, location: "ownedPools" };
    }
    return undefined;
  };

  const { mutate: add, isLoading: adding } = api.user.addPool.useMutation({
    async onMutate(variables) {
      await util.user.profileQuery.cancel(queryKey);
      const prev = util.user.profileQuery.getData(queryKey);
      const info = fromId(variables.poolId);
      if (prev && info) {
        const toUpdate = prev[info.location];
        const index = toUpdate.findIndex((ele) => ele.id == info.pool.id);
        const val = toUpdate.at(index);
        if (val) {
          val.followInfo = {
            follows: info.pool.public,
            requested: !info.pool.public,
          };
        }
        const newObj = { ...prev };
        newObj[info.location] = toUpdate;
        util.user.profileQuery.setData(queryKey, newObj);
      }
      return { prev };
    },
    onError(_, __, context) {
      util.user.profileQuery.setData(queryKey, context?.prev);
    },
    onSettled() {
      util.user.profileQuery.invalidate();
    },
  });

  const { mutate: remove, isLoading: removing } =
    api.user.removePool.useMutation({
      async onMutate(variables) {
        await util.user.profileQuery.cancel(queryKey);
        const prev = util.user.profileQuery.getData(queryKey);
        const info = fromId(variables.poolId);
        if (prev && info) {
          const toUpdate = prev[info.location];
          const index = toUpdate.findIndex((ele) => ele.id == info.pool.id);
          const val = toUpdate.at(index);
          if (val) {
            val.followInfo = {
              follows: info.pool.public,
              requested: !info.pool.public,
            };
          }
          const newObj = { ...prev };
          newObj[info.location] = toUpdate;
          util.user.profileQuery.setData(queryKey, { ...newObj });
        }
        return { prev };
      },
      onError(_, __, context) {
        util.user.profileQuery.setData(queryKey, context?.prev);
      },
      onSettled() {
        util.user.profileQuery.invalidate(queryKey);
      },
    });

  const buttonContext: ButtonContext = {
    action: (id) => {
      const info = fromId(id)?.pool;
      if (!info || !session || !session.user) return;
      const requested = info.followInfo?.requested ?? false;
      if ((info.followInfo?.follows ?? false) || requested) {
        remove({
          poolId: id,
          requested: requested,
        });
      } else {
        add({
          poolId: id,
          isPublic: info.public,
        });
      }
    },
    state: (id) => {
      const info = fromId(id)?.pool;
      return {
        follows: info?.followInfo?.follows ?? false,
        pending: info?.followInfo?.requested ?? false,
        disabled: adding || removing,
      };
    },
  };

  return (
    <PoolButtonProvider value={buttonContext}> {children}</PoolButtonProvider>
  );
};

export const usePoolButtonContext = () => useContext(PoolContext);
