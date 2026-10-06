import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Shell from './components/Shell'
import ToastHost from './components/ToastHost'
import AppLogo from './components/AppLogo'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Invoices from './pages/Invoices'
import InvoiceEdit from './pages/InvoiceEdit'
import Quotes from './pages/Quotes'
import Tickets from './pages/Tickets'
import Accounting from './pages/Accounting'
import Settings from './pages/Settings'
import Products from './pages/Products'
import Expenses from './pages/Expenses'
import Employees from './pages/Employees'
import Payroll from './pages/Payroll'
import Reports from './pages/Reports'
import Documents from './pages/Documents'
import License from './pages/License'
import Payments from './pages/Payments'
import { APP_VERSION } from './config'

function Guard({ children, needCompany }) {
  const { ready, user, company } = useApp()
  if (!ready) {
    return (
      <div className="boot">
        <div className="boot-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <AppLogo size={64} />
          </div>
          <p>Loading workspace…</p>
          <span className="muted">v{APP_VERSION}</span>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (needCompany && !company?.name) return <Navigate to="/setup" replace />
  return children
}

export default function App() {
  return (
    <>
      <ToastHost />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Guard needCompany={false}><Setup /></Guard>} />
        <Route path="/*" element={
          <Guard needCompany>
            <Shell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<InvoiceEdit />} />
                <Route path="/invoices/:id" element={<InvoiceEdit />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/products" element={<Products />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/accounting" element={<Accounting />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/license" element={<License />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Shell>
          </Guard>
        } />
      </Routes>
    </>
  )
}
