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

export const Spinner = () => {
  return (
      <div className="flex items-center justify-center p-4 ">
          <svg className="h-8 w-8 animate-spin-fast">
              <circle
                  cx={16}
                  cy={16}
                  fill="none"
                  r={14}
                  strokeWidth={4}
                  style={{ stroke: "rgb(29, 161, 242)", opacity: "0.2" }} />
              <circle
                  cx={16}
                  cy={16}
                  fill="none"
                  r={14}
                  strokeWidth={4}
                  style={{
                      stroke: "rgb(29, 161, 242)",
                      strokeDasharray: 80,
                      strokeDashoffset: 60,
                  }} />
          </svg>
      </div>
  );
}
