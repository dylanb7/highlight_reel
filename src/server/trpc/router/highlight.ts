import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { viewedHighlightToUser } from "~/server/db/schema";

export const highlightRouter = router({
  logView: publicProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const uid = ctx.auth?.userId;
      if (!uid) return;

      return await ctx.db
        .insert(viewedHighlightToUser)
        .values({ userId: uid, highlightId: input });
    }),
});
