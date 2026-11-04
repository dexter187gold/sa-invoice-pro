# Seats & white-label — patterns

## Dual-rail seats

| Rail | Where | Purpose |
|------|--------|--------|
| **Local seats** | `/team` · `src/lib/seats.js` | Desk-side identities on one device (tech / front desk). Optional PIN to switch. Enforced by `RoleGate` + `can(role, perm)`. |
| **Cloud team** | `/team` when signed into Sync | Real accounts (email/password) via invite codes. Server roles; owner invites / removes. |

### Tier limits (`seatLimits`)

| Tier | Users | Branches |
|------|------:|---------:|
| Solo | 1 | 1 |
| Shop | 5 | 1 |
| Multi | 25 | 5 |
| Enterprise | 50 | 20 |

`assertCanAddSeat` blocks new local seats over the limit; edits of existing seats still allowed.

### Roles (`src/lib/roles.js`)

Owner → Admin → Manager → Front desk / Helpdesk → Tech → Accountant → Viewer.  
Unknown server roles **fail closed** to Viewer (never inherit Owner).

### Switch flow

1. Team list → **Switch**  
2. If seat has PIN → prompt  
3. `setActiveSeatId` + `sa-active-seat` event  
4. `ActiveSeatChip` in shell refreshes; RoleGate re-evaluates on navigation

---

## White-label pilot

| Piece | Implementation |
|-------|----------------|
| Storage | `localStorage` key `saip_white_label_v1` |
| Apply | `applyWhiteLabel` sets `--green`, `--brand-accent`, `data-brand-name`, `data-hide-powered` |
| Boot | `main.jsx` calls apply on load |
| UI | Settings → **White-label** (Shop+ in pilot) |
| Shell name | `displayAppName()` in `Shell.jsx` |

### Fields

- `brandName` — header title  
- `portalTagline` — portal subhead  
- `accent` — hex primary  
- `logoDataUrl` — compressed data URL (max ~400k)  
- `hidePoweredBy` — suppress product footer on portal/PDF (pilot flag)

### CSS hooks

```css
:root[data-hide-powered="1"] .powered-by { display: none; }
:root[data-brand-name] .brand-product-fallback { /* optional */ }
```

Resellers: set brand + accent per device for demos; cloud sync of white-label is a later slice.

---

## Owner checklist

1. License tier matches headcount (Shop vs Multi).  
2. Local seats for shared bench PC; Cloud team for each person with own login.  
3. White-label accent matches shop brand; test portal with tagline.  
4. Tech seats should not reach Settings / License (RoleGate).
