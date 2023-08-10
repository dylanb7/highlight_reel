import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import type { Url } from "url";
import { api } from "../../utils/trpc";
import Datepicker, { type DateValueType } from "react-tailwindcss-datepicker";
import dayjs from "dayjs";

export const useInitialDate = () => {
    const { query } = useRouter();

    const val = query.from

    if (typeof val !== "string") return undefined;

    return Number(decodeURIComponent(val))

}

export const DateFilter: React.FC = () => {

    const end = useMemo(() => getEnd(), []);

    const [startDate, setStartDate] = useState<Date>(end);

    const { push, query } = useRouter();

    useEffect(() => {
        const isNew = !query.from || (typeof query.from === "string" && toUnix(startDate) !== Number(decodeURIComponent(query.from)))
        if (startDate !== end && isNew) {
            void push({ query: { ...query, from: encodeURIComponent(toUnix(startDate)) } })
        }
    }, [end, push, query, startDate])

    const onSelect = (value: DateValueType) => {
        const selected = value?.startDate;
        const date: Date = !selected ? new Date() : typeof selected !== "string" ? selected : new Date(selected)
        date.setHours(23, 59, 59, 999);
        setStartDate(date);
    }

    return <div className="flex flex-col items-start justify-start pb-3">
        <h3 className="pb-3 text-2xl font-semibold text-slate-900 dark:text-white">From</h3>
        <Datepicker
            primaryColor="indigo"
            inputClassName={(name) => name + " border"}
            displayFormat={"MMM DD, YYYY"}
            maxDate={end}
            minDate={undefined}
            showShortcuts
            asSingle
            value={{ startDate: startDate, endDate: startDate }}
            containerClassName={(name) => name + " z-40"}
            useRange={false}
            onChange={onSelect}
            configs={
                {
                    shortcuts: {
                        yesterday: {
                            text: "Yesterday",
                            period: {
                                start: dayjs().subtract(1, "d").format("YYYY-MM-DD"),
                                end: dayjs().subtract(1, "d").format("YYYY-MM-DD")
                            }
                        },
                        lastWeek: {
                            text: "Last week",
                            period: {
                                start: dayjs().subtract(7, "d").format("YYYY-MM-DD"),
                                end: dayjs().subtract(7, "d").format("YYYY-MM-DD")
                            }
                        },
                        lastMonth: {
                            text: "Last month",
                            period: {
                                start: dayjs().subtract(30, "d").format("YYYY-MM-DD"),
                                end: dayjs().subtract(30, "d").format("YYYY-MM-DD")
                            }
                        },
                    }
                }
            } />
    </div>
}

export const WristBands: React.FC<{ poolId: number }> = ({ poolId }) => {
    const { query } = useRouter();

    const { bandId } = query;

    const { data } = api.pool.getWristbands.useQuery(poolId);

    const cleaned: string[] = useMemo(
        () => (data?.filter((val) => val && val !== "undefined") ?? []),
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

    return <div className="flex flex-col">
        <WristBands poolId={poolId} />
        <DateFilter />
    </div>

}

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
    const end = new Date()
    end.setHours(23, 59, 59, 999);
    return end;
}

const toUnix = (date: Date) => {
    return Math.floor(
        date.getTime() / 1000)
} 
