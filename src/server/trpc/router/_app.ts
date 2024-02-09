import { router } from "../trpc";
import { highlightRouter } from "./highlight";
import { reelRouter } from "./reel";
import { userRouter } from "./user";

export const appRouter = router({
  reel: reelRouter,
  user: userRouter,
  highlight: highlightRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
