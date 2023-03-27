import Image from "next/image";

import type { HighlightFetchInfo } from "../../types/highlight-out";
import { ActionRow } from "./action-row";

export type HighlightGroup = {
  highlights: HighlightFetchInfo[];
  header: string;
};

export type GroupingStrategy = (
  fetch: HighlightFetchInfo[]
) => HighlightGroup[];

const defaultGroup: GroupingStrategy = (highlights) => {
  return [{ highlights, header: "Highlights" }];
};

export const HighlightGridsComponent: React.FC<{
  highlights: HighlightFetchInfo[];
  grouping?: GroupingStrategy;
}> = ({ highlights, grouping }) => {
  const groupStrat = grouping ?? defaultGroup;

  const highlightGroups = groupStrat(highlights);

  return (
    <div className="flex flex-col">
      {highlightGroups.map((group) => (
        <HighlightGrid
          group={group}
          key={group.highlights.at(0)?.id ?? group.header}
        />
      ))}
    </div>
  );
};

const HighlightGrid: React.FC<{ group: HighlightGroup }> = ({ group }) => {
  return (
    <div className="ml-8 flex flex-col">
      <p className="my-3 text-2xl font-semibold text-slate-900 dark:text-white">
        {group.header}
      </p>
      <div className="container mx-auto grid max-w-4xl grid-cols-3 space-y-2 lg:gap-2 lg:space-y-0">
        {group.highlights.map((highlight) => (
          <div
            className="h-72 w-full overflow-clip rounded-sm border-gray-100 p-1 hover:shadow-lg dark:border-slate-800"
            key={highlight.id}
            onClick={() => {
              console.log(highlight.id);
            }}
          >
            {highlight.thumbnail ? (
              <Image
                placeholder="blur"
                src={highlight.thumbnail}
                alt={"Highlight"}
              >
                <ActionRow highlight={highlight} />
              </Image>
            ) : (
              <div className="flex animate-pulse flex-col">
                <div className="flex grow bg-gray-200 dark:bg-slate-900"></div>
                <ActionRow highlight={highlight} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
