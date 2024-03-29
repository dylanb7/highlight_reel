import { type AppType } from "next/app";

import { api } from "../utils/trpc";

import "../styles/globals.css";

import Head from "next/head";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "~/components/misc/theme-provider";
import { Toaster } from "@/shadcn/ui/sonner";
import { Analytics } from "@vercel/analytics/react";

const MyApp: AppType = ({ Component, pageProps: { ...pageProps } }) => {
  return (
    <>
      <ClerkProvider {...pageProps}>
        <Head>
          <title>Highlight Reel</title>
          <meta name="description" content="💭" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Component {...pageProps} />
          <Toaster />
        </ThemeProvider>
      </ClerkProvider>
      <Analytics />
    </>
  );
};

export default api.withTRPC(MyApp);
