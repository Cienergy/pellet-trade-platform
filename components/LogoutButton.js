/**
 * Client-side logout so X-Session-Slot is sent (via patched fetch in _app).
 * Use instead of form POST to support multi-session slots.
 */
export default function LogoutButton({ className = "", children = "Logout" }) {
  async function handleLogout(e) {
    e.preventDefault();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    window.location.href = "/login";
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {children}
    </button>
  );
}
