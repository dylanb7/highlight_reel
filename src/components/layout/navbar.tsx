import React, { useState } from "react";
import Link from "next/link";
import SignInComponent from "../sign-in";
import PoolSearchComponent from "./pool-search-bar";

const MobileNav = ({ open }: { open: boolean }) => {
  return (
    <div
      className={`absolute top-0 left-0 z-10 h-screen w-screen transform bg-gray-200 dark:bg-slate-800 ${
        open ? "-translate-x-0" : "-translate-x-full"
      } drop-shadow-md filter transition-transform duration-300 ease-in-out`}
    >
      <div className="mt-4 ml-4 flex flex-col">
        <SignInComponent />
      </div>
    </div>
  );
};

export const NavBar = () => {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-gray-300 bg-white p-4 shadow-sm dark:bg-slate-900">
      <MobileNav open={open} />
      <Link href={"/"}>
        <p className="hidden justify-start text-2xl font-bold text-slate-900 dark:text-white sm:flex">
          Highlight<span className="text-indigo-500">Reel</span>
        </p>
      </Link>
      <Link href={"/"}>
        <p className="flex justify-start text-2xl font-bold text-slate-900 dark:text-white sm:hidden">
          H<span className="text-indigo-500">R</span>
        </p>
      </Link>
      <PoolSearchComponent />
      <div className="flex grow items-center justify-end">
        <div
          className="relative z-50 flex h-5 w-6 flex-col items-center justify-between md:hidden"
          onClick={() => {
            setOpen(!open);
          }}
        >
          {/* hamburger button */}
          <span
            className={`h-1 w-full transform rounded-lg bg-slate-900 transition duration-300 ease-in-out dark:bg-white ${
              open ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`h-1 w-full rounded-lg bg-slate-900 transition-all duration-300 ease-in-out dark:bg-white ${
              open ? "w-0" : "w-full"
            }`}
          />
          <span
            className={`h-1 w-full transform rounded-lg bg-slate-900 transition duration-300 ease-in-out dark:bg-white ${
              open ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </div>

        <div className="hidden justify-end md:flex">
          <SignInComponent />
        </div>
      </div>
    </nav>
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
