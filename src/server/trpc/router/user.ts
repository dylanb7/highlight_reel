import { z } from "zod";

import { router, protectedProcedure } from "../trpc";

export const userRouter = router({
  userProfile: protectedProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.prisma.user.findUnique({
      where: { id: input },
      select: { profile: true },
    });
  }),
});
