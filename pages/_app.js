import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check session on every app load
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(res => (res.ok ? res.json() : null))
      .then(data => setUser(data))
      .finally(() => setLoading(false));
  }, []);

  // ---------- ROUTE GUARDS ----------
  useEffect(() => {
    if (loading) return;

    // 🚫 Block /login if already logged in
    if (user && router.pathname === "/login") {
      redirectByRole(user.role, router);
    }

    // 🚫 Block protected pages if not logged in
    if (!user && router.pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, loading, router.pathname]);

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <Component {...pageProps} user={user} setUser={setUser} />
    </>
  );
}

// ---------- ROLE REDIRECT ----------
function redirectByRole(role, router) {
  if (role === "buyer") {
    router.replace("/orders");
  } else {
    router.replace("/ops/orders"); // ops + finance
  }
}

// ---------- NAVBAR ----------
function Navbar({ user, setUser }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    setUser(null);
    router.replace("/login");
  }

  return (
    <div className="flex justify-between items-center px-6 py-3 border-b">
      <div className="font-semibold">Pellet Platform</div>

      <div className="space-x-4">
        {!user && (
          <button onClick={() => router.push("/login")}>
            Login
          </button>
        )}

        {user && (
          <>
            <span className="text-sm text-gray-600">
              {user.role}
            </span>

            <button
              onClick={logout}
              className="px-3 py-1 bg-red-600 text-white rounded"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
