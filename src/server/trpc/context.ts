import { type inferAsyncReturnType } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getAuth } from "@clerk/nextjs/dist/types/server-helpers.server";
import type {
  SignedInAuthObject,
  SignedOutAuthObject,
} from "@clerk/nextjs/dist/types/server";
import { db } from "../db";
import type { NextRequest } from "next/server";
import type { GetServerSidePropsContext } from "next";

export interface CreateContextOptions {
  auth: SignedInAuthObject | SignedOutAuthObject | null;
  req: NextRequest | GetServerSidePropsContext["req"] | null;
}

/** Use this helper for:
 * - testing, so we dont have to mock Next.js' req/res
 * - trpc's `createSSGHelpers` where we don't have req/res
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 **/
export const createContextInner = (opts: CreateContextOptions) => {
  return {
    auth: opts.auth,
    req: opts.req,
    db,
  };
};

/**
 * This is the actual context you'll use in your router
 * @link https://trpc.io/docs/context
 **/
export const createContext = (opts: CreateNextContextOptions) => {
  const { req } = opts;

  const auth = getAuth(req);

  return createContextInner({
    auth,
    req,
  });
};

export type Context = inferAsyncReturnType<typeof createContext>;
