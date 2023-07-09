import { appRouter } from "../server/trpc/router/_app";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import superjson from "superjson";

export const generateSSGHelper = () =>
  createProxySSGHelpers({
    router: appRouter,
    ctx: { auth: null, db },
    transformer: superjson, // optional - adds superjson serialization
  });
