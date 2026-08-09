import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import PasswordResetPage from './components/PasswordResetPage.jsx'
import './index.css'

const Page = window.location.pathname === '/perfil' ? ProfilePage : window.location.pathname === '/recuperar-senha' ? PasswordResetPage : App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => console.error('[Offline] service worker:', error))
  })
}
