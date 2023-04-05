import type { HighlightVideo } from "../../types/highlight-out";

export type FeedValues = {
  from?: string;
  initial?: number;
  current?: number;
  hasMore?: boolean;
  highlights: HighlightVideo[];
  disabled: boolean;
  fetchNext?: () => Promise<HighlightVideo>;
  fetching: boolean;
  hasPrev: () => boolean;
  hasNext: () => boolean;
  video: () => HighlightVideo | undefined;
  next: () => void;
  prev: () => void;
  bookmark: () => void;
  like: () => void;
};
