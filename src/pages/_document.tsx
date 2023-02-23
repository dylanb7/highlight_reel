import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en-us" className="h-full">
      <Head />
      <body className="bg-white antialiased dark:bg-slate-800">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
