import { useEffect, useState } from "react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ops");
  const [orgId, setOrgId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function loadUsers() {
    const res = await fetch("/api/admin/users", {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser() {
    setMsg("Creating...");
    const res = await fetch("/api/admin/users/create", {
      method: "POST",
      credentials: "include",
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
      loadUsers(); // refresh list
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-semibold">Admin · Users</h1>

      {/* Create User */}
      <div className="grid grid-cols-4 gap-3">
        <input
          className="border p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select
          className="border p-2"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="ops">Ops</option>
          <option value="finance">Finance</option>
          <option value="buyer">Buyer</option>
          <option value="admin">Admin</option>
        </select>

        <input
          className="border p-2"
          placeholder="Organization ID"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
        />

        <input
          className="border p-2"
          type="password"
          placeholder="Temporary Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={createUser}
          className="col-span-4 bg-black text-white py-2 rounded"
        >
          Create User
        </button>

        {msg && <div className="col-span-4 text-sm">{msg}</div>}
      </div>

      {/* Users List */}
      <table className="w-full border mt-6">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Org ID</th>
            <th className="p-2 border">Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="p-2 border">{u.email}</td>
              <td className="p-2 border">{u.role}</td>
              <td className="p-2 border">{u.orgId}</td>
              <td className="p-2 border">
                {new Date(u.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan="4" className="p-4 text-center text-gray-500">
                No users found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
