import { createContext, useContext } from "react";
import type { VideoActions } from "./action-types";

const FeedContext = createContext<VideoActions>({
  bookmark: function (): void {
    return;
  },
  like: function (): void {
    return;
  },
  disabled: true,
});

export const FeedContextProvider: React.FC<
  React.PropsWithChildren<{ value: VideoActions }>
> = ({ value, children }) => {
  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
};

export const useFeedContext = () => useContext(FeedContext);
