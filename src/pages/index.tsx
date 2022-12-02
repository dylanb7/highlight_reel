import { type NextPage } from "next";

import { trpc } from "../utils/trpc";
import { LoadingSpinner } from "../components/loading";
import NavBar from "../components/layout/navbar";
import { PoolComponent } from "../components/highlight-pool";

const HomePage: NextPage = () => {
  const loadAmount = 1;

  const { data, hasNextPage, fetchNextPage, isLoading } =
    trpc.pool.getPublicPoolsPaginated.useInfiniteQuery(
      {
        amount: loadAmount,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  if (isLoading) return <LoadingSpinner loadingType={"Loading Reels"} />;

  const pools = data?.pages.flatMap((page) => page.pools) ?? [];

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-12 px-4 py-16">
        <p className="text-4xl font-bold text-slate-900">
          {pools.length == 0 ? "No Pools" : "Public Pools"}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          {pools.map((value) => (
            <PoolComponent key={value.id} pool={value} />
          ))}
        </div>
        {hasNextPage && (
          <button
            className="rounded-full bg-indigo-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-indigo-700"
            onClick={() => fetchNextPage()}
            disabled={isLoading || data === null}
          >
            Load More
          </button>
        )}
      </div>
    </>
  );
};

export default HomePage;
