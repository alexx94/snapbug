type ToastProps = {
  success?: string;
  error?: string;
};

export function Toast({ success, error }: ToastProps) {
  const message = success || error;
  if (!message) return null;

  const variant = success ? "success" : "error";

  return (
    <div className={`toast toast-${variant}`} role="status" aria-live="polite">
      <span className="toast-icon">
        {variant === "success" ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )}
      </span>
      <span className="toast-message">{message}</span>
    </div>
  );
}
