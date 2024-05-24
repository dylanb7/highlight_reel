import { Button } from "@/shadcn/ui/button";
import { ScrollArea } from "@/shadcn/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/shadcn/ui/sheet";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import React from "react";
import { ModeToggle } from "../misc/dark-mode-toggle";
import SignInComponent from "../misc/sign-in";
import Link from "next/link";

export const MobileNav: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <HamburgerMenuIcon />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <ScrollArea className="my-4 h-[calc(100vh-8rem)] px-6 pb-10">
          <Link href={"/"}>
            <p className="flex justify-start text-2xl font-bold text-slate-900 dark:text-white sm:hidden">
              H<span className="text-indigo-500">R</span>
            </p>
          </Link>
          <div className="flex flex-col space-y-3 pt-4">
            <SignInComponent />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
