import React, { useEffect, useState } from 'react'
import {
  Calendar,
  Compass, 
  Award, 
  Bookmark, 
  Eye,
  LogOut,
  List,
  Route,
  SlidersHorizontal,
  CircleHelp,
  Plus,
  ShieldCheck
} from 'lucide-react'
import { useExhibitorStore } from './stores/useExhibitorStore'
import { useMapStore } from './stores/useMapStore'
import { useAdminMapStore } from './stores/useAdminMapStore'
import { useUserStore } from './stores/useUserStore'

import { BienalMap } from './components/map/BienalMap'
import { MapControls } from './components/map/MapControls'
import { ExhibitorList } from './components/exhibitors/ExhibitorList'
import { ExhibitorBottomSheet } from './components/exhibitors/ExhibitorBottomSheet'
import { SearchBar } from './components/search/SearchBar'
import { RoutePlanner } from './components/route/RoutePlanner'
import { AccessibilityPanel } from './components/accessibility/AccessibilityPanel'
import AuthModal from './components/AuthModal'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { appPath, BASE_PATH } from './lib/paths'
import { MapTutorial } from './components/tutorial/MapTutorial'
import { ContributionModal } from './components/contributions/ContributionModal'
import { flushQueuedContributions } from './lib/contributions'
import { useContentStore } from './stores/useContentStore'
import { ScheduleView } from './components/schedule/ScheduleView'

const TEMPORARILY_DISABLED_TABS = new Set(['passport'])

export default function App() {
  const activeTabMode = useExhibitorStore(s => s.activeTabMode)
  const setActiveTabMode = useExhibitorStore(s => s.setActiveTabMode)
  const selectedExhibitorId = useExhibitorStore(s => s.selectedExhibitorId)
  const setSelectedExhibitorId = useExhibitorStore(s => s.setSelectedExhibitorId)
  const exhibitors = useExhibitorStore(s => s.exhibitors)
  const loadExhibitors = useExhibitorStore(s => s.loadExhibitors)
  const loadContent = useContentStore(s => s.loadContent)

  const selectedStandId = useMapStore(s => s.selectedStandId)
  const setSelectedStandId = useMapStore(s => s.setSelectedStandId)
  const reducedMotion = useMapStore(s => s.reducedMotion)
  const mapTheme = useMapStore(s => s.mapTheme)
  const routeOriginGateId = useMapStore(s => s.routeOriginGateId)
  const setRouteOriginGateId = useMapStore(s => s.setRouteOriginGateId)
  const userPosition = useMapStore(s => s.userPosition)
  const setUserPosition = useMapStore(s => s.setUserPosition)

  const geometries = useAdminMapStore(s => s.geometries)

  const user = useUserStore(s => s.user)
  const setUser = useUserStore(s => s.setUser)
  const loadUserData = useUserStore(s => s.loadUserData)
  const syncUserData = useUserStore(s => s.syncUserData)
  const clearUserData = useUserStore(s => s.clearUserData)

  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false)
  const [isMobileMapSettingsOpen, setIsMobileMapSettingsOpen] = useState(false)
  const [remoteUserReady, setRemoteUserReady] = useState(false)
  const [authInitializing, setAuthInitializing] = useState(isSupabaseConfigured)
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)
  const [isContributionOpen, setIsContributionOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = mapTheme
    document.documentElement.style.colorScheme = mapTheme
  }, [mapTheme])

  useEffect(() => {
    if (TEMPORARILY_DISABLED_TABS.has(activeTabMode)) setActiveTabMode('map')
  }, [activeTabMode, setActiveTabMode])

  useEffect(() => {
    if (user && window.location.pathname === appPath('/login')) {
      window.history.replaceState({}, '', BASE_PATH || '/')
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const tutorialKey = `mapasafico-tutorial-v1:${user.id}`
    if (window.localStorage.getItem(tutorialKey)) return
    setActiveTabMode('map')
    const timer = window.setTimeout(() => setIsTutorialOpen(true), 500)
    return () => window.clearTimeout(timer)
  }, [setActiveTabMode, user])

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return setIsAdmin(false)
    void supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then(({ data }) => setIsAdmin(data?.role === 'admin'))
  }, [user])

  useEffect(() => {
    void loadExhibitors()
    void loadContent()
  }, [loadContent, loadExhibitors])

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return
    const channel = supabase.channel(`published-content-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exhibitors' }, () => { void loadExhibitors() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => { void loadContent() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => { void loadContent() })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadContent, loadExhibitors, user])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true
    const hydrateSession = async authUser => {
      if (!active) return
      if (!authUser) {
        const cachedUser = window.localStorage.getItem('mapasafico-offline-user')
        if (!navigator.onLine && cachedUser) {
          try {
            setUser(JSON.parse(cachedUser))
            setRemoteUserReady(true)
            setAuthInitializing(false)
            return
          } catch {
            window.localStorage.removeItem('mapasafico-offline-user')
          }
        }
        setUser(null)
        clearUserData()
        setRemoteUserReady(false)
        setAuthInitializing(false)
        return
      }
      setUser(authUser)
      window.localStorage.setItem('mapasafico-offline-user', JSON.stringify(authUser))
      await loadUserData(authUser.id)
      const { data, error } = await supabase.from('user_route_settings').select('origin_id, user_position').eq('user_id', authUser.id).maybeSingle()
      if (!active) return
      if (error) console.error('[Supabase] carregar origem da rota:', error)
      if (data?.origin_id === 'CUSTOM' && data?.user_position) {
        setUserPosition(data.user_position)
        setRouteOriginGateId('CUSTOM')
      } else {
        setUserPosition(null)
        setRouteOriginGateId('HALL1')
      }
      setRemoteUserReady(true)
      setAuthInitializing(false)
    }
    void supabase.auth.getSession().then(({ data }) => hydrateSession(data.session?.user || null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void hydrateSession(session?.user || null) })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [clearUserData, loadUserData, setRouteOriginGateId, setUser, setUserPosition])

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return
    const synchronize = () => {
      void syncUserData(user.id)
      void loadExhibitors()
      void loadContent()
      void flushQueuedContributions()
      void supabase.from('user_route_settings').upsert({
        user_id: user.id, origin_id: routeOriginGateId, user_position: userPosition
      })
    }
    window.addEventListener('online', synchronize)
    return () => window.removeEventListener('online', synchronize)
  }, [loadContent, loadExhibitors, routeOriginGateId, syncUserData, user, userPosition])

  useEffect(() => {
    if (!isSupabaseConfigured || !user || !remoteUserReady) return
    const timer = window.setTimeout(() => {
      void supabase.from('user_route_settings').upsert({
        user_id: user.id,
        origin_id: routeOriginGateId,
        user_position: userPosition
      }).then(({ error }) => { if (error) console.error('[Supabase] salvar origem da rota:', error) })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [remoteUserReady, routeOriginGateId, user, userPosition])

  useEffect(() => {
    if (isSupabaseConfigured) return
    const rememberedUser = window.localStorage.getItem('mapasafico-remembered-user')
    if (!rememberedUser || user) return
    try {
      setUser(JSON.parse(rememberedUser))
    } catch {
      window.localStorage.removeItem('mapasafico-remembered-user')
    }
  }, [setUser, user])

  const selectedExhibitor = exhibitors.find(e => e.id === selectedExhibitorId)
  const selectedGeometry = geometries.find(g => g.id === selectedStandId)

  const handleCloseDrawer = () => {
    setSelectedExhibitorId(null)
    setSelectedStandId(null)
  }

  const handleNavigate = tabId => {
    if (TEMPORARILY_DISABLED_TABS.has(tabId)) return
    setIsAuthOpen(false)
    handleCloseDrawer()
    setActiveTabMode(tabId)
  }

  const handleLoginSuccess = (userData, rememberConnected = false) => {
    setUser(userData)
    window.history.replaceState({}, '', BASE_PATH || '/')
    window.localStorage.setItem('mapasafico-offline-user', JSON.stringify(userData))
    if (rememberConnected) window.localStorage.setItem('mapasafico-remembered-user', JSON.stringify(userData))
    else window.localStorage.removeItem('mapasafico-remembered-user')
  }

  const handleLogout = async () => {
    window.localStorage.removeItem('mapasafico-remembered-user')
    window.localStorage.removeItem('mapasafico-offline-user')
    if (isSupabaseConfigured) await supabase.auth.signOut()
    clearUserData()
    setUser(null)
    window.history.replaceState({}, '', appPath('/login'))
  }

  const startTutorial = () => {
    handleCloseDrawer()
    setIsMobileMapSettingsOpen(false)
    setActiveTabMode('map')
    setIsTutorialOpen(true)
  }

  const finishTutorial = () => {
    if (user) window.localStorage.setItem(`mapasafico-tutorial-v1:${user.id}`, 'completed')
    setIsTutorialOpen(false)
  }

  if (authInitializing) {
    return <div className={`brand-shell site-theme theme-${mapTheme} flex min-h-[100dvh] items-center justify-center`}><div className="flex flex-col items-center gap-3"><img src={appPath('/logo-icon.png')} alt="Mapa Sáfico" className="h-20 w-20 object-contain"/><span className="text-sm font-bold text-[#9b376c]">Carregando seu acesso...</span></div></div>
  }

  if (!user) {
    return <div className={`brand-shell site-theme theme-${mapTheme} min-h-[100dvh]`}><AuthModal isOpen isGate onLoginSuccess={handleLoginSuccess} /></div>
  }

  return (
    <div className={`brand-shell site-theme theme-${mapTheme} relative flex min-h-[100dvh] flex-col overflow-x-hidden font-sans lg:overflow-hidden ${reducedMotion ? 'reduce-motion' : ''}`}>
      
      {/* Header Navigation */}
      <header className="site-header sticky top-0 z-40 border-b shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full items-center justify-between gap-4 px-3 sm:px-4 lg:px-5">
          
          {/* Logo & Title */}
          <button data-tutorial="logo" type="button" onClick={() => handleNavigate('map')} className="brand-lockup flex min-w-0 items-center gap-1.5 rounded-xl text-left transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d43276] sm:gap-2" aria-label="Voltar para o mapa" title="Voltar para o mapa">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden sm:h-12 sm:w-12">
              <img src={appPath('/logo-icon.png')} alt="" aria-hidden="true" className="absolute left-1/2 top-1/2 h-14 w-14 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain sm:h-16 sm:w-16"/>
            </div>
            <div className="relative h-9 w-28 shrink-0 overflow-hidden sm:h-10 sm:w-36">
              <img src={appPath('/logo-texto.png')} alt="Mapa Sáfico · Bienal do Livro 2026" className="absolute left-1/2 top-1/2 h-32 w-32 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain sm:h-40 sm:w-40"/>
            </div>
            <div className="sr-only">
              <span className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-pink-300 bg-clip-text text-transparent leading-tight block">
                Mapa Sáfico
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Bienal SP 2026
              </span>
            </div>
          </button>

          {/* Search Bar in Header for larger screens */}
          <div className="hidden lg:block flex-1 max-w-md">
            <SearchBar />
          </div>

          {/* Navigation Tabs */}
          <nav data-tutorial="navigation" className="site-nav hidden items-center gap-1 rounded-full border p-1.5 md:flex">
            {[
              { id: 'map', label: 'Mapa', icon: Compass },
              { id: 'list', label: 'Listas', icon: List },
              { id: 'passport', label: 'Passaporte', icon: Award, disabled: true },
              { id: 'route', label: 'Minha Rota', icon: Bookmark },
              { id: 'schedule', label: 'Programação', icon: Calendar }
            ].map(tab => {
              const Icon = tab.icon
              const isActive = activeTabMode === tab.id
              const isDisabled = tab.disabled
              return (
                <button
                  key={tab.id}
                  data-tutorial={tab.id === 'route' ? 'route' : undefined}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  title={isDisabled ? 'Disponível em breve' : undefined}
                  onClick={() => handleNavigate(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isDisabled
                      ? 'cursor-not-allowed text-[#98617f] opacity-40'
                      : isActive 
                      ? 'bg-[#d43276] text-white shadow-md shadow-[#d43276]/25'
                      : 'text-[#7b3a60] hover:bg-white hover:text-[#cf005e]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            <button onClick={startTutorial} className="site-header-action flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border p-0 transition-colors" title="Ver tutorial do mapa" aria-label="Ver tutorial do mapa"><CircleHelp className="h-4 w-4"/></button>
            {isAdmin && <button onClick={() => window.open(appPath('/admin'), '_blank', 'noopener,noreferrer')} className="site-header-action flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border p-0 transition-colors" title="Painel administrativo" aria-label="Painel administrativo"><ShieldCheck className="h-4 w-4"/></button>}
            <button
              onClick={() => setIsAccessibilityOpen(true)}
              className="site-header-action flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border p-0 transition-colors"
              title="Acessibilidade"
            >
              <Eye className="w-4 h-4" />
            </button>

            <div className="relative flex items-center gap-2">
              <button data-tutorial="profile" onClick={() => window.open(appPath('/perfil'), '_blank', 'noopener,noreferrer')} className="site-user-chip flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full border-0 p-1 sm:w-auto sm:rounded-xl sm:border sm:px-2" title="Abrir perfil em nova aba">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#b94185] to-[#d43276] text-xs font-bold text-white">
                  {user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full rounded-full object-cover"/> : (user.user_metadata?.name || user.email)[0].toUpperCase()}
                </div>
                <span className="hidden text-xs font-semibold sm:inline">Perfil</span>
              </button>
              <button onClick={handleLogout} title="Sair da conta" className="site-header-action flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border p-0 text-xs font-bold transition-colors sm:w-auto sm:px-3">
                <LogOut className="h-4 w-4"/><span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div data-tutorial="navigation" className="site-mobile-nav flex items-center justify-around border-t px-2 py-2 text-xs font-semibold md:hidden">
          {[
            { id: 'map', label: 'Mapa', icon: Compass },
            { id: 'list', label: 'Listas', icon: List },
            { id: 'passport', label: 'Passaporte', icon: Award, disabled: true },
            { id: 'route', label: 'Rota', icon: Bookmark },
            { id: 'schedule', label: 'Agenda', icon: Calendar }
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTabMode === tab.id
            const isDisabled = tab.disabled
            return (
              <button
                key={tab.id}
                data-tutorial={tab.id === 'route' ? 'route' : undefined}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                title={isDisabled ? 'Disponível em breve' : undefined}
                onClick={() => handleNavigate(tab.id)}
                className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
                  isDisabled ? 'cursor-not-allowed text-[#98617f] opacity-35' : isActive ? 'bg-[#fff0f6] text-[#cf005e] font-bold' : 'text-[#98617f]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Main Content Render */}
      <main className="site-main relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto lg:h-[calc(100dvh-80px)] lg:overflow-hidden">
        {isAuthOpen ? (
          <AuthModal
            isOpen
            onClose={() => setIsAuthOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : activeTabMode === 'map' ? (
          <div className="site-map-page relative flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 lg:absolute lg:inset-0 lg:block lg:p-5">
            <div data-testid="mobile-map-toolbar" className="flex shrink-0 flex-col gap-3 lg:hidden">
              <SearchBar />
              <div className="grid grid-cols-2 gap-2">
                <button data-tutorial="route" onClick={() => setActiveTabMode('route')} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d43276] to-[#e11d74] px-3 text-sm font-black text-white shadow-lg shadow-[#cf005e]/20">
                  <Route className="h-4 w-4"/><span>Montar minha rota</span>
                </button>
                <button data-tutorial="mobile-settings" aria-expanded={isMobileMapSettingsOpen} aria-controls="mobile-map-settings-panel" onClick={() => setIsMobileMapSettingsOpen(open => !open)} className="site-secondary-button flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black shadow-sm">
                  <SlidersHorizontal className="h-4 w-4"/><span>Ajustar mapa</span>
                </button>
              </div>
              {isMobileMapSettingsOpen && <div id="mobile-map-settings-panel"><MapControls variant="mobile-settings"/></div>}
            </div>

            <div data-testid="mobile-map-frame" data-tutorial="map" className="site-map-frame relative h-[58dvh] min-h-[420px] max-h-[620px] shrink-0 overflow-hidden rounded-3xl border shadow-2xl lg:absolute lg:inset-5 lg:h-auto lg:max-h-none lg:rounded-3xl lg:border">
              <BienalMap />
              <MapControls variant="mobile-map" />
              <MapControls variant="desktop" panelOpen={Boolean(selectedExhibitor)} />
            </div>
          </div>
        ) : (
          <>
            {activeTabMode === 'list' && <ExhibitorList />}
            {activeTabMode === 'route' && <RoutePlanner />}
            {activeTabMode === 'schedule' && <ScheduleView />}
          </>
        )}
      </main>

      {/* Floating Selected Exhibitor Bottom Sheet / Side Panel */}
      {selectedExhibitor && !isAuthOpen && (
        <ExhibitorBottomSheet
          exhibitor={selectedExhibitor}
          geometry={selectedGeometry}
          compactList={activeTabMode === 'list'}
          onClose={handleCloseDrawer}
        />
      )}

      {/* Accessibility Panel Modal */}
      <AccessibilityPanel
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
      />
      <MapTutorial open={isTutorialOpen} onFinish={finishTutorial}/>
      <button type="button" onClick={() => setIsContributionOpen(true)} aria-label="Adicionar informação" title="Adicionar informação" className="contribution-floating fixed bottom-4 right-4 z-[70] flex h-11 w-11 items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-105 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"><Plus className="h-5 w-5 sm:h-7 sm:w-7"/></button>
      <ContributionModal open={isContributionOpen} onClose={() => setIsContributionOpen(false)} user={user} exhibitors={exhibitors}/>
    </div>
  )
}
