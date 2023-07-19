import { appRouter } from "../server/trpc/router/_app";
import { createServerSideHelpers } from "@trpc/react-query/server";
import superjson from "superjson";
import { createContextInner } from "../server/trpc/context";
import { getAuth } from "@clerk/nextjs/dist/types/server";
import { type NextRequest } from "next/server";
import { type GetServerSidePropsContext } from "next";

export const getServerHelpers = (
  req: NextRequest | GetServerSidePropsContext["req"] | null
) => {
  if (!req) {
    return createServerSideHelpers({
      router: appRouter,
      ctx: createContextInner({ req, auth: null }),
      transformer: superjson,
    });
  }
  const auth = getAuth(req);

  return createServerSideHelpers({
    router: appRouter,
    ctx: createContextInner({ req, auth }),
    transformer: superjson,
  });
};
