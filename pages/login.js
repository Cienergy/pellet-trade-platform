import { useEffect, useState } from "react";

export default function LoginPage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session on load
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(res => (res.ok ? res.json() : null))
      .then(data => setUser(data))
      .finally(() => setLoading(false));
  }, []);

  // ---- LOGIN ----
  async function handleLogin(e) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError("Invalid credentials");
      return;
    }

    const me = await fetch("/api/auth/me", {
      credentials: "include",
    }).then(r => r.json());

    setUser(me);
  }

  // ---- LOGOUT ----
  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    setUser(null);
    setEmail("");
    setPassword("");
  }

  // ---- UI ----
  if (loading) {
    return <div className="p-6">Loading…</div>;
  }

  // ✅ LOGGED IN VIEW
  if (user) {
    return (
      <div className="p-6 space-y-4">
        <div>
          Logged in as <b>{user.role}</b>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Logout
        </button>
      </div>
    );
  }

  // ❌ LOGGED OUT VIEW
  return (
    <div className="p-6 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Login</h1>

      {error && <div className="text-red-600">{error}</div>}

      <form onSubmit={handleLogin} className="space-y-3">
        <input
          className="border p-2 w-full"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded w-full"
        >
          Login
        </button>
      </form>
    </div>
  );
}
