import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import type { Url } from "url";
import { api } from "../../utils/trpc";

import { cn } from "@/cnutils";
import { Button } from "@/shadcn/ui/button";
import { Calendar } from "@/shadcn/ui/calendar";
import dayjs from "dayjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/ui/select";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogTrigger } from "@/shadcn/ui/dialog";

export const useInitialDate = () => {
  const { query } = useRouter();

  const val = query.from;

  if (typeof val !== "string") return undefined;

  return Number(decodeURIComponent(val));
};

export const DateFilter: React.FC = () => {
  const end = useMemo(() => getEnd(), []);

  const [startDate, setStartDate] = useState<Date>(end);

  const { push, query } = useRouter();

  useEffect(() => {
    const isNew =
      !query.from ||
      (typeof query.from === "string" &&
        toUnix(startDate) !== Number(decodeURIComponent(query.from)));
    if (startDate !== end && isNew) {
      void push({
        query: { ...query, from: encodeURIComponent(toUnix(startDate)) },
      });
    }
  }, [end, push, query, startDate]);

  const onSelect = (value: Date) => {
    setStartDate(dayjs(value).endOf("day").toDate());
  };

  return (
    <div className="flex flex-col items-start justify-start pb-3">
      <h3 className="pb-3 text-2xl font-semibold text-slate-900 dark:text-white">
        From
      </h3>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal dark:hover:border dark:hover:border-white dark:hover:bg-slate-950 ",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? (
              dayjs(startDate).format("MMM DD, YYYY")
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="flex w-auto flex-col space-y-2 p-2">
          <Select
            onValueChange={(value) =>
              onSelect(dayjs().subtract(parseInt(value), "day").toDate())
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="1">Yesterday</SelectItem>
              <SelectItem value="3">3 days ago</SelectItem>
              <SelectItem value="7">Last week</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-md border">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(val) => {
                if (val) setStartDate(val);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const WristBands: React.FC<{ poolId: number }> = ({ poolId }) => {
  const { query } = useRouter();

  const { bandId } = query;

  const { data } = api.pool.getWristbands.useQuery(poolId);

  const cleaned: string[] = useMemo(
    () => data?.filter((val) => val && val !== "undefined") ?? [],
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
export const Filters: React.FC<{ poolId: number }> = ({ poolId }) => {
  return (
    <div className="flex flex-col">
      <DateFilter />
      <WristBands poolId={poolId} />
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

const getEnd = () => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
};

const toUnix = (date: Date) => {
  return Math.floor(date.getTime() / 1000);
};
