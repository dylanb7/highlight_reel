import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo } from "react";
import type { Url } from "url";
import { api } from "../../utils/trpc";

export const WristBands: React.FC<{ poolId: string }> = ({ poolId }) => {
  const { query } = useRouter();

  const { bandId } = query;

  const { data } = api.pool.getWristbands.useQuery(poolId);

  const cleaned: string[] = useMemo(
    () => (data?.filter((val) => val && val !== "undefined") ?? []) as string[],
    [data]
  );

  const hasValue = useMemo(
    () => typeof bandId === "string" && cleaned.includes(bandId),
    [bandId, cleaned]
  );

  if (!data || data.length == 0) return <></>;

  return (
    <div className="flex flex-col">
      <h3 className="pb-3 text-2xl font-semibold text-slate-900 dark:text-white">
        Wristband
      </h3>
      <div className="flex flex-row items-center justify-start gap-2 overflow-x-scroll pb-3">
        <WristbandChip
          link={`/reels/${poolId}`}
          active={!hasValue}
          name={"All"}
        />
        {cleaned.map((data) => (
          <WristbandChip
            link={`/reels/${poolId}/band/${data}`}
            active={hasValue ? data === bandId : false}
            name={data}
            key={data}
          />
        ))}
      </div>
    </div>
  );
};

const WristbandChip: React.FC<{
  link: Url | string;
  active: boolean;
  name: string;
}> = ({ link, active, name }) => {
  const inner = (
    <div
      className={
        "rounded-lg px-3 py-1 text-sm font-semibold no-underline shadow-sm transition " +
        (active
          ? "bg-indigo-500 text-white "
          : "bg-indigo-200 text-indigo-800 hover:bg-indigo-300 ") +
        "disabled:opacity-50"
      }
    >
      {name}
    </div>
  );
  if (active) return inner;
  return <Link href={link}>{inner}</Link>;
};
