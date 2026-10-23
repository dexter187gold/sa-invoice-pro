import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, downloadCsv, FilterChips,
  ActionMenu, SelectCell, DataTable, EditableCell, formatDateZA,
} from '../components/ui'
import { contactsPickerSupported, pickContactsFromPhone, normalizeSaPhone } from '../lib/contacts'
import { CLIENT_CATEGORIES, categoryLabel, categoryOf } from '../lib/clientCategories'
import { slaUsage } from '../lib/sla'
import { openWhatsApp, openEmail, buildClientStatement } from '../lib/share'
import { openInvoicesForClient, statementTotals, downloadStatementPdf, shareStatementPdf } from '../lib/statementPdf'
import { buildClientLedger } from '../lib/payments'
import { Sync } from '../lib/sync'

export default function Clients() {
  const { clients, invoices, payments, tickets, timeEntries, company, refresh, toast } = useApp()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', vatNumber: '', address: '', category: 'cod', slaHoursCap: '',
  })
  const [show, setShow] = useState(false)
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [portalBusyId, setPortalBusyId] = useState(null)
  const [lastPortal, setLastPortal] = useState(null)
  const canPick = contactsPickerSupported()

  // truncated restore - full file will follow in next commit if needed
  return (
    <PageFade>
      <div className="page-header"><h1>Clients</h1></div>
      <p className="muted">Loading full Clients UI…</p>
    </PageFade>
  )
}
