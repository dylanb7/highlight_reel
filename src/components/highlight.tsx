import { Highlight } from "@prisma/client";

export const HighlightView: React.FC<{
  highlight: Highlight & {
    _count: {
      upvotes: number;
    };
  };
}> = ({ highlight }) => {
  return <></>;
};
