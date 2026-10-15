# EMR Appointments - Frontend

React 18 + Vite UI for the Enterprise EMR Appointment Management system (talks to `emr-be`).

## Setup

```bash
npm install
cp .env.example .env     # VITE_API_URL, VITE_SOCKET_URL
npm run dev              # http://localhost:5173
npm run build            # production bundle in dist/
npm run lint
```

| Variable | Default |
| --- | --- |
| `VITE_API_URL` | `http://localhost:5000/api/v1` |
| `VITE_SOCKET_URL` | `http://localhost:5000` |

Demo logins (shown on the login page in dev builds only): `admin@emr.com / Admin@123`, `reception@emr.com / Recep@123`, `doctor1@emr.com / Doctor@123`.

## Structure

```
src/
  main.jsx, app.jsx        bootstrap, session restore
  routes/                  AppRoutes (lazy + Suspense), ProtectedRoute, RoleRoute
  layouts/                 AuthLayout, DashboardLayout (responsive sidebar/topbar)
  pages/                   one thin page per route
  features/<domain>/       feature components + hooks (scheduler, booking, appointments, doctors, users, dashboard)
  components/<Name>/       reusable UI (Button, Field/Input/Select/Textarea, DatePicker, SlotGrid, Modal, ...)
  slices/, store/          Redux Toolkit: auth + toast slices
  services/                axios client (token attach, single-flight 401 refresh) and one service per resource
  hooks/                   useFetch (abortable), useAsync, useDebounce, usePagination, useUrlParams, useSocket
  lib/                     socket.js singleton, tokenStorage.js
  utils/, constants/, styles/
```

## Design decisions

- **State**: Redux holds only cross-cutting state (auth session, toasts). Server data (slots, appointments, doctors, stats) is fetched with services + `useFetch`, because it is page-scoped, URL-driven and needs request cancellation; a global cache would add ceremony without sharing benefits.
- **Tokens**: the access token lives in memory only; the refresh token is kept in `localStorage` so sessions survive reloads. Tradeoff: any XSS could read the refresh token (httpOnly cookies would be safer but the contract is token based). On load the app refreshes, then calls `/auth/me`.
- **Refresh flow**: a 401 triggers one shared refresh request (single-flight), the original request is retried once, and on failure the session is cleared.
- **Real-time**: one socket (`auth` is a function so reconnects use the newest token). The scheduler subscribes to the selected doctor's room, re-subscribes on reconnect and refetches slots (debounced) on matching events.
- **Forms**: react-hook-form + zod; 422 `errors[]` are mapped onto fields, 409 on booking shows a toast and refreshes slots.

## Optimizations used

Route-level code splitting (`React.lazy`) plus vendor chunks, `memo` on SlotGrid/slot buttons/table rows/pagination, `useCallback`/`useMemo` for stable handlers and derived data, debounced patient/appointment searches, axios request cancellation via `AbortController` on every fetch, silent background refreshes (no skeleton flash) for live updates and after mutations.

## Theming

- All colours, radii, shadows, spacing and motion come from CSS variables in `src/styles/tokens.css`. Never hard-code colours in component CSS; add or reuse a token so both themes keep working.
- Style: modern and sleek (Linear/Vercel-like) but calm. Off-white page (`#F7F9FB`), white cards with 1px hairline borders and an inner top highlight, layered ultra-soft shadows (`--shadow-xs..lg`, `--highlight`), radii 8px small / 10px controls / 12px cards / 16px sheets / pill badges. Primary is medical teal (`#0F766E`; white text on it is 5.5:1). No gradients except a faint tinted radial glow, dot grid and gradient hairline on the login brand panel (`--color-glow`, `--color-dot`).
- Light is the default palette; the dark palette (deep slate, not black, with a lighter teal accent for text and the same teal for filled buttons) is applied by `[data-theme='dark']` and, when the user has not chosen a theme, by `prefers-color-scheme: dark`.
- The top bar toggle (`src/components/ThemeToggle`, `src/hooks/useTheme.js`) stores the choice in `localStorage` (`emr-theme`, wrapped in try/catch). A small inline script in `index.html` applies it before first paint.
- Shell: translucent blurred top bar; compact sidebar that collapses to an icon rail on desktop (tooltips from `data-tip`, state in `localStorage` key `emr-sidebar-collapsed`, try/catch) and is a drawer on mobile. Modals are centred sheets with blurred backdrop on desktop and bottom sheets on mobile; toasts are compact cards bottom-right. Slots pulse once when a live update changes their status.
- Typography: Inter from Google Fonts (`index.html`) with a `system-ui` fallback; 16px body, -0.02em heading tracking, tabular numbers for times, tables and stats.
- Controls are at least 44px tall (`--control-height`); focus is a 2px teal outline with 2px offset; animations respect `prefers-reduced-motion`.

### Status colours

Status is always shown as a badge with a dot plus text, never colour alone.

| Status | Colour | Token |
| --- | --- | --- |
| scheduled (confirmed) | green | `--color-success*` |
| arrived (checked in, in progress) | blue | `--color-info*` |
| completed | muted gray-green | `--color-neutral*` |
| cancelled / urgent / errors | red | `--color-danger*` |
| pending / warning (e.g. socket "Connecting", `.badge--pending`) | amber | `--color-warning*` |

Slot states: available = white pill with soft teal outline (teal tint and lift on hover), selected = filled teal, booked = soft gray with lock icon and "Booked", past = dashed light gray. Breaks are a quiet "Break" divider.

### Contrast

Token pairs are checked against WCAG AA (4.5:1 text, 3:1 UI) in both themes; re-check after changing any colour token (every text/background and status text/tint pair in `tokens.css`).

On desktop widths up to 94rem the appointment table folds Mobile and Department under Patient and Doctor and hides "Booked on" so Status and Actions stay visible; mobile cards show every field.
