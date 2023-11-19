import { router } from "../trpc";
import { highlightRouter } from "./highlight";
import { poolRouter } from "./pool";
import { userRouter } from "./user";

export const appRouter = router({
  pool: poolRouter,
  user: userRouter,
  highlight: highlightRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
