type GlobalPageLoaderProps = {
  label?: string;
  variant?: "screen" | "section";
};

export function GlobalPageLoader({ label = "Loading", variant = "screen" }: GlobalPageLoaderProps) {
  return (
    <div
      className={`es-global-loader es-global-loader-${variant}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="es-windows-loader" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
