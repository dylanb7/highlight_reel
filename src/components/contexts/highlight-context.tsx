import { createContext, useContext } from "react";

export type HighlightContext = {
  playingId: string | undefined;
  playControl: (request: string, play: boolean) => void;
};

export const noPlay: HighlightContext = {
  playingId: undefined,
  playControl: () => {
    return;
  },
};

const PlayingHighlightContext = createContext<HighlightContext>(noPlay);

export const HighlightContextProvider: React.FC<
  React.PropsWithChildren<{ value: HighlightContext }>
> = ({ value, children }) => {
  return (
    <PlayingHighlightContext.Provider value={value}>
      {children}
    </PlayingHighlightContext.Provider>
  );
};

export const usePlayingHighlightContext = () =>
  useContext(PlayingHighlightContext);
