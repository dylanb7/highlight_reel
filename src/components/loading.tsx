import clsx from "clsx";

export const LoadingSpinner: React.FC<{
  className?: string;
  loadingType: string | null;
}> = ({ className, loadingType }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {loadingType && (
        <p className="font-semibold text-slate-900">{loadingType}</p>
      )}
      <div className="flex items-center justify-center">
        <div
          className="spinner-grow inline-block h-12 w-12 rounded-full bg-current opacity-0"
          role="status"
        >
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  );
};
