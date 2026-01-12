import "../styles/globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(undefined); // 👈 IMPORTANT
  const router = useRouter();

  // Load session ONCE
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(res => (res.ok ? res.json() : null))
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  // ⛔ DO NOT redirect until user is resolved
  if (user === undefined) {
    return <div className="p-6">Loading…</div>;
  }

  // ---------- ROUTE RULES ----------

  // Not logged in → only login allowed
  if (!user && router.pathname !== "/login") {
    if (typeof window !== "undefined") {
      router.replace("/login");
    }
    return null;
  }

  // Logged in → block login page
  if (user && router.pathname === "/login") {
    redirectByRole(user.role, router);
    return null;
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
    router.replace("/dashboard"); // admin / ops / finance
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
