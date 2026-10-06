import express from 'express'
import cors from 'cors'
import { invoicesRouter } from './routes/invoices.js'
import { ticketsRouter } from './routes/tickets.js'
import { documentsRouter } from './routes/documents.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/v1/health', (_req, res) => res.json({ ok: true, service: 'sa-invoice-pro-api' }))
app.use('/api/v1/invoices', invoicesRouter)
app.use('/api/v1/tickets', ticketsRouter)
app.use('/api/v1/documents', documentsRouter)
app.use(errorHandler)

const port = process.env.PORT || 8787
app.listen(port, () => console.log(`SA API optional server on :${port}`))
