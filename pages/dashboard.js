import { useEffect } from "react";
import { useRouter } from "next/router";
import { roleRedirect } from "../lib/roleRedirect";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "same-origin",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const user = await res.json();
        const redirectPath = roleRedirect(user.role);
        router.replace(redirectPath);
      } catch (err) {
        console.error("Dashboard redirect error:", err);
        router.replace("/login");
      }
    }

    redirect();
  }, [router]);

  return (
    <div className="p-6">
      <div>Redirecting...</div>
    </div>
  );
}

