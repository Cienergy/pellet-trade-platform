import '../styles/globals.css'
import Header from '../components/Header'

export default function App({ Component, pageProps }) {
  return (
    <div className="container">
      <Header />
      <Component {...pageProps} />
    </div>
  )
}
