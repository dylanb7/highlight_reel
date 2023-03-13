export const LoadingSpinner: React.FC<{
  loadingType: string | null;
}> = ({ loadingType }) => {
  return (
    <div className="m-5 flex h-full w-full flex-col items-center justify-center gap-4">
      {loadingType && (
        <p className="font-semibold text-slate-900 dark:text-white">
          {loadingType}
        </p>
      )}
      <span className="block h-8 w-8 animate-spin rounded-full border-4 border-x-indigo-300 border-b-indigo-300 border-t-slate-900 dark:border-x-white dark:border-t-indigo-400 dark:border-b-white"></span>
    </div>
  );
};
