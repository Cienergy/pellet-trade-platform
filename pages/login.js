import { useState } from "react";
import { useRouter } from "next/router";

export default function LoginPage({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();

  async function login(e) {
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

    // redirect handled centrally in _app.js
  }

  return (
    <div className="p-6 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Login</h1>

      {error && <div className="text-red-600">{error}</div>}

      <form onSubmit={login} className="space-y-3">
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
