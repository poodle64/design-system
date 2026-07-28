# Real-browser verification

Two surfaces, selected by `?surface=`: the default `shell` (AppShell, below) and
`states` (the async-outcome surfaces — see the last section).

## AppShell (`?surface=shell`, the default)

The interaction logic is proved in `src/test/app-shell.test.ts` under jsdom.
Everything on this page is proved in a real engine instead, because jsdom
**cannot** make any of these claims: it applies no stylesheet and returns the
unresolved `var(--…)` literal from `getComputedStyle`, so an assertion there
passes just as happily on a colour nothing defines. That blind spot has hidden
five separate defects in this programme, and it hid a sixth during this change —
see "What this caught" below.

## Running it

```sh
pnpm run harness:build          # vite build + real Tailwind over dist/
pnpm run harness:serve          # http://127.0.0.1:4180
```

The page reads `?variant=rail|header` and `?collapsible=1` from the query, so a
driver sets configuration by navigation rather than by synthesising clicks. It
imports from `../dist`, not `../src`: the claim under test is about the artefact
a consuming app installs, and `svelte-package` rewrites import specifiers on the
way out, so the source is not the same input. Its stylesheet is the documented
consumer import chain, verbatim.

## What is asserted, and why it needs an engine

Drive with any browser automation that can evaluate JS in the page (the
household's `browser-driver` MCP was used); read the outcome from the DOM, never
from a screenshot. Two viewports: **1440×900** (desktop) and **390×844** (phone).

| Claim | Why jsdom cannot make it | Observed |
| --- | --- | --- |
| The chrome surface resolves to a real colour | jsdom returns `var(--ds-shell-chrome)` and calls it a pass | `oklch(0.97 0.005 85)` light / `oklch(0.175 0.018 260)` dark |
| The rail is exactly its declared width | no layout engine | 248px = 15.5rem |
| Active nav differs visibly from inactive | no cascade | active `oklch(0.5 0.155 250 / 0.12)` vs inactive transparent |
| The active marker is not colour alone (WCAG 1.4.1) | pseudo-elements are not computed | rail: 2×24px bar; header: 2px `::after` underline |
| The theme toggle **actually flips** | no media/class-driven cascade | shell bg `oklch(0.985 0.003 85)` → `oklch(0.205 0.015 260)`, rail follows, restores on second press |
| Exactly one theme icon shows per mode | `dark:` variants never resolve | `[block, none]` → `[none, block]` |
| The rail collapses and re-expands | no transitions, no layout | 248 → 56 → 248px; labels drop to a 1×1 `sr-only` box; links centre |
| The rail is hidden on a phone | no media queries | `display: none` at 390px; brand moves into the bar |
| The drawer opens flush and full-height | no layout | `display:none` → `flex`, `position: fixed`, 248px at `left: 0`, scrim covers the viewport, 4 items, active lit |
| The rail and drawer are one element, never two | no cascade, no layout | exactly one `identity`, one collapse control and one `Primary` landmark in both states |
| A drawer opened on a phone is inert once widened | no media queries | forcing `data-drawer` at 1440px leaves `position: sticky`, 248px |
| Focus enters the overlay and returns on close | `:focus` and layout are not computed | opens onto "Close menu"; Escape returns focus to the trigger |
| Tab wraps inside the overlay | needs a real layout to know what is visible | 7 of 8 candidates in the cycle; the display:none collapse control excluded; last → first |
| The drawer is a dialogue only while it is one | — | `role="dialog" aria-modal="true"` on open, both gone on close |
| No two dismiss controls share a name | — | scrim "Dismiss menu", close "Close menu", trigger "Menu" + `aria-expanded` |
| A tap-through does not leave the drawer over the page | needs real navigation | drawer gone, hash advanced |
| The header variant opens a panel, never a drawer | no layout | panel below the bar, full width, drawer absent |
| Nothing overflows horizontally on a phone | no layout | `scrollWidth <= innerWidth`, both variants |
| The palette opens on ⌘K and navigates | — (also covered in jsdom) | 4 items listed, hash advanced to the selected item, palette closed |
| The bypass link hides at rest and reveals on focus | `:focus` styling is not computed | `top: -48px` → `8px`, 3px outline, focus lands on `#ds-main` |

Three measurement traps worth inheriting. Each produced a false failure here,
and the third looked exactly like a total regression:

- **Read a rect after the transition, not with it.** `.ds-skip-link` animates
  `top` over 150ms; reading `getBoundingClientRect()` in the same frame as
  `.focus()` returns the resting value and reads as "the control does nothing".
- **Blur before measuring a resting state.** `evaluate` calls share one page, so
  an element focused by the previous call is still focused in the next.
- **A rebuilt stylesheet is not a reloaded stylesheet.** The page's `<link>` is
  cached across navigations within a session, so re-navigating after
  `harness:build` re-runs the new JS against the OLD css. That reads as "the
  rules do not apply at all" — here it briefly looked like a restructured rail
  had lost every rule. Recreate the session (a fresh context has no cache)
  rather than trusting a query-string bust on the HTML, which does not bust the
  stylesheet.

## What this caught

The theme toggle's sun/moon icons did not swap, in either mode, while the
palette flipped correctly around them. Every existing gate was green: the icons
were in the DOM, the classes were right, the type check passed, and jsdom had
nothing to say about it.

The cause was one layer above this component. Tailwind v4 resolves a bare
`dark:` against `prefers-color-scheme`; the estate uses the class strategy, and
`@custom-variant dark` was **unowned** — all four adopting apps had
independently typed the identical declaration into their own `app.css`, so the
~50 `dark:` utilities this package ships worked only by the grace of every
consumer remembering. The fifth app to adopt would have got a silently
half-dark component set with no error anywhere.

The declaration now ships in `@poodle64/ui/styles.css` beside the utilities that
depend on it, and `src/test/dark-variant.test.ts` compiles the built package
*without* an app's own declaration and fails if any shipped `dark:` utility
lands somewhere a class-based theme switch cannot reach.

## The async-outcome surfaces (`?surface=states`)

`LoadingState`, `ErrorState` and `EmptyState` from `../dist`, reached by driving
a load (idle → loading → failed | empty) rather than by mounting the finished
markup. What arrives after the page has settled is the whole claim: a live
region only announces if it is there at the instant the outcome lands.

jsdom can see the attribute but not the semantics. `getByRole` there is
testing-library resolving a static element→role table, so it proves the string
`role="alert"` is present and nothing about what a browser hands the platform.
The engine builds the tree itself, which is why the same claim is made twice.

| Claim | Observed (1440×900) |
| --- | --- |
| Nothing announces before a load is under way | tree carries the three drivers and no live region |
| An in-flight load is a polite status | `status "Fetching records…"` |
| A failure that arrives later is exposed as an alert | `alert:` → `paragraph: Could not load the estate.` |
| The glyph is not announced beside the message | no `img`/graphic node inside the alert |
| An empty result never interrupts | `heading "No records"`, no live region |

**The pre-change build was driven in the same engine**, and the failure surfaced
as a bare `paragraph: Could not load the estate.` — no live region, nothing for
a screen reader to announce, on a surface that only ever appears because the
user's task has broken.

Zero visual difference was measured, not assumed, against that same baseline
build: identical class list, bounding box (1376×166 at 32,72), background
`oklch(1 0 0)`, border `oklab(0.53 0.178201 0.0907981 / 0.4)` at 1px, radius
10px, padding 32px, message colour/size/`max-width` and icon box. The only
difference in the whole read was `role`/`aria-live` going from `null/null` to
`alert/assertive`. Nothing in the package's CSS selects on either attribute
(the only `[role=…]` rules are the table's `[&:has([role=checkbox])]`).

One thing the baseline settled that the source did not: the icon carried
`aria-hidden="true"` **before** the change too. `@lucide/svelte` v1 adds it to
any icon given no `aria-*`/`role`/`title` and no children, so the glyph was
never being announced. The explicit attribute here is a pin against that
default moving, and matches how `LoadingState` already writes it — not a fix
for a live defect.

### The limit of what was verified

The engine proves the alert node is built and carries the message. It does not
prove what a screen reader then *says*, and one nuance is worth writing down
because it is the obvious thing to get wrong later.

`ErrorState` mounts already carrying its message. MDN counsels the opposite —
prime an empty `role="alert"` in the markup first, then inject the text, since
a live region announces on *content change* and an element that arrives fully
populated is not a change. The Accessibility Developer Guide's matrix tests
exactly the populated-on-insert form and records a pass on NVDA and JAWS across
Firefox, Chrome and Edge, which is the mainstream set and the form every
component library in this class ships. Priming instead would buy the stricter
reading at the cost of a frame of empty box, and of a non-obvious mechanism the
next maintainer would strip.

Two things remain genuinely unverified: **VoiceOver/Safari**, absent from that
matrix, and any real AT at all — no screen reader was run here. If a report ever
arrives that a failure is not announced on a particular pairing, prime the
region rather than re-deriving this from scratch.

The same source notes an alert must be **visible** to be recognised, which this
one is; a caller hiding it with `hidden` or `display:none` would silence it.
