import NavBar from "./navbar";
import { Html, Head, Main, NextScript } from "next/document";

const PageWrap: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex h-full w-full flex-col gap-0">
      <NavBar />
      <div className="relative top-16">{children}</div>
    </div>
  );
};

export default PageWrap;
