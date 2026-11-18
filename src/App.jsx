import React from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import InstallPrompt from './components/InstallPrompt'
import { useApp } from './context/AppContext'
import Shell from './components/Shell'
import ToastHost from './components/ToastHost'
import LegalConsent from './components/LegalConsent'
import AppLogo from './components/AppLogo'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Invoices from './pages/Invoices'
import InvoiceEdit from './pages/InvoiceEdit'
import Quotes from './pages/Quotes'
import QuoteEdit from './pages/QuoteEdit'
import Tickets from './pages/Tickets'
import MultiJobInvoice from './pages/MultiJobInvoice'
import Accounting from './pages/Accounting'
import Settings from './pages/Settings'
import Products from './pages/Products'
import Expenses from './pages/Expenses'
import PettyCash from './pages/PettyCash'
import Employees from './pages/Employees'
import Payroll from './pages/Payroll'
import Reports from './pages/Reports'
import Documents from './pages/Documents'
import ContentStudio from './pages/ContentStudio'
import License from './pages/License'
import Team from './pages/Team'
import OwnerRecovery from './pages/OwnerRecovery'
import DevPortal from './pages/DevPortal'
import OwnerCommandCentre from './pages/OwnerCommandCentre'
import PortalAdmin from './pages/PortalAdmin'
import Webhooks from './pages/Webhooks'
import BankImport from './pages/BankImport'
import Branches from './pages/Branches'
import SmsGateway from './pages/SmsGateway'
import WaTemplates from './pages/WaTemplates'
import Recurring from './pages/Recurring'
import Payments from './pages/Payments'
import WaChase from './pages/WaChase'
import ExcelViewer from './pages/ExcelViewer'
import Changelog from './pages/Changelog'
import SyncHealth from './pages/SyncHealth'
import Support from './pages/Support'
import About from './pages/About'
import Roadmap from './pages/Roadmap'
import Inbox from './pages/Inbox'
import Portal from './pages/Portal'
import { ErrorBoundary } from './components/ui'
import RoleGate from './components/RoleGate'
import { readAccessStatus, canAccessPath, pathFeatureLabel } from './lib/accessControl'
import MaintenanceBanner from './components/MaintenanceBanner'

function LicenseAccessGate({ children }) {
  const { user } = useApp()
  const location = useLocation()
  const [state, setState] = React.useState({ loading: true, status: null })
  React.useEffect(() => {
    let alive = true
    readAccessStatus().then((status) => { if (alive) setState({ loading: false, status }) }).catch(() => {
      if (alive) setState({ loading: false, status: { licensed: false, trialDaysLeft: 0 } })
    })
    const on = () => readAccessStatus().then((status) => setState({ loading: false, status })).catch(() => {})
    window.addEventListener('sa-license-updated', on)
    return () => { alive = false; window.removeEventListener('sa-license-updated', on) }
  }, [location.pathname])
  if (state.loading) return <div className="muted" style={{ padding: 24 }}>Checking access…</div>
  const isOwner = !!(user?.isOwner || user?.role === 'owner' || user?.role === 'Owner')
  if (!canAccessPath(location.pathname, state.status, isOwner)) {
    return (
      <div className="card" style={{ margin: 24, maxWidth: 480 }}>
        <h2>Feature locked</h2>
        <p className="muted">{pathFeatureLabel(location.pathname)} needs a higher plan or owner access.</p>
        <a className="btn btn-primary" href="/license">View licence & plans</a>
      </div>
    )
  }
  return children
}

function Guard({ children }) {
  const { user, ready } = useApp()
  const location = useLocation()
  if (!ready) return <div className="muted" style={{ padding: 24 }}>Loading workspace…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <ToastHost />
      <InstallPrompt />
      <MaintenanceBanner />
      <LegalConsent />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/portal/*" element={<Portal />} />
        <Route path="/dev-portal" element={<DevPortal />} />
        <Route path="/*" element={
          <Guard>
            <Shell>
              <LicenseAccessGate>
              <RoleGate>
              <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<InvoiceEdit />} />
                <Route path="/invoices/:id" element={<InvoiceEdit />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/quotes/new" element={<QuoteEdit />} />
                <Route path="/quotes/:id/edit" element={<QuoteEdit />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/tickets/bill" element={<MultiJobInvoice />} />
                <Route path="/products" element={<Products />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/petty-cash" element={<PettyCash />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/wa-chase" element={<WaChase />} />
                <Route path="/bank" element={<BankImport />} />
                <Route path="/branches" element={<Branches />} />
                <Route path="/recurring" element={<Recurring />} />
                <Route path="/wa-templates" element={<WaTemplates />} />
                <Route path="/sms" element={<SmsGateway />} />
                <Route path="/excel" element={<ExcelViewer />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/sync" element={<SyncHealth />} />
                <Route path="/support" element={<Support />} />
                <Route path="/about" element={<About />} />
                <Route path="/roadmap" element={<Roadmap />} />
                <Route path="/accounting" element={<Accounting />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/documents" element={<Documents />} />\n                <Route path="/content-studio" element={<ContentStudio />} />
                <Route path="/license" element={<License />} />
                <Route path="/team" element={<Team />} />
                <Route path="/owner-recovery" element={<OwnerRecovery />} />
                <Route path="/owner-console" element={<OwnerCommandCentre />} />
                <Route path="/portal-admin" element={<PortalAdmin />} />
                <Route path="/webhooks" element={<Webhooks />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </ErrorBoundary>
              </RoleGate>
              </LicenseAccessGate>
            </Shell>
          </Guard>
        } />
      </Routes>
    </>
  )
}
