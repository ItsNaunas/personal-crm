interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="mb-4 text-4xl">⚠️</span>
      <h3 className="text-base font-semibold text-red-400">Something went wrong</h3>
      {message && (
        <p className="mt-1 text-sm text-gray-500 max-w-xs">{message}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
        >
          Try again
        </button>
      )}
    </div>
  );
}
