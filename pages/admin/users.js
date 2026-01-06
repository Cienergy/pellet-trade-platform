import { useState } from "react";

export default function AdminUsers() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ops");
  const [orgId, setOrgId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function createUser() {
    setMsg("Creating...");
    const res = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, orgId, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Error");
    } else {
      setMsg("User created successfully");
      setEmail("");
      setPassword("");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 space-y-4">
      <h1 className="text-xl font-semibold">Create User</h1>

      <input
        className="border p-2 w-full"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <select
        className="border p-2 w-full"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="ops">Ops</option>
        <option value="finance">Finance</option>
        <option value="buyer">Buyer</option>
        <option value="admin">Admin</option>
      </select>

      <input
        className="border p-2 w-full"
        placeholder="Organization ID"
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
      />

      <input
        className="border p-2 w-full"
        type="password"
        placeholder="Temporary Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={createUser}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Create User
      </button>

      {msg && <div className="text-sm">{msg}</div>}
    </div>
  );
}
