import { HighlightPool } from "@prisma/client";
import { useSession } from "next-auth/react";
import { RouterOutputs, trpc } from "../utils/trpc";

export const PoolComponent: React.FC<{
  pool: HighlightPool & {
    _count: {
      highlights: number;
      followers: number;
    };
  };
}> = ({ pool }) => {
  const { data: sesh } = useSession();

  const { mutate: add } = trpc.profile.addPool.useMutation();

  return (
    <div className="ml-4 mr-4 flex w-96 flex-col gap-4 rounded-xl border p-4 shadow-md sm:w-full">
      <div className="flex flex-row justify-between">
        <span className="text-3xl font-bold text-slate-900">{pool.name}</span>
        <button className="rounded-xl bg-indigo-500 px-2 py-1 font-semibold text-white no-underline transition hover:bg-indigo-700">
          Follow
        </button>
      </div>
      <p className="justify-left font-semibold text-slate-900 ">
        Highlights:{" "}
        <span className="text-indigo-500">{pool._count.highlights}</span>
      </p>
      <p className="justify-left font-semibold text-slate-900 ">
        Followers:{" "}
        <span className="text-indigo-500">{pool._count.followers}</span>
      </p>
      {pool.public ? (
        <button className="justify-center rounded-xl bg-indigo-500 px-2 py-1 font-semibold text-white no-underline transition hover:bg-indigo-700">
          View Highlights
        </button>
      ) : (
        <p className="justify-left font-semibold text-slate-900">
          Must Follow Pool to View Highlights
        </p>
      )}
    </div>
  );
};
