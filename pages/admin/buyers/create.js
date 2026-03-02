import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Create buyer flow lives on /admin/buyers (inline form).
 * This route redirects there.
 */
export default function AdminBuyersCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/buyers");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Redirecting to Buyers...</p>
    </div>
  );
}
