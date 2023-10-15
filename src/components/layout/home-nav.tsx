import { cn } from "@/cnutils";
import { PersonIcon } from "@radix-ui/react-icons";
import { CameraIcon } from "lucide-react";
import Link from "next/link";
import { type PropsWithChildren } from "react";

export type SelectedTab = "discover" | "profile";

export const HomeTabs: React.FC<{
  selected: SelectedTab;
}> = ({ selected }) => {
  cn();
  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t bg-white text-center text-xs shadow-lg dark:border-white dark:bg-slate-950">
      <div className="inline-flex h-16 w-full items-center justify-around rounded-md p-1  text-slate-500  dark:text-slate-400">
        <TabWrap tab={"discover"} isActive={selected === "discover"}>
          <CameraIcon className="h-6 w-6" />
          <span>Discover</span>
        </TabWrap>
        <TabWrap tab={"profile"} isActive={selected === "profile"}>
          <PersonIcon className="h-6 w-6" />
          <span>Profile</span>
        </TabWrap>
      </div>
    </footer>
  );
};

const TabWrap: React.FC<
  PropsWithChildren<{ tab: SelectedTab; isActive: boolean }>
> = ({ tab, isActive, children }) => {
  if (isActive)
    return (
      <div
        className={
          baseStyle +
          " rounded-md border-2 border-slate-950 text-slate-950 shadow-sm dark:border dark:border-white dark:text-slate-50"
        }
      >
        {children}
      </div>
    );
  return (
    <Link href={tab === "discover" ? "/" : "/profile"} className={baseStyle}>
      {children}
    </Link>
  );
};

const baseStyle =
  "inline-flex flex-col items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50  dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300";
