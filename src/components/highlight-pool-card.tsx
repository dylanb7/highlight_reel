import { HighlightPool, User } from "@prisma/client";
import Link from "next/link";
import { PoolFollowButton } from "./follow-pool";

export const PoolComponent: React.FC<{
  pool: HighlightPool & {
    pending: User[];
    followers: User[];
    _count: {
      highlights: number;
      followers: number;
    };
  };
}> = ({ pool }) => {
  return (
    <div className="ml-4 mr-4 flex w-96 flex-col gap-4 rounded-xl border p-4 shadow-md sm:w-full">
      <div className="flex flex-row justify-between">
        <span className="text-3xl font-bold text-slate-900">{pool.name}</span>
        <PoolFollowButton
          pool={pool}
          followData={{
            pending: pool.pending.length > 0,
            following: pool.followers.length > 0,
          }}
        />
      </div>

      <p className="justify-left font-semibold text-slate-900">
        Highlights:{" "}
        <span className="text-indigo-500">{pool._count.highlights}</span>
      </p>
      <p className="justify-left font-semibold text-slate-900">
        Followers:{" "}
        <span className="text-indigo-500">{pool._count.followers}</span>
      </p>

      <Link href={"/reels/" + encodeURIComponent(pool.id)}>
        <div className="justify-center rounded-xl bg-indigo-500 px-2 py-1 font-semibold text-white no-underline transition hover:bg-indigo-700">
          View Reel
        </div>
      </Link>
    </div>
  );
};
