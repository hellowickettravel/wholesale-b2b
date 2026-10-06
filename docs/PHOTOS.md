# Photos: slots, licensing, shot list

Every place a real photograph can go has a name (a "slot") in `src/config/photos.ts`. A slot without a photo shows a shelf-colour ground, so the site looks finished with none, some or all of them filled. Adding a photo needs no code change.

## How to drop a photo in

1. Pick the slot from the shot list below (the slot id is the file name).
2. Export the photo as `.webp` (or `.avif`, `.jpg`, `.png`), at least the stated width, about 2400 px wide for full-width slots, quality 78 to 82, no metadata (phone GPS and camera serials must be stripped; every export tool has a "remove metadata" option).
3. Save it as `public/images/stock/<slot id>.webp`, for example `public/images/stock/category-rice.webp`.
4. Add the `credit` entry to that slot in `src/config/photos.ts` (author, source URL, licence, licence URL, retrieved date). Owner's own photos: `{ author: "...", licence: "owner-supplied" }`.
5. Check it on the page at phone and desktop width; commit.

The `<Photo slot="...">` component (`src/components/brand/photo.tsx`) looks in `public/images/stock/` when the page renders (`hasPhoto` / `hasStockPhoto` give the same answer to other code), crops with `object-fit: cover` around the slot's focal point, and serves it through `next/image` (resized per device, AVIF/WebP, lazy except the hero). A dropped-in file beats the bundled stand-in. Replacing a photo is replacing the file. Never rename a slot id once a file exists.

Slots marked "bundled" already show a photo that is in the repo (the owner's spice bowls). There is no build script: `next/image` does the resizing at request time, and `sharp` is not a declared dependency, so a conversion script was not added. If the owner later wants one, run `npm i -D sharp` first.

Hosting note: the check uses the file system at render time. Pages that render at build time pick files up on the next build. For pages regenerated on the server (the home page revalidates hourly), make sure `public/images/stock/**` is included in the server bundle (`outputFileTracingIncludes` in `next.config.ts`) or the fallback will show in production even though the file exists.

## Licensing rules

1. Allowed sources: the owner's own photography, commissioned photography, and Unsplash or Pexels (Pixabay or Wikimedia only where that individual file is CC0 or Pixabay-licensed). No Google Images, no stock previews with watermarks.
2. Unsplash and Pexels do not require attribution. We record the credit anyway (author, URL, licence, date): it is the owner's audit trail. Read the licence page on the day you download; licences change.
3. No implied endorsement. Prefer photos with no people. Hands, backs of heads and silhouettes are fine. No identifiable face unless the photo page states a model release, and never on error, disabled or rejected screens.
4. No visible brands, logos, trademarks, shop signs, barcodes, readable prices or packaging text in any language we cannot vouch for. Choose another frame; do not clone out logos.
5. Do not use a photo as part of the business name, logo or wordmark, and do not resell or redistribute unaltered files.
6. Self-host only. Never hot-link a stock site and never add one to `images.remotePatterns` or a CSP.
7. Delivery proof photos and customer uploads are never marketing imagery.
8. Photos never carry text or a tint. Words go on an enamel plate beside or over the photo, never baked into it.
9. Already in the repo and not to be shown on public pages: `public/images/categories/pulses-nuts-and-groceries.webp` (identifiable people, price tags) and `public/images/categories/whole-spices.webp` (foreign-language labels). The shelf tile code ignores them; replace them through the slots below. `powders-and-ground-masala.webp` is used (it is low resolution, so replace it when you can).

## Alt text

Photos that carry meaning get a short description of what is seen (no "image of"). Photos beside a heading that already says it (category tiles, the auth panel, bands) are decorative: empty alt, hidden from screen readers. That is set per slot (`decorative`). Never put prices, offers or calls to action in alt text.

## Shot list (16 photos)

Technical spec for all: warm daylight, honest and a little imperfect (a working kitchen or stockroom, not a lifestyle blog), saturated food colours, no teal-and-orange grade, no heavy HDR, no filters, no marble-and-eucalyptus styling. Landscape unless stated. Search queries are written for Unsplash and Pexels tagging and are untested.

| # | Slot | Subject | Composition | Search queries | Avoid |
|---|---|---|---|---|---|
| 1 | `home-hero` (3000 px wide, 16:9; phone crops to the middle) | An open sack of basmati rice with a steel scoop mid-lift on a worn wooden counter, bowls of dal soft behind | Subject right of centre, calm space on the left where the plate hangs over it; slightly above eye level | `basmati rice sack scoop`, `rice grains wooden counter`, `indian grocery sack` | Branded bags, white studio, western cereal look. Bundled now: owner's spice bowls |
| 2 | `auth-side` (portrait 3:4, 1600 x 2400) | Hands tossing spices in a wok, steam, dark and warm | Vertical, subject in the lower half, upper third dark | `wok tossing spices flame`, `chef hands cooking indian kitchen`, `tadka spices pan` | Faces, aprons with names, anything that reads as dangerous. Bundled now: spice bowls crop |
| 3 | `home-abundance` (21:9, 2400 x 1000) | Overhead mosaic of bowls of spices, dals and seeds, edge to edge | Flat overhead, many colours | `spice bowls overhead`, `colorful spices market`, `indian spices flat lay` | Reusing the hero photo (the band only appears once this file exists) |
| 4 | `category-rice` | Long-grain basmati in a scoop, grains spilling | Close, grains on the diagonal, backlit | `basmati rice scoop`, `rice grains macro`, `rice in sack` | Cooked rice, sushi, branded packs |
| 5 | `category-pulses-nuts-and-groceries` (replaces the market photo) | Small bowls of toor, masoor, chana and moong, a few almonds and cashews | Overhead or 45 degrees, even spacing | `lentils bowls overhead`, `dal chana toor bowls`, `pulses legumes variety wooden` | Market stalls, people, price tags, handwriting, tins |
| 6 | `category-whole-spices` (replaces the souk photo) | Cinnamon, star anise, cardamom, cloves and pepper in small dark bowls | 45 degrees, dark wood, tight, shallow depth | `whole spices bowls dark`, `star anise cardamom cinnamon`, `indian whole spices` | Market scenes, labels in any language, branded jars |
| 7 | `category-powders-and-ground-masala` (upgrade, optional) | Spoons of turmeric, chilli and masala on wood | Overhead, reduce the orange cast | `masala powder spoons`, `turmeric chilli powder bowls`, `ground spices wooden spoon` | The current file is only 960 px wide |
| 8 | `category-flours-atta-and-rava` | Wholemeal atta in a bowl, rolling pin, a dough ball on a floured board | Overhead 4:3, soft white light | `atta flour wooden board`, `wholemeal flour bowl rolling pin`, `chapati dough flour` | Bread loaves, branded flour bags |
| 9 | `category-tea-powders-and-milk-mix` | Loose black CTC tea in a scoop, a steel cup of chai beside it | Close, scoop in focus, warm and low-key | `black tea leaves scoop`, `masala chai cup`, `loose tea wooden` | Tea-bag boxes, latte art, cafes |
| 10 | `category-sauces` | Three small bowls of chutney: mint, tamarind, chilli | Overhead or 45 degrees, bowls on a diagonal | `indian chutney bowls`, `tamarind mint chilli sauce`, `condiments bowls spoons` | Branded bottles, plated meals |
| 11 | `category-food-colours` | Pigment bowls: saffron, turmeric, beetroot and spinach powder | Overhead rows, high-key | `natural food colouring powders`, `saffron strands bowl`, `turmeric powder colorful` | Branded dye packs, Holi crowds |
| 12 | `category-restaurant-groceries` | A crate of onions, ginger, garlic and chillies | 45 degrees, tight, crate edge cropped | `onions garlic ginger chillies crate`, `fresh produce basket kitchen`, `vegetables wooden crate` | Supermarket shelves, readable stickers |
| 13 | `category-drinks` | Tall glasses of mango lassi and lime soda with ice | Side-on, condensation, plain backdrop | `mango lassi glass`, `lime soda ice glass`, `indian cold drinks` | Cans or bottles with brands, alcohol |
| 14 | `category-restaurant-packing-and-cleaning` | A stack of plain kraft takeaway boxes, paper bags and a roll of kraft paper | Straight on, stack centred | `kraft takeaway boxes stack`, `paper bags kraft`, `food packaging containers` | Printed logos, cleaning bottles with labels |
| 15 | `home-dry-store` (future, not wired yet) | A tidy stockroom: shelves and pallets of sacks and cartons | One-point perspective down an aisle, room top-left | `warehouse shelves sacks`, `food wholesale storeroom`, `dry goods storage shelves` | Forklifts with names, branded cartons, faces |
| 16 | `home-delivery` (future, not wired yet) | Hands setting a carton and a rice sack on a restaurant back-door step | Tight, hands only, 3:2 | `delivery boxes restaurant kitchen back door`, `chef receiving delivery crates`, `carrying sack of rice` | Vans with logos or plates, faces, uniforms with names |

Do 1, 2, 5 and 6 first: they replace the weakest or missing images on the busiest pages. Slots 15 and 16 are not in the manifest yet: add an entry to `PHOTO_SLOTS` and place a `<Photo>` when they are wanted.

## Adding a slot

1. Add an entry to `PHOTO_SLOTS` in `src/config/photos.ts` (id, alt or `decorative`, ratio, focal point, optional `ground` for the fallback colour).
2. Put `<Photo slot="your-id" className="..." />` where it belongs. Use `fallback="none"` for bands that should only exist once there is a photo.
3. Add a row to the shot list above.
