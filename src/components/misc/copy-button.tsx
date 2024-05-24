import React from "react";
import { CheckIcon, ClipboardIcon } from "@radix-ui/react-icons";
import { Button } from "@/shadcn/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shadcn/ui/tooltip";
import { useToast } from "@/shadcn/ui/use-toast";
import { cn } from "@/cnutils";

export type variant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export const CopyButton: React.FC<{
  value: string;
  copyMessage: string;
  variant?: variant;
  className?: string;
}> = ({ value, className, variant = "ghost", copyMessage, ...props }) => {
  const { toast } = useToast();

  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  }, [hasCopied]);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setHasCopied(true);
    toast({ title: copyMessage });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant={variant}
            className={cn("[&_svg]:size-3 relative z-10 h-6  w-6", className)}
            onClick={() => {
              void copy();
            }}
            {...props}
          >
            <span className="sr-only">Copy</span>
            {hasCopied ? (
              <CheckIcon className="h-8 w-8" />
            ) : (
              <ClipboardIcon className="h-8 w-8" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy to clipboard</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
