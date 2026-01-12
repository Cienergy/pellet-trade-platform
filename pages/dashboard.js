import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    async function routeUser() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.replace("/login");
        return;
      }

      const user = await res.json();

      switch (user.role) {
        case "admin":
          router.replace("/admin/users");
          break;
        case "ops":
          router.replace("/ops/orders");
          break;
        case "finance":
          router.replace("/finance/invoices");
          break;
        case "buyer":
          router.replace("/orders");
          break;
        default:
          router.replace("/login");
      }
    }

    routeUser();
  }, [router]);

  return null; // no UI, instant redirect
}
