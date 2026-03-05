import { useRouter } from "next/router";
import Link from "next/link";

/**
 * Tax & compliance reference page (placeholder).
 * GSTR-1, GSTR-3B deadlines and IRN/e-invoice info for policy reference.
 */
export default function FinanceCompliance() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tax & Compliance</h1>
              <p className="text-gray-600 text-sm mt-1">Reference: GST returns and e-invoice</p>
            </div>
            <Link
              href="/finance/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">GST return deadlines (reference)</div>
          <div className="p-4 space-y-4 text-sm text-gray-700">
            <div>
              <span className="font-medium text-gray-900">GSTR-1 (outward supplies):</span> Typically by 11th of the following month (monthly) or by 13th (quarterly for small taxpayers).
            </div>
            <div>
              <span className="font-medium text-gray-900">GSTR-3B (summary return):</span> Typically by 20th of the following month.
            </div>
            <p className="text-gray-500 text-xs pt-2">
              Confirm exact dates with your GST portal and CA. This page is for internal reference only.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">E-invoice (IRN)</div>
          <div className="p-4 space-y-2 text-sm text-gray-700">
            <p>
              Invoices can optionally store an <strong>IRN</strong> (Invoice Reference Number) once generated via the e-invoice portal (e.g. NIC). IRN and IRN date are shown on the invoice PDF when set.
            </p>
            <p className="text-gray-500 text-xs">
              IRN generation and sync are done outside this platform (e.g. via ERP or e-invoice API). This app only stores the placeholder for display.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
