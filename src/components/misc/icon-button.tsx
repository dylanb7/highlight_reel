export const IconButton: React.FC<
  React.PropsWithChildren<{
    onClick: () => void;
    disabled?: boolean;
    pad?: number;
  }>
> = ({ children, onClick, disabled }) => {
  return (
    <button
      className="flex items-center justify-center rounded-lg transition-all hover:bg-indigo-500/10 active:bg-indigo-500/30 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:hover:bg-slate-700/10 dark:active:bg-slate-700/30"
      data-ripple-dark="true"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export const twIcons = (size = 4, m = 3) =>
  "text-white hover:text-slate-800 dark:hover:text-gray-100" +
  ` w-${size} h-${size} m-${m}`;
