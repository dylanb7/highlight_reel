import { router } from "../trpc";
import { poolRouter } from "./pool";
import { userRouter } from "./user";

export const appRouter = router({
  pool: poolRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
