import { createContext, useContext } from "react";
import type { VideoActions } from "./action-types";
import { type HighlightThumbnail } from "~/server/types/highlight-out";
import { type UrlObject } from "url";

export type HighlightGridActions = {
  basePath: UrlObject;
  fetchMore: () => void;
  hasMore: () => boolean;
} & VideoActions<HighlightThumbnail>;

const noPlay: HighlightGridActions = {
  basePath: {},
  fetchMore() {
    return;
  },
  hasMore() {
    return false;
  },
  like() {
    return;
  },
  bookmark() {
    return;
  },
  disabled: true,
};

const HighlightGridContext = createContext<HighlightGridActions>(noPlay);

export const HighlightGridContextProvider: React.FC<
  React.PropsWithChildren<{ value: HighlightGridActions }>
> = ({ value, children }) => {
  return (
    <HighlightGridContext.Provider value={value}>
      {children}
    </HighlightGridContext.Provider>
  );
};

export const useGridContext = () => useContext(HighlightGridContext);
