import "../styles/globals.css";
import ToastContainer from "../components/Toast";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <ToastContainer />
    </>
  );
}
