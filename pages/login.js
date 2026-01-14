import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      setError(errorData.error || "Invalid credentials");
      return;
    }

    const userData = await res.json();
    
    // Redirect based on role
    const roleRedirects = {
      ADMIN: "/admin/dashboard",
      OPS: "/ops/dashboard",
      FINANCE: "/finance/dashboard",
      BUYER: "/buyer/dashboard",
    };
    
    const redirectPath = roleRedirects[userData.role] || "/dashboard";
    router.replace(redirectPath);
  }

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-4">Login</h1>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          className="border p-2 w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="border p-2 w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 w-full rounded hover:from-green-700 hover:to-emerald-700 transition">
          Login
        </button>
      </form>
    </div>
  );
}
