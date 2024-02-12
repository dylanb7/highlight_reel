import { createContext, useContext } from "react";
import { type BaseHighlight } from "~/server/types/highlight-out";

export type Share = (highlight: BaseHighlight) => string;

const ShareContext = createContext<Share>(() => "/");

export const ShareButtonProvider: React.FC<
  React.PropsWithChildren<{ value: Share }>
> = ({ value, children }) => {
  return (
    <ShareContext.Provider value={value}>{children}</ShareContext.Provider>
  );
};

export const useShareContext = () => useContext(ShareContext);
