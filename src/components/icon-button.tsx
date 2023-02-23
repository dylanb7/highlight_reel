export const IconButton: React.FC<
  React.PropsWithChildren<{ onClick: () => void; disabled?: boolean }>
> = ({ children, onClick, disabled }) => {
  return (
    <button
      className="dark:active:bg-slate=700/30 flex items-center justify-center rounded-lg p-3 transition-all hover:bg-indigo-500/10 active:bg-indigo-500/30 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none dark:hover:bg-slate-700/10"
      data-ripple-dark="true"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export const twIcons =
  "w-4 h-4 text-slate-900 dark:text-white hover:text-slate-800 dark:hover:text-gray-100";
