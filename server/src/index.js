import express from 'express'
import cors from 'cors'
import { invoicesRouter } from './routes/invoices.js'
import { ticketsRouter } from './routes/tickets.js'
import { documentsRouter } from './routes/documents.js'
import { portalRouter } from './routes/portal.js'
import { whatsappRouter } from './routes/whatsapp.js'
import { paymentsRouter } from './routes/payments.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '4mb' }))

app.get('/api/v1/health', (_req, res) =>
  res.json({ ok: true, service: 'sa-invoice-pro-api', portal: true, whatsapp: true, payments: true }),
)
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'sa-invoice-pro-api', payments: true }))

// Match production saip-sync paths used by the SPA
app.use('/api/portal', portalRouter)
app.use('/api/v1/portal', portalRouter)
app.use('/api/whatsapp', whatsappRouter)
app.use('/api/v1/whatsapp', whatsappRouter)

// Professional Pay Now (Paystack primary)
app.use('/api/portal/pay', paymentsRouter)
app.use('/api/v1/portal/pay', paymentsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/v1/payments', paymentsRouter)

app.use('/api/v1/invoices', invoicesRouter)
app.use('/api/v1/tickets', ticketsRouter)
app.use('/api/v1/documents', documentsRouter)
app.use(errorHandler)

const port = process.env.PORT || 8787
app.listen(port, () => console.log(`SA API + portal + WhatsApp + payments on :${port}`))
