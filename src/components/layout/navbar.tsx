import React from "react";
import ReelSearchComponent from "./reel-search-bar";
import { ModeToggle } from "../misc/dark-mode-toggle";
import { MobileNav } from "./mobile-nav";
import { MainNav } from "./main-nav";

export const NavBar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <MobileNav />
        <MainNav />
        <div className="flex flex-1 items-center justify-between space-x-4 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none md:pr-10">
            <ReelSearchComponent />
          </div>

          <div className="flex items-center pl-2">
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

/*
const NavLink = ({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) => {
  const router = useRouter();

  return (
    <a
      href={to}
      className={`relative px-4 transition duration-300 ease-in-out ${
        router.asPath === to
          ? "text-purple-500"
          : "stroke  hover:text-purple-300"
      }`}
    >
      {children}
    </a>
  );
};

export default NavBar;
*/
