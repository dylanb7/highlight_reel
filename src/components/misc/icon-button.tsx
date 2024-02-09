import { Button } from "@/shadcn/ui/button";

export const IconButton: React.FC<
  React.PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
    pad?: number;
  }>
> = ({ children, onClick, disabled }) => {
  return (
    <Button
      variant={"default"}
      size={"icon"}
      disabled={disabled}
      className="bg-transparent text-white hover:bg-foreground/40"
      onClick={onClick}
    >
      {children}
    </Button>
  );
};

export const twIcons = (size = 4, m = 3) => ` w-${size} h-${size} m-${m}`;
