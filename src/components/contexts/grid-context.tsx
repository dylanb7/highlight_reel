import { createContext, useContext } from "react";

export type GridActions = {
  basePath: string;
  fetchMore: () => void;
  hasMore: () => boolean;
  bookmark: (arg0: string) => void;
  like: (arg0: string) => void;
  disabled: boolean;
};

const noPlay: GridActions = {
  basePath: "",
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

const GridContext = createContext<GridActions>(noPlay);

export const GridContextProvider: React.FC<
  React.PropsWithChildren<{ value: GridActions }>
> = ({ value, children }) => {
  return <GridContext.Provider value={value}>{children}</GridContext.Provider>;
};

export const useGridContext = () => useContext(GridContext);
