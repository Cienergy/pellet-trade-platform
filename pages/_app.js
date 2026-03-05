import "../styles/globals.css";
import ToastContainer from "../components/Toast";
import { useEffect } from "react";
import { useRouter } from "next/router";

function useSessionSlot() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const slot = router.query.slot;
    const n = slot ? parseInt(slot, 10) : null;
    if (n >= 1 && n <= 4) {
      sessionStorage.setItem("sessionSlot", String(n));
    } else if (!sessionStorage.getItem("sessionSlot")) {
      sessionStorage.setItem("sessionSlot", "1");
    }
  }, [router.query.slot]);
}

function patchFetch() {
  if (typeof window === "undefined") return;
  const orig = window.fetch;
  window.fetch = function (url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    const slot = sessionStorage.getItem("sessionSlot") || "1";
    const h = new Headers(opts.headers);
    h.set("X-Session-Slot", slot);
    opts.headers = h;
    return orig.call(this, url, opts);
  };
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  useSessionSlot();
  useEffect(() => {
    patchFetch();
  }, []);

  if (typeof window !== "undefined" && !window.__sessionFetchPatched) {
    window.__sessionFetchPatched = true;
    patchFetch();
  }

  return (
    <>
      <Component {...pageProps} />
      <ToastContainer />
    </>
  );
}
