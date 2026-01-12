import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const ROLES = ["admin", "ops", "finance", "buyer"];

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    email: "",
    role: "buyer",
    orgId: "",
    password: "",
  });
  const [error, setError] = useState("");

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      router.replace("/login");
      return;
    }
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to create user");
      return;
    }

    setForm({ email: "", role: "buyer", orgId: "", password: "" });
    loadUsers();
  }

  if (loading) return <div className="p-6">Loading users…</div>;

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-4">Admin · Users</h1>

      {/* Create User */}
      <form onSubmit={createUser} className="mb-6 grid grid-cols-4 gap-3">
        <input
          className="border p-2 rounded"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <select
          className="border p-2 rounded"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          className="border p-2 rounded"
          placeholder="Org ID"
          value={form.orgId}
          onChange={(e) => setForm({ ...form, orgId: e.target.value })}
        />
        <input
          className="border p-2 rounded"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button
          className="col-span-4 bg-black text-white py-2 rounded"
          type="submit"
        >
          Create User
        </button>
        {error && <div className="col-span-4 text-red-600">{error}</div>}
      </form>

      {/* Users Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Org</th>
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
        </tbody>
      </table>
    </div>
  );
}
