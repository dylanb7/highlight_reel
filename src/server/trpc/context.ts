import { type CreateNextContextOptions } from "@trpc/server/adapters/next";

import { getAuth } from "@clerk/nextjs/server";
import type {
  SignedInAuthObject,
  SignedOutAuthObject,
} from "@clerk/nextjs/server";
import { db } from "../db";
import type { NextRequest } from "next/server";
import type { GetServerSidePropsContext } from "next";

export interface CreateContextOptions {
  auth: SignedInAuthObject | SignedOutAuthObject | null;
  req: NextRequest | GetServerSidePropsContext["req"] | null;
}

export const createContextInner = (opts: CreateContextOptions) => {
  return {
    auth: opts.auth,
    req: opts.req,
    db,
  };
};

export const createContext = (opts: CreateNextContextOptions) => {
  const { req } = opts;

  const auth = getAuth(req);

  return createContextInner({
    auth,
    req,
  });
};

export type Context = Awaited<ReturnType<typeof createContext>>;
