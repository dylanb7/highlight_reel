import { NavBar } from "./navbar";

const PageWrap: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <main className="flex h-screen w-screen flex-col">
      <NavBar />
      <div className="relative mt-16 grow">{children}</div>
    </main>
  );
};

export default PageWrap;
