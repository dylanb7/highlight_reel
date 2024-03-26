import { initTRPC, TRPCError } from "@trpc/server";
import { transformer } from "../../utils/transformer";

import { type Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer,
});

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.auth?.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return next({
    ctx: {
      ...ctx,
      auth: ctx.auth,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
