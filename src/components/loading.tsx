import clsx from "clsx";

export const LoadingSpinner: React.FC<{
  loadingType: string | null;
}> = ({ loadingType }) => {
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        {loadingType && (
          <p className="font-semibold text-slate-900 dark:text-white">
            {loadingType}
          </p>
        )}
        <svg className="h-12 w-12 animate-spin" viewBox="0 0 24 24"></svg>
      </div>
    </div>
  );
};
