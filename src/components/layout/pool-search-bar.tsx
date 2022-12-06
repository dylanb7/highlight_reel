"use client";

import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { usePopper } from "react-popper";
import { trpc } from "../../utils/trpc";
import { GoSearch } from "react-icons/go";
import { IoMdClose } from "react-icons/io";
import { LoadingSpinner } from "../loading";
import { HighlightPool, User } from "@prisma/client";
import Link from "next/link";

const FetchResults: React.FC<{ searchTerm: string; close: () => void }> = ({
  searchTerm,
  close,
}) => {
  const { data: session } = useSession();

  const { data: results, isLoading } = trpc.pool.poolSearch.useQuery({
    searchTerm: searchTerm,
    id: session?.user?.id,
  });

  return (
    <div className="z-50 flex h-full w-full max-w-lg flex-col justify-items-stretch rounded-lg bg-white p-2 shadow-lg">
      <header className="sticky top-0 mb-2 flex flex-row items-center justify-between">
        <p className="font-semibold text-slate-900 underline">Search Results</p>
        <button
          className="ml-32 rounded-lg bg-indigo-500 p-2 font-semibold text-white no-underline transition hover:bg-indigo-700"
          onClick={() => close()}
        >
          <IoMdClose size={20} />
        </button>
      </header>
      <main className="flex-1 overflow-y-scroll">
        {isLoading && <LoadingSpinner loadingType={"Searching..."} />}
        {results && results.length > 0 ? (
          <>
            {results.map((item) => (
              <PoolRow key={item.id} pool={item} close={close} />
            ))}
          </>
        ) : (
          <p className="font-semibold text-slate-900">No Reels match name</p>
        )}
      </main>
    </div>
  );
};

const PoolRow: React.FC<{
  pool: HighlightPool & {
    followers: User[];
  };
  close: () => void;
}> = ({ pool, close }) => {
  return (
    <Link href={"/pools/" + encodeURIComponent(pool.id)} onClick={close}>
      <div className="flex w-full flex-row items-center justify-between p-1 hover:bg-gray-100">
        <p className="font-semibold text-slate-900">{pool.name}</p>
        <div className="rounded-lg bg-slate-900 p-0.5 font-semibold text-white">
          {pool.followers.length > 0
            ? "Following"
            : pool.public
            ? "Public"
            : "Private"}
        </div>
      </div>
    </Link>
  );
};

const PoolSearchComponent: React.FC = () => {
  const buttonRef = useRef(null);

  const popperRef = useRef(null);

  const { styles, attributes } = usePopper(
    buttonRef.current,
    popperRef.current,
    {
      placement: "bottom-end",
      modifiers: [{ name: "offset", options: { offset: [0, 16] } }],
    }
  );

  const [search, setSearch] = useState("");

  const [searching, setSearching] = useState(false);

  return (
    <div className="mx-4 flex w-full max-w-sm flex-row justify-start gap-2 sm:mx-6 lg:mx-12">
      <input
        className="w-full appearance-none rounded-lg border-2 border-gray-200 bg-gray-200 p-2 leading-tight text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
        placeholder="Reel Name..."
        value={search}
        disabled={searching}
        onKeyDown={(e) => {
          if (e.key === "Enter" && search.length > 0) setSearching(true);
        }}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search.length > 0 && (
        <button
          className="aspect-square items-center justify-center rounded-lg bg-indigo-500 p-2 font-semibold text-white no-underline transition hover:bg-indigo-700 disabled:opacity-75"
          disabled={searching}
          onClick={() => setSearching(true)}
          ref={buttonRef}
        >
          <GoSearch size={20} />
        </button>
      )}

      <div ref={popperRef} style={styles.popper} {...attributes.popper}>
        {searching && (
          <FetchResults
            searchTerm={search}
            close={() => {
              setSearch("");
              setSearching(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PoolSearchComponent;
