import React, { useState } from "react";
import Link from "next/link";
import SignInComponent from "../misc/sign-in";
import PoolSearchComponent from "./pool-search-bar";
import { ModeToggle } from "../misc/dark-mode-toggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shadcn/ui/sheet";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";

const MobileNav = ({ open }: { open: boolean }) => {
  return (
    <div
      className={`absolute left-0 top-0 z-10 h-screen w-screen transform bg-gray-200 dark:bg-slate-800 ${
        open ? "-translate-x-0" : "-translate-x-full"
      } drop-shadow-md filter transition-transform duration-300 ease-in-out`}
    >
      <div className="relative mx-4 mt-4 flex flex-col gap-3">
        <SignInComponent />
        <ModeToggle />
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
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger>
              <HamburgerMenuIcon className="h-8 w-8" />
            </SheetTrigger>
            <SheetContent side={"right"}>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="z-50 flex flex-wrap items-center justify-start gap-2 pt-2">
                <ModeToggle />
                <SignInComponent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden justify-end md:flex md:flex-row md:items-center md:gap-3">
          <ModeToggle />
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
