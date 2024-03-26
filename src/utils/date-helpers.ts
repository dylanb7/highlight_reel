import dayjs from "dayjs";
import { useRouter } from "next/router";

export const parseFrom = (from: string | string[] | undefined) => {
  if (typeof from !== "string" || Number.isInteger(from)) return undefined;

  return Number(decodeURIComponent(from));
};

export const toUnix = (date: Date) => {
  return Math.floor(date.getTime() / 1000);
};

export const fromUnix = (time: number) => {
  return dayjs.unix(time).toDate();
};
