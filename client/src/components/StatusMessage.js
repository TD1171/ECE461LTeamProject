// One way to show feedback after a user action or API call, so every page
// looks and behaves the same.
//
//   <StatusMessage type="error">{error}</StatusMessage>
//   <StatusMessage type="success">Created "Robot Arm".</StatusMessage>
//
// Errors use role="alert" so screen readers announce them right away;
// success messages use role="status", which is announced politely.
// Renders nothing when there is no message, so callers don't need
// `{error && ...}` guards.
const STYLES = {
  error: { className: "error-banner", role: "alert" },
  success: { className: "request-message", role: "status" },
};

function StatusMessage({ type = "error", children }) {
  if (children === null || children === undefined || children === false || children === "") {
    return null;
  }

  const { className, role } = STYLES[type] || STYLES.error;
  return (
    <p className={className} role={role}>
      {children}
    </p>
  );
}

export default StatusMessage;
