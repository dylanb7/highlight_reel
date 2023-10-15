import { ScrollArea } from "@radix-ui/react-scroll-area";
import { NavBar } from "./navbar";
import { ScrollBar } from "@/shadcn/ui/scroll-area";

const PageWrap: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <main className="flex h-screen w-screen flex-col">
      <NavBar />

      <div className="relative mt-16 h-full w-full">
        <ScrollArea>
          {children}
          <ScrollBar />
        </ScrollArea>
      </div>
    </main>
  );
};

export default PageWrap;
