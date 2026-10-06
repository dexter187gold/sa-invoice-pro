import { Router } from 'express'
import { z } from 'zod'

export const invoicesRouter = Router()

const InvoiceSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['unpaid', 'partial', 'paid', 'overdue', 'cancelled']).default('unpaid'),
  lines: z.array(z.object({
    description: z.string(),
    qty: z.union([z.number(), z.string()]),
    price: z.union([z.number(), z.string()]),
  })).min(1),
  notes: z.string().optional(),
  reminderAt: z.string().optional(),
})

const store = new Map()

invoicesRouter.get('/', (_req, res) => {
  res.json({ data: [...store.values()] })
})

invoicesRouter.post('/', (req, res, next) => {
  try {
    const body = InvoiceSchema.parse(req.body)
    const id = crypto.randomUUID()
    const row = { id, ...body, createdAt: new Date().toISOString() }
    store.set(id, row)
    res.status(201).json({ data: row })
  } catch (e) {
    next(e)
  }
})

invoicesRouter.get('/:id', (req, res) => {
  const row = store.get(req.params.id)
  if (!row) return res.status(404).json({ error: true, message: 'Not found' })
  res.json({ data: row })
})
