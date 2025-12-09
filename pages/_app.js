import '../styles/globals.css'
import Header from '../components/Header'
import Notifications from '../components/Notifications'

export default function App({ Component, pageProps }) {
  return (
    <div className="container">
      <Header />
      <Component {...pageProps} />
      <Notifications />
    </div>
  )
}
