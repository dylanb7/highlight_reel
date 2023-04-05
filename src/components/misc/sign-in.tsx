import { signIn, signOut, useSession } from "next-auth/react";

const SignInComponent: React.FC<{ isHead?: boolean }> = ({ isHead }) => {
  const { data: sessionData } = useSession();

  return (
    <button
      className={
        "rounded-lg bg-indigo-500 text-sm font-semibold text-white no-underline transition hover:bg-indigo-700 " +
        (isHead ?? true ? "w-32 py-2" : "px-2 py-1")
      }
      onClick={sessionData ? () => signOut() : () => signIn()}
    >
      {sessionData ? "Sign out" : "Sign in"}
    </button>
  );
};

export default SignInComponent;
