import { appRouter } from "../server/trpc/router/_app";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { createContextInner } from "../server/trpc/context";
import { getAuth } from "@clerk/nextjs/server";
import { type NextRequest } from "next/server";
import { type GetServerSidePropsContext } from "next";
import { transformer } from "./transformer";

export const getServerHelpers = (
  req: NextRequest | GetServerSidePropsContext["req"] | null
) => {
  if (!req) {
    return createServerSideHelpers({
      router: appRouter,
      ctx: createContextInner({ req, auth: null }),
      transformer,
    });
  }
  const auth = getAuth(req);

  return createServerSideHelpers({
    router: appRouter,
    ctx: createContextInner({ req, auth }),
    transformer,
  });
};
