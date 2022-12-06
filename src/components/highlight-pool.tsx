import { HighlightPool, User } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { trpc } from "../utils/trpc";

const Visual: React.FC<{
  pool: HighlightPool & {
    followers: User[];
    _count: {
      highlights: number;
      followers: number;
    };
  };
  follows: boolean;
  errMessage: string | null;
  onFollow: () => void;
}> = ({ pool, follows, errMessage, onFollow }) => {
  return (
    <div className="ml-4 mr-4 flex w-96 flex-col gap-4 rounded-xl border p-4 shadow-md sm:w-full">
      <div className="flex flex-row justify-between">
        <span className="text-3xl font-bold text-slate-900">{pool.name}</span>
        <button
          className="rounded-xl bg-indigo-500 px-2 py-1 font-semibold text-white no-underline transition hover:bg-indigo-700"
          onClick={() => onFollow()}
        >
          {follows ? "Unfollow" : "Follow"}
        </button>
      </div>
      {errMessage && (
        <p className="justify-left font-bold text-red-600">{errMessage}</p>
      )}
      <p className="justify-left font-semibold text-slate-900">
        Highlights:{" "}
        <span className="text-indigo-500">{pool._count.highlights}</span>
      </p>
      <p className="justify-left font-semibold text-slate-900">
        Followers:{" "}
        <span className="text-indigo-500">{pool._count.followers}</span>
      </p>

      <Link href={"/pools/" + encodeURIComponent(pool.id)}>
        <div className="justify-center rounded-xl bg-indigo-500 px-2 py-1 font-semibold text-white no-underline transition hover:bg-indigo-700">
          View Reel
        </div>
      </Link>
    </div>
  );
};

const AuthedComponent: React.FC<{
  pool: HighlightPool & {
    followers: User[];
    _count: {
      highlights: number;
      followers: number;
    };
  };
}> = ({ pool }) => {
  const { data: session } = useSession();
  const util = trpc.useContext();
  const { mutate: add } = trpc.user.addPool.useMutation({
    onSuccess: () => {
      util.pool.getPublicPoolsPaginated.invalidate();
      util.user.getAllPools.invalidate();
    },
  });
  const { mutate: remove } = trpc.user.removePool.useMutation({
    onSuccess: () => {
      util.pool.getPublicPoolsPaginated.invalidate();
      util.user.getAllPools.invalidate();
    },
  });
  const followAction = async () => {
    if (pool.followers.length > 0) {
      remove({
        poolId: pool.id,
        userId: session!.user!.id,
      });
    }
    add({
      poolId: pool.id,
      userId: session!.user!.id,
      public: pool.public,
    });
  };
  return (
    <Visual
      pool={pool}
      errMessage={""}
      follows={pool.followers.length > 0}
      onFollow={() => followAction()}
    />
  );
};

export const PoolComponent: React.FC<{
  pool: HighlightPool & {
    followers: User[];
    _count: {
      highlights: number;
      followers: number;
    };
  };
}> = ({ pool }) => {
  const { data: session } = useSession();

  const [follow, setFollow] = useState(false);

  if (session) {
    return <AuthedComponent pool={pool} />;
  }

  return (
    <Visual
      pool={pool}
      follows={false}
      errMessage={follow ? "Must Create Profile to Follow" : null}
      onFollow={() => setFollow(true)}
    />
  );
};
