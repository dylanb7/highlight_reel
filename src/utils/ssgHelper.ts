import { appRouter } from "../server/trpc/router/_app";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import superjson from "superjson";
import { prisma } from "../server/db/client";

export const generateSSGHelper = () =>
  createProxySSGHelpers({
    router: appRouter,
    ctx: { session: null, prisma },
    transformer: superjson, // optional - adds superjson serialization
  });
