import { useRouter } from "next/router";

export const useInitialDate = () => {
  const { query } = useRouter();

  const val = query.from;

  if (typeof val !== "string") return undefined;

  return Number(decodeURIComponent(val));
};

export const toUnix = (date: Date) => {
  return Math.floor(date.getTime() / 1000);
};
