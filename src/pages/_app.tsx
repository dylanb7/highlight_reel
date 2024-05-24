import { type AppType } from "next/app";

import { api } from "../utils/trpc";

import "../styles/globals.css";

import Head from "next/head";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "~/components/misc/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/shadcn/ui/sonner";

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
          <SpeedInsights />
        </ThemeProvider>
      </ClerkProvider>
      <Analytics />
    </>
  );
};

export default api.withTRPC(MyApp);
