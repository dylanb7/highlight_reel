import { createContext, useContext } from "react";
import type { VideoActions } from "./action-types";
import { type HighlightVideo } from "~/types/highlight-out";

const FeedContext = createContext<VideoActions<HighlightVideo>>({
  bookmark: function (): void {
    return;
  },
  like: function (): void {
    return;
  },
  disabled: true,
});

export const FeedContextProvider: React.FC<
  React.PropsWithChildren<{ value: VideoActions<HighlightVideo> }>
> = ({ value, children }) => {
  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
};

export const useFeedContext = () => useContext(FeedContext);
