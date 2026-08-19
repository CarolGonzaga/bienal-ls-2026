import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import PasswordResetPage from './components/PasswordResetPage.jsx'
import './index.css'

const routedPath = window.location.pathname.replace(/^\/mapasaficobienal/, '') || '/'
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard.jsx'))
const AuthorDashboard = lazy(() => import('./components/author/AuthorDashboard.jsx'))
const Page = routedPath === '/perfil' ? ProfilePage : routedPath === '/recuperar-senha' ? PasswordResetPage : routedPath === '/admin' ? AdminDashboard : routedPath === '/autora' ? AuthorDashboard : App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui' }}>Carregando...</div>}><Page /></Suspense>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/mapasaficobienal/sw.js', { scope: '/mapasaficobienal/' }).catch(error => console.error('[Offline] service worker:', error))
  })
}
