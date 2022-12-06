import { signIn, signOut, useSession } from "next-auth/react";

const SignInComponent: React.FC = () => {
  const { data: sessionData } = useSession();

  return (
    <button
      className="w-32 rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white no-underline transition hover:bg-indigo-700"
      onClick={sessionData ? () => signOut() : () => signIn()}
    >
      {sessionData ? "Sign out" : "Sign in"}
    </button>
  );
};

export default SignInComponent;
