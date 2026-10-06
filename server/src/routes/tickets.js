import { Router } from 'express'
import { z } from 'zod'

export const ticketsRouter = Router()

const TicketSchema = z.object({
  title: z.string().min(1),
  status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']).default('open'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  category: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  notes: z.string().optional(),
})

const CommentSchema = z.object({
  text: z.string().min(1),
  internal: z.boolean().optional(),
  author: z.string().optional(),
})

const tickets = new Map()
const comments = new Map()

ticketsRouter.get('/', (_req, res) => res.json({ data: [...tickets.values()] }))

ticketsRouter.post('/', (req, res, next) => {
  try {
    const body = TicketSchema.parse(req.body)
    const id = crypto.randomUUID()
    const row = { id, ...body, createdAt: new Date().toISOString() }
    tickets.set(id, row)
    res.status(201).json({ data: row })
  } catch (e) { next(e) }
})

ticketsRouter.get('/:id/comments', (req, res) => {
  const list = [...comments.values()].filter((c) => c.ticketId === req.params.id)
  res.json({ data: list })
})

ticketsRouter.post('/:id/comments', (req, res, next) => {
  try {
    if (!tickets.has(req.params.id)) return res.status(404).json({ error: true, message: 'Ticket not found' })
    const body = CommentSchema.parse(req.body)
    const id = crypto.randomUUID()
    const row = { id, ticketId: req.params.id, ...body, createdAt: new Date().toISOString() }
    comments.set(id, row)
    res.status(201).json({ data: row })
  } catch (e) { next(e) }
})
