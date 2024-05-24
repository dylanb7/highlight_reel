import { Button, buttonVariants } from "@/shadcn/ui/button";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Button
        size={"icon"}
        variant={"outline"}
        onClick={scrollToTop}
        className={`${isVisible ? "opacity-100" : "opacity-0"} rounded-full`}
      >
        <ArrowUp className="h-6 w-6" aria-hidden="true" />
      </Button>
    </div>
  );
};
