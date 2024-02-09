import { Button } from "@/shadcn/ui/button";
import { SignedIn, SignedOut, UserButton, useClerk } from "@clerk/nextjs";

const SignInComponent: React.FC<{ isHead?: boolean }> = () => {
  const { openSignIn } = useClerk();

  return (
    <>
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <Button className="bg-indigo-500" onClick={() => openSignIn()}>
          Sign in
        </Button>
      </SignedOut>
    </>
    /*<button
      className={
        "rounded-lg bg-indigo-500 text-sm font-semibold text-white no-underline transition hover:bg-indigo-700 " +
        (isHead ?? true ? "w-32 py-2" : "px-2 py-1")
      }
      onClick={sessionData ? () => signOut() : () => signIn()}
    >
      {sessionData ? "Sign out" : "Sign in"}
    </button>*/
  );
};

export default SignInComponent;
