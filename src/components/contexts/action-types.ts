import type { InfiniteData } from "@tanstack/react-query";
import type { BaseHighlight } from "../../types/highlight-out";

export interface VideoActions {
  bookmark: (arg0: string) => void;
  like: (arg0: string) => void;
  disabled: boolean;
}

export interface BaseData<T extends BaseHighlight> {
  highlights: T[];
  nextCursor: string | undefined;
}

export const likeActionUpdate = <
  T extends BaseHighlight,
  J extends BaseData<T>
>(
  data: InfiniteData<J>,
  variables: {
    like?: boolean | null | undefined;
    highlightId: string;
  }
): J[] => {
  let updated = false;

  const { like, highlightId } = variables;

  const newPages = data.pages.reverse().map((page) => {
    if (updated) return page;
    for (let i = page.highlights.length - 1; i >= 0; i--) {
      if (updated) break;
      const found = page.highlights.at(i);
      if (found && found.id === highlightId) {
        if (!found) break;
        found.upvoted = like ?? false;
        updated = true;
        return page;
      }
    }
    return page;
  });

  return newPages;
};

export const bookmarkActionUpdate = <
  T extends BaseHighlight,
  J extends BaseData<T>
>(
  data: InfiniteData<J>,
  variables: {
    highlightId: string;
    add: boolean;
  }
): J[] => {
  let updated = false;

  const { add, highlightId } = variables;

  const newPages = data.pages.reverse().map((page) => {
    if (updated) return page;
    for (let i = page.highlights.length - 1; i >= 0; i--) {
      if (updated) break;
      const found = page.highlights.at(i);
      if (found && found.id === highlightId) {
        if (!found) break;
        found.bookmarked = add;
        updated = true;
        return page;
      }
    }
    return page;
  });

  return newPages;
};
