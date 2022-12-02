import { router } from "../trpc";
import { authRouter } from "./auth";
import { exampleRouter } from "./example";
import { profileRouter } from "./profile";
import { poolRouter } from "./pool";
import { userRouter } from "./user";

export const appRouter = router({
  example: exampleRouter,
  auth: authRouter,
  profile: profileRouter,
  pool: poolRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
