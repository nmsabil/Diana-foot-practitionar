# Diana Mobile Footcare — project notes

Marketing site for Diana Scuckaite, a mobile foot health practitioner (MCFHP MAFHP, SMAE Institute) in Wembley Park, London. Single static page, no framework, no backend. Built by Sabil Digital under a £45/month subscription (domain, hosting, security, monthly updates).

Live business facts (verify with the client before changing): WhatsApp/phone `+44 7946 384779`, £40 flat rate for a ~45 min home visit, £10 travel charge beyond a 5-mile radius, cash or bank transfer only, DBS checked, fully insured. Only 3 named reviews are real (Shiobhann M., Adam Nasir, Muna Rai) — never invent more, and never fabricate a Google review count/rating, since no public one exists yet.

## Stack

Plain HTML + SCSS (Dart Sass) + vanilla JS. No build framework, no bundler beyond Sass/Terser. Every third-party library is **self-hosted** in `vendor/` rather than loaded from a CDN — see [Third-party libraries](#third-party-libraries) below.

## Folder structure

```
index.html            the entire page
styles.css            compiled output (committed — no CI build step)
script.js             compiled output (committed)
scss/                 source, one partial per section + shared base/tokens
scripts/main.js       source for script.js
vendor/               self-hosted third-party libraries (see below)
images/               real photos + logo + favicon, see naming convention below
images/stock/         unprocessed stock photos kept for future use, not deployed
robots.txt, sitemap.xml
package.json          npm scripts only, no runtime deps
```

## Build

```
npm run build       production build: compressed CSS, minified JS (what should be live)
npm run build:css   expanded CSS + sourcemap, for local dev
npm run build:js    minify scripts/main.js -> script.js
npm run watch       build:css on file change
```

There's no dev server script — for local preview, run `python3 -m http.server` (or any static server) from this folder. **Always run `npm run build` (not just `build:css`) before considering a change done** — `styles.css`/`script.js` are committed, and the production versions are what actually ships.

## Design tokens

All in `scss/_base.scss` / `scss/_variables.scss`:
- Colours: `--color-primary*` (sage green), `--color-bg`/`--color-card` (warm parchment/cream), `--color-ink*`. Two flat background tones (`--color-primary-light` sage, `--color-card` cream) are used deliberately to give alternating sections contrast against each other — check which one a section's neighbours use before picking a background for a new one.
- Spacing scale: `--space-1` through `--space-24`, **not every integer exists** (jumps `--space-6` (24px) straight to `--space-8` (32px), no 7/9/11/etc.) — a reference to a token that doesn't exist silently drops the whole CSS declaration rather than erroring, which caused a real bug once. Check `_base.scss` before using a `--space-N` value.
- `respond($bp)` mixin (`_variables.scss`) is **min-width** (mobile-first) — content inside only applies at that width and up. Breakpoints: `$bp-sm` 36rem, `$bp-md` 48rem, `$bp-lg` 64rem, `$bp-xl` 75rem.
- `--ease-out: cubic-bezier(0.16,1,0.3,1)` — the one easing curve used everywhere (hover states, toggles, reveal animations) for a consistent "decelerate hard, settle gently" feel.

## Scroll-reveal animation system

Built on **AOS** (Animate On Scroll, self-hosted in `vendor/aos/`) for the observe/time/stagger engine, but with **entirely custom animation values** — never AOS's own built-in fade/zoom effects, which are opacity-based.

**Why not opacity:** an `opacity:0` starting state is fully invisible until AOS's observer fires from genuine scrolling. That's fine in a browser, but breaks completely for a full-page screenshot, print/PDF export, or anything that renders the page without actually scrolling — a real bug hit earlier in this project ("blank sections"). Every reveal here animates `transform` only, so the worst case (JS never fires) is content sitting slightly offset, not invisible.

Four custom `data-aos` names, defined in `_animations.scss` / `_hero.scss`:
- `pop-up` — single-column content and repeating cards, slides up from `translateY(80px)`.
- `pop-side-left` / `pop-side-right` — the two halves of a genuine two-column layout (About, Pricing, Contact). Bottom-up on mobile (still one stacked column there); slides in from **fully off-screen** (`translateX(∓100vw)`) once the layout is actually two columns (`$bp-lg`+).
- `pop-hero-left` — hero content only, always slides in from fully off the left edge, at every breakpoint.

**The 100vw off-screen distance is only safe because the sections that use it have `overflow-x: hidden` (or `overflow: hidden` for `.hero`)** — confirmed by testing that `transform` genuinely does trigger real horizontal scroll if nothing clips it. Don't reuse this scale of offset on a new section without adding that containment first.

**Three independent fallbacks** keep content from ever getting stuck off-screen — each was tested, not assumed:
1. `.no-js [data-aos] { transform: none; }` — JS disabled entirely.
2. `@media (prefers-reduced-motion: reduce)` — belt-and-suspenders alongside AOS's own `disable` option.
3. In `scripts/main.js`: if `window.AOS` doesn't exist (vendor file missing/broken), every `[data-aos]` element is immediately marked revealed.

If this system is touched again, re-verify all three.

## Third-party libraries

Everything is self-hosted in `vendor/` — no CDN requests except the Google Maps iframe embed in Contact (a live service, not a static library, so it can't be self-hosted).

```
vendor/aos/       AOS 2.3.4 (aos.css, aos.js)
vendor/jquery/    jQuery 3.7.1 (jquery.min.js) — only needed by Slick
vendor/slick/     Slick Carousel 1.8.1 (slick.min.css, slick.min.js)
vendor/fonts/     Fraunces + Atkinson Hyperlegible, self-hosted from Google Fonts
  fonts.css       @font-face rules pointing at files/
  files/*.woff2   latin + latin-ext subsets only (vietnamese/cyrillic dropped — not needed for this audience)
```

jQuery + Slick are lazy-loaded (see `scripts/main.js`, `lazyLoadReviewsCarousel`) — fetched proactively after `window.load` via `requestIdleCallback`, not on the critical rendering path, since they're only needed once the reviews carousel is near view. AOS and the fonts load eagerly since they affect above-the-fold content.

**To update any of these**, re-download the file and drop it in place at the same path — nothing else needs to change unless the library's own file names change.

## Image naming convention

`images/` uses descriptive kebab-case names, `{subject}-{context}.{ext}`, always shipped as a `.jpg`/`.png` fallback + matching `.webp` (same basename):

```
diana-portrait                the About/Pricing headshot (green scrubs, NHS badge)
hero-foot-treatment            hero background (gloved hands mid nail-trim)
logo                           brand logo (footprint mark + wordmark)
nhs-colleagues-corridor        Services training-badge photo (large hospital corridor group)
nursing-team-dinner            About collage — nursing-years dinner photo
nursing-team-hospital          About collage — nursing-years hospital group photo
smae-membership-card           Services "who this helps" credential photo
favicon                        .svg only, no webp needed
```

`images/stock/` holds 5 unprocessed Pexels photos kept for possible future use (credited `pexels-<photographer>-<id>.jpg`) — not referenced anywhere currently. If used, resize + convert to webp first like every other image here, and rename to match this convention.

**Every photographic `<img>` uses `<picture><source type="webp">` + a JPEG `<img>` fallback.** Decorative CSS backgrounds (hero) use webp only, no fallback. When replacing an image, always regenerate both the fallback and the webp from the same source — a stale webp silently wins over an updated fallback in `<picture>`, which has caused real "I updated the photo but nothing changed" confusion before.

## Testing

No automated test suite — verification is a manual Playwright pass (real Chrome via `channel: 'chrome'`, not bundled Chromium) run after any structural change:
- **Overflow sweep**: no horizontal scroll at any width from 320px to 1920px.
- **Functional pass**: mobile nav open/close/Escape, FAQ accordion (click + keyboard), console error check.
- **Accessibility check**: `prefers-reduced-motion` respected, keyboard tab order, FAQ keyboard toggle.
- Visual screenshots at a few key breakpoints for anything touching layout.

There's no CI — this is a manual discipline for whoever's working on the site, not enforced automatically. Re-run all of the above before calling any change done, and always test against the actual `npm run build` output at least once (dev CSS and production CSS are close enough to usually match, but "actual build works" is the only claim worth making).

## Known gotchas (don't relearn these the hard way)

- `.about-media { position: sticky }` must stay scoped inside `$bp-lg`+ — unconditional sticky pins the photo on top of scrolling text on a single-column mobile layout.
- Reveal animations: transform-only, never opacity (see above).
- Slick carousel methods called right after `.slick()` init can silently no-op — bind to Slick's own `init` event instead.
- `background-size: X% auto` ties an image's height to a width percentage, not the element's real height — use a dedicated pseudo-element sized via `top/right/bottom` + explicit width, `background-size: cover`.
- A child pseudo-element with `z-index: -1` disappears if its parent gets an explicit `background-color` (the parent becomes a stacking context and paints in front of it).
- A `var(--space-N)` reference to a token that doesn't exist silently drops the whole declaration rather than erroring — always check `_base.scss` first.
- No Google Maps API key is configured — the coverage "boundary" on the Contact map is a decorative dashed SVG ellipse, not a real geographic shape. Keep it captioned as approximate.

## Open items (need real answers from the client, never fabricate)

- No email address anywhere on the site (WhatsApp + phone only) — fine for the core audience, worth asking if that's intentional.
- No Google Business Profile link — if one exists, add it to the JSON-LD (`sameAs`) and consider a visible link, so the 3 testimonials can be backed by a real public review count.
