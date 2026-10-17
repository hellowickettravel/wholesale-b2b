# UI polish plan: "smooth minimalism" (Phase 14)

Owner request, 17 Oct 2026: re-look at every page and screen (design, structure, colours, fonts, sizes) and upgrade the
whole front end to a minimal, clean, professional look. In the owner's words: **"smooth minimalism is needed"**.
This is the plan. The owner said "go ahead" on 17 Oct. **Progress: 14.0 done** (DECISIONS D55); 14.1 is next.

**How it was made.** The skills `frontend-design` (Anthropic) and `ui-ux-pro-max` (v2.15.0) are installed in
`.claude/skills/` and match their GitHub sources. Every screen was screenshotted on the local stack at phone (390px) and
laptop (1280px) width: 90 screens, 181 images in `test-results/screens/`. Four reviewers then each audited one area
against both skills' rules and read the code behind each finding: public and sign-in pages, the restaurant shop, admin
part 1, and admin part 2 plus supplier and driver. This document merges the four reports into one design direction and
one sequence of work.

---

## 1. Verdict in one paragraph

The base is good: one navy/red token set, readable sizes, AA contrast, labelled fields, money in tabular figures. The
site does not yet feel *smooth and minimal*, for three reasons:
- **Too many ways of doing the same thing.**
  - Five labels and three shapes for "open an account".
  - Three filter bars, three title sizes, two 404 pages.
  - Yellow means four different things.
- **Decoration where content should be.**
  - Navy hero banners that push products off the first phone screen.
  - Tracked ALL-CAPS eyebrows, glows and circles.
  - An 11-colour rainbow of category tints.
  - Cards nested inside tinted panels.
- **Long screens with the key action out of sight.**
  - "Place order" is about 1,500px down on a phone.
  - "Record a payment" on an order is about 3,500px down.
  - Settings, product edit and import have no save bar that stays in view.

There is also one real bug underneath: `cn()` does not resolve conflicting Tailwind classes, so some styles silently
lose. Product photos are square where the code asks for 4:3, and there are about a dozen `!important` workarounds.

## 2. Design direction: "smooth minimalism"

The rules every phase follows. They replace ad-hoc choices screen by screen.

### 2.1 Principles
1. **One screen, one job, one primary button.** Everything else is secondary (outline) or a text link.
2. **Content first, chrome last.** No hero banners inside the logged-in app. No eyebrows, glows, decorative circles,
   or "card inside a tinted panel". The page background, white surfaces and whitespace do the work.
3. **Fewer lines.** Separate with space before borders. One hairline at most between rows, no double borders.
4. **Colour means something.** Navy is structure and primary actions. Red is buying (Add, Place order, Open a trade
   account) and danger. Grey is everything else. Status colours carry meaning only (see 2.3).
5. **The key action never scrolls away.** Sticky checkout, sticky save bars, sticky import bar.
6. **Smooth, never showy, motion.**
   - 150–220ms ease-out on hover, press, open and close.
   - Skeletons that match the real page.
   - No bounce. Nothing at all under `prefers-reduced-motion`.
   - This builds on the motion rules already in D46.

### 2.2 Type
- **One family: Inter** (variable, 400/500/600/700). Plus Jakarta Sans goes. Two near-identical geometric sans faces
  add weight without contrast, and one family reads calmer and loads faster. Headings use 600–700 with -0.02em
  tracking, never tighter. The tighter setting currently detaches punctuation, as in "wholesale ,".
- **Scale (desktop / phone):**

  | Element | Desktop | Phone |
  |---|---|---|
  | Page title | 28px | 24px |
  | Section title | 20px | 20px |
  | Card title | 17px / 600 | 17px / 600 |
  | Body | 16px | 16px |
  | Secondary | 15px | 15px |
  | Smallest | 13px (no 10.5px or 11px anywhere) | 13px |
  | Public hero | 44px | 32px |

- **Sentence case everywhere.** No tracked ALL-CAPS labels, table headers, footer headings or logo tagline.
- **Tabular figures on digits only.** Today `.tabular` on "ORDER-1001" and "INV-000001" opens a gap around the hyphen.

### 2.3 Colour
- **Palette:** keep navy `#0b2a5b`, red `#d81f26`, page `#f4f6fa` and white surfaces. Use the yellow `--brand-sun` only
  on navy, and sparingly.
- **One status map, used by every badge in shop, admin and supplier:**

  | Meaning | Tone | Examples |
  |---|---|---|
  | Neutral / waiting | grey | Placed, Order received, Hidden, roles |
  | In progress | blue (info) | Accepted, Out for delivery, Part paid |
  | Done | green | Delivered, Paid, Completed, Free delivery reached |
  | Needs you | amber | Awaiting approval, Needs price, Due today |
  | Problem | red | Overdue, Failed, Rejected, Cancelled |

  Raw hex in `badge.tsx` (`#fff5d6`/`#6b4700`) goes.
- **Categories:** one neutral wash and a navy line icon for every category. The 11 `--ground-*` hues stay as data
  tokens only and are not used for decoration.
- **Price notice** ("Prices for approved accounts"): grey/navy tint, not the alert-pink it uses now.
- **Control borders:** solid `--line-strong` (3.5:1). The current `/80` and `/70` alpha drops them to about 2.6:1.

### 2.4 Shape, space, elevation
- **Radius:**
  - Controls and buttons: 10px.
  - Cards: 12px.
  - Full pills only for chips, filters and the search field.
  - So buttons are no longer a mix of pills and rounded rectangles.
- **Spacing:** a 4/8 grid.
  - Page gutter 16px on phone, 32px on desktop.
  - Card padding 16px on phone, 20px on desktop.
  - Section gap 32px on phone, 48px on desktop.
- **Elevation:** surfaces are flat with a 1px `--line` border. Shadow is used only for things that float: menus,
  dialogs, sticky bars, toasts.
- **Tap targets:** at least 44px on every phone control: stepper, Add, chips, sort, remove buttons.
- **Phone form controls:** 16px text, so iOS Safari does not zoom in.

---

## 3. Phases

Each phase is one pull request, sized to review on a phone in a few minutes. Every phase ends the same way:
- `npm run verify`, plus the browser tests for the areas it touches.
- **Before/after screenshots** at 390px and 1280px, attached to the PR.
- The owner looks, then merges, and Vercel deploys.

No database schema changes are needed, except where marked **(+feature)**. Those are small additions that make a screen
work properly, and the owner can drop them.

Size: S is up to about half a day of agent work, M about a day, L about two days.

### Phase 14.0: Foundations (M), done first, everything else builds on it: **done**
Fix once in shared code, and every screen improves.
- **`cn()` with `tailwind-merge`**, then remove the about 12 `!` workarounds. Card photos become 4:3 as intended.
- **Tokens and type:**
  - Inter only.
  - The new scale in `globals.css`.
  - Radius and elevation values as in 2.4.
  - Solid control borders.
  - Status tones in `badge.tsx` mapped to the table in 2.3. One `statusTone()` helper is used by shop, admin and
    supplier.
- **Primitives:**
  - `Button`: one shape; `accent` = buy, `danger-ghost` for rare destructive actions.
  - `Input`/`Select`: a dense `size="sm"` for tables and editors, replacing the private `control` classes in the
    sizes editor and pricing workbench.
  - A `FilePicker` drop-zone that replaces the browser's "Choose file" box.
- **`Card` and `Table`:**
  - `Card` clips its corners. This fixes the broken top corners on every admin table.
  - The table head gets its own fill, a sticky header, and a `numeric` prop used everywhere.
  - Rows are clickable across their whole width.
- **`PageHeader`:**
  - One title size.
  - New `back`, `meta` (badges) and `actions` slots.
  - The order page and customer page move onto it.
- **`FilterBar`:**
  - One version for every list, including Orders, Products, Audit and Users.
  - A borderless variant for use inside cards.
  - On phone the fields sit behind a "Filters (n)" button.
- **`EmptyState` / `StatusPage` / 404:**
  - One flat, left-aligned style.
  - One root 404 and one segment 404.
  - Contact actions (WhatsApp, email) wherever a page says "contact us".
- **`StickyActionBar`:** one component for checkout, save and import bars. It is safe-area aware and keeps the toast
  above it.
- **Toast:**
  - Stacks above any docked bar, which fixes the "Added …" toast covering Add on the product page.
  - The success icon is green, not red.
- **Screenshot tooling, so the next phases can be checked properly:**
  - `scripts/screens.mts` runs in the `en-GB` locale.
  - Fix the driver link, which uses a non-existent 3rd order, and the delivered-order and single-pack product
    fixtures, which are 404s now.
  - Add the screens it misses: emails, security, costs, legal and 404s.

### Phase 14.1: Restaurant shop, phone first (L)
The highest-value phase: this is where orders come from.
- **Shop home:**
  - The navy welcome banner becomes a one-line greeting ("Dev Restaurant A · prices ex VAT"), so products start on
    the first screen.
  - On phones, products show as **list rows**: 56px photo, name and size, price, stepper and Add in one row. That is
    about 88px per item instead of about 400px. Cards stay from tablet width up.
  - Remove the "Browse by category" block that repeats the chips.
  - The active chip scrolls into view.
  - Counts follow the search.
  - The header search keeps the query on results pages.
- **Product page:**
  - Smaller image (16:9 on phone, at most 420px on desktop).
  - The category name once, not three times.
  - Quantity and Add inside the price card.
  - The price table only when there are two or more sizes.
  - **"Ask for a price on WhatsApp"** on "Price on request" products, pre-filled with the product name.
  - "3 in your basket" shown next to Add.
- **Basket:**
  - A sticky bar on phones, "Total £166.80 · Checkout", that takes you to the form.
  - On desktop the sticky column holds only the summary and **Place order (red)**. Delivery date, terms and the note
    move under the items, so the button is always visible.
  - The free-delivery bar is navy, then turns green once delivery is free.
  - 0% VAT lines are hidden.
- **Orders:**
  - Rows show the item count and first items.
  - A "Placed" vs "Ordered" label clean-up.
  - A compact 4-step tracker per delivery: Placed, With supplier, Out for delivery, Delivered.
  - **(+feature) "Order again"** on the order list and the order page. It copies the lines into the basket through a
    server action, re-priced at today's prices.
- **Order confirmed:** one green tick and the heading "Order placed", with the reference below. The panel-in-panel goes.
- **Invoices:**
  - A proper table on desktop: Invoice, Order, Issued, Due, Total, Left to pay, Status, PDF.
  - Compact rows on phone.
  - Shows the due date and the amount left.
- **Account:** no navy band. Details in one card. "Change password" sits behind a button.
- **Shell:**
  - Skip link.
  - Scroll padding for the sticky header.
  - Navs labelled correctly.
  - No 11px labels.

### Phase 14.2: Public site and sign-in (M)
- **One account call to action everywhere.** "Open a trade account": red, one shape. Only the phone header says
  "Register".
- **Home:**
  - Calmer hero with normal tracking; the search placeholder uses the real product count, not a hard-coded "800+".
  - Value strip with no orphaned words.
  - Category tiles all use photos, or all use the same navy icon. No mixing.
  - "How it works" uses numbers *or* icons, not both.
  - The red closing band loses its circles.
  - No eyebrows.
- **Phone header:** add catalogue/search access. Today phones cannot reach the catalogue from the header.
- **Catalogue:**
  - Neutral price notice.
  - A quiet "Trade price" line on cards instead of a "Register to see price" pill on every card.
  - The active category is visible on phone.
  - Zero counts are muted.
  - A proper "no more products" state for a page past the end.
  - One count source: header count vs grid total, to check against the cache.
- **Product (public):** neutral bullets for pack sizes; the current green ticks wrongly suggest "in stock". The same
  breadcrumb as the catalogue.
- **Sign-in pages:**
  - Titles match the state: "Check your email", "Link expired".
  - Error summary on register, with focus moved to it.
  - WhatsApp help button that doesn't wrap.
  - "Send again" on forgot-password.
  - Contact buttons on account-disabled and 403.
- **Legal pages:**
  - Tabs that scroll on phone.
  - "On this page" box.
  - One left edge.
  - The trading-name line only in the footer.

### Phase 14.3: Admin shell and daily work (M)
- **Sidebar:**
  - "Payments" in one line.
  - Tighter spacing, so Audit log and Settings fit on a laptop screen.
  - 13px group labels.
  - Remove "Pricing". It only redirects to Customers; per-restaurant pricing stays on the customer page.
- **Phone:** a top bar with a "Menu" sheet (grouped nav) instead of the sideways strip that hides where you are.
- **Dashboard:**
  - "Before you go live" becomes a one-line banner ("5 setup tasks · Review") instead of 400px at the top.
  - The money figures come first, in ink colour, with status in the hint text.
  - Tiles are clickable.
  - One "Chase today", not two.
  - The title becomes "Dashboard · Fri 17 Oct".
- **Orders list:**
  - The standard filter bar.
  - Columns ordered Order, Restaurant, Placed, Delivery, Status, Payment, then the money columns grouped on the
    right: Total, Owed, Profit.
  - Payment badges on phone too.
- **Order detail:**
  - The summary first.
  - "Edit order" behind a button. Today it is always open, about 500px.
  - Totals once, as the footer of the lines table.
  - On phone, payment and chasing come straight after the summary.
  - One supplier-pay action.
  - "Cancel order" separated from the other buttons and styled as a quiet danger action.
- **Payments:**
  - "To pay suppliers" grouped by supplier, with a subtotal and "Mark paid".
  - The word "Overdue" shown, not just red text.
  - Right-aligned "Remind".
- **Invoices:** standard table and filter.

### Phase 14.4: Admin customers, approvals, users, pricing (M–L)
- **Customers list:**
  - Columns that matter: Owed, Last order, Orders. **(+feature)** These need a small summary query.
  - One "Add customer" button, navy. Today there are two, and one is red.
  - One name for them throughout: "Restaurants".
- **Customer page:**
  - A summary first (balance, overdue, last order, recent orders) **(+feature: read-only query)**.
  - Details shown read-only, with an "Edit" button.
  - Shared tabs.
  - A single-column category list.
  - "Save notes" as a secondary button.
- **Pending customer:**
  - A full-width approval panel at the top.
  - One "Approve account" button.
  - "Reject…" opens a dialog that asks for the reason.
  - Remove the invalid ARIA on the toggle.
- **Approvals:** the standard table, with "Review" at the end of each row.
- **Users:**
  - "Invite someone" opens a dialog, instead of a form filling the first screen.
  - Neutral role badges.
  - Rows link to the business.
- **Pricing workbench:**
  - **One table with fixed columns**, so Cost, Their price and Fixed price line up across products.
  - Shared controls.
  - "15% default" shown as text, not as a placeholder that looks like data.
  - Stacked layout on phone.

### Phase 14.5: Admin catalogue, import, settings, system (M–L)
- **Products:**
  - One primary button ("New product") plus an "Import / export" menu.
  - "No photo" as quiet text; amber only for "Needs price".
  - Active filters shown as removable chips.
- **Product edit:**
  - **One sticky "Save changes" bar** instead of three separate saves.
  - Cost right-aligned with £.
  - The photo drop-zone.
  - Readable labels in the "Record" card.
- **Categories:**
  - Only "Hidden" is flagged, not "Visible" on every row.
  - Numbers right-aligned.
  - "Add category" from the page header.
  - "1 product" grammar.
  - Quiet danger button for Delete.
- **Import CSV and import costs:**
  - Steps shown: 1 File → 2 Preview → 3 Import.
  - Preview grouped by category, with a "New only / All" toggle.
  - **A sticky "Import 58 products and 66 sizes" bar.** Today the 58-row preview is about 5,400px with the button
    only at the top.
  - A legend for new vs existing.
  - No seed-specific defaults ("Shrivi").
- **Settings:**
  - A sticky Save bar.
  - Section index: Prices, Delivery, Business.
  - Empty fields with placeholders, instead of stored "[VAT number]" values.
  - Fields that apply to one option only show when it is chosen.
- **Emails, Security, Audit:**
  - A real skeleton for Security, which today shows a table skeleton.
  - Hide "Try 0 failed again".
  - Readable field names in the audit log: no `next_chase_date` or `revoked_at`.
  - Audit rows grouped by day.
  - Technical setup notes behind "Show details".

### Phase 14.6: Supplier portal and driver page (M)
- **Supplier:**
  - The header fits a phone: logo mark, icon sign-out.
  - Notifications in a blue tint, not red.
  - "Mark all read" as a link.
  - Counts on the tabs.
  - **Only the next step is offered** (Accept, then Out for delivery, then Delivered), with a small progress line.
  - Shared buttons for WhatsApp and Text.
  - Phone numbers and dates never break mid-number.
- **Driver (phone, one hand):**
  - The logo in the header.
  - Navy step numbers that turn into green ticks.
  - 44px remove buttons.
  - **A sticky Submit bar** that says what's missing ("Add a photo to submit").
  - Ink-coloured signature on white with a visible border.
  - One plain style for the invalid and expired link pages.

### Phase 14.7: Finish (S–M)
- An accessibility sweep: focus order, contrast, labels, reduced motion.
- Motion review with the `review-animations` skill.
- Loading skeletons that match each page.
- The full browser test suite.
- A fresh set of 390px and 1280px screenshots of every screen for the owner.
- Update `HANDOVER.md`, `DECISIONS.md` and the `/styleguide` pages.
- Then a live check on www.wholesalestreet.co.uk after deploy.

## 4. Order, size and risk

| Phase | What | Size | Risk |
|---|---|---|---|
| 14.0 | Foundations | M | Touches shared components: run the full test suite, compare screenshots |
| 14.1 | Restaurant shop | L | "Order again" is the only new server logic |
| 14.2 | Public + sign-in | M | Low |
| 14.3 | Admin shell + daily | M | Phone menu sheet is new |
| 14.4 | Customers, pricing | M–L | Two read-only summary queries |
| 14.5 | Catalogue, import, settings | M–L | One save bar for product edit means merging two forms |
| 14.6 | Supplier + driver | M | Low |
| 14.7 | Finish | S–M | Low |

The total is roughly 8–10 working days of agent time. Phases 14.0 and 14.1 give the biggest visible change, because
14.0 alone fixes every admin table, badge and button.

## 5. Defaults I've chosen (say if you disagree)
1. One font: Inter only, dropping Plus Jakarta Sans.
2. Red means buy and danger. "Place order" becomes red. Admin "Invite a customer" becomes navy.
3. The 11-colour category tints go: one neutral style.
4. The logged-in shop loses its navy welcome banner.
5. The admin "Pricing" menu item goes. It is a duplicate of Customers.
6. The three **(+feature)** items stay in: Order again, customer summary columns, and the customer account summary.

## 6. Not design, found along the way
- **Real bugs:**
  - `cn()` without `tailwind-merge` (fixed in 14.0).
  - "1 products" plurals on the shop, category edit and home.
  - "1 of 4 sizes still have no cost".
  - The link-expired notice points to a "link below" that does not exist.
  - The reset-expired title contradicts its panel.
- **To check:** the public catalogue header count against the grid total. One phone shot showed "3 products" over
  "1–24 of 888". This is probably a stale local cache, to be confirmed in 14.2.
