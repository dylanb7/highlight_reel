import { appRouter } from "../server/trpc/router/_app";
import { createServerSideHelpers } from "@trpc/react-query/server";
import superjson from "superjson";
import { CreateContextOptions, createContext, createContextInner } from "../server/trpc/context";
import { RequestLike } from "@clerk/nextjs/dist/types/server/types";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getAuth } from "@clerk/nextjs/dist/types/server";
import { NextRequest } from "next/server";
import { GetServerSidePropsContext } from "next";

export const getServerHelpers = async (req: NextRequest | GetServerSidePropsContext["req"] | null) => {
  if(!req) {
    return createServerSideHelpers({
      router: appRouter,
      ctx: await createContextInner({req, auth: null}),
      transformer: superjson
    });
  }
  const auth = getAuth(req);

  return createServerSideHelpers({
    router: appRouter,
    ctx: await createContextInner({req, auth}),
    transformer: superjson
  });
 }
