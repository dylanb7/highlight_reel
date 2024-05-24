import Link from "next/link";
import SignInComponent from "../misc/sign-in";

export const MainNav: React.FC = () => {
  return (
    <div className="mr-4 hidden items-center gap-4 md:flex">
      <Link href={"/"}>
        <p className="hidden justify-start text-2xl font-bold text-slate-900 dark:text-white sm:flex">
          Highlight<span className="text-indigo-500">Reel</span>
        </p>
      </Link>
      <nav className="flex items-center gap-4 text-sm lg:gap-6">
        <SignInComponent />
      </nav>
    </div>
  );
};
