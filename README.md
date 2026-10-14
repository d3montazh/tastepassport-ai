# TastePassport AI

**TastePassport AI** is an agentic cultural discovery experience built for the **Qloo Agentic Hackathon 2026**.

Instead of asking “what is popular in New York?”, TastePassport asks a more personal question:

> **What is the New York equivalent of my taste?**

A user gives a few signals from their real cultural identity — music, movies, fashion, food, places — and TastePassport translates those signals into a personalized morning-to-night route in another city.

## Live demo

- **App:** https://tastepassport-ai.vercel.app
- **Repository:** https://github.com/d3montazh/tastepassport-ai

The public deployment currently supports a transparent **Demo Mode** when no Qloo API key is configured. As soon as `QLOO_API_KEY` is added in the deployment environment, the app switches to live Qloo-backed recommendations automatically.

## Why this is different

Most travel recommendation products rank what is generally popular. TastePassport instead tries to preserve the user's cultural identity across locations.

Example:

- Origin: **Kyiv**
- Destination: **New York**
- Taste DNA: **Travis Scott, Interstellar, Stone Island, Japanese food**

The agent turns that into a sequenced cultural route and explains the **taste bridge** behind each stop.

## Current features

- Cross-domain **Taste DNA** input
- **Taste translation** from one city into another
- Discovery modes: **Safe / Balanced / Unexpected**
- Morning-to-night route sequencing
- Per-stop **Taste Bridge** explanations
- Per-stop **Route Fit** score
- **Taste Translation Map** connecting user taste signals to the generated route
- Cinematic multi-stage generation feedback while the agent builds the route
- Agent strategy panel showing how the route is being adapted
- Interactive **More like me** replacement for a single stop
- Interactive **Surprise me more** replacement for a single stop
- Single-stop adaptation without rebuilding the rest of the route
- **Natural-language full-route refinement** such as “Make it less touristy”, “More fashion-focused”, “Make it cheaper”, or “More nightlife”
- Full-route refinement preserves the time structure while rebalancing the day around the user’s instruction
- Responsive dark UI with scroll motion and cursor-reactive Taste DNA visualization
- Mobile-specific layout polish for the builder, loading flow, route cards, Taste Map and agent controls
- **Build another passport** action after the generated route
- Public Vercel deployment
- Transparent fallback Demo Mode while API access is unavailable

## Agentic interaction

TastePassport is not just a one-shot recommendation list.

After the initial route is generated, the user can adapt individual stops:

- **More like me** pulls one stop closer to the strongest taste signals.
- **Surprise me more** widens the discovery radius for one stop.

The user can also talk to the full route in plain English. Prompts such as **“Make it less touristy”**, **“More fashion-focused”**, **“Make it cheaper”**, or **“More nightlife”** rebalance the whole day while preserving the route’s morning-to-night structure and the original Taste DNA.

This creates two levels of control: targeted single-stop changes and higher-level whole-route direction.

## Explainability

TastePassport is designed to show more than a recommendation list. The **Taste Translation Map** visualizes how individual taste signals connect to route stops, while Taste Bridges and Route Fit scores explain the relationship at the stop level.

## Qloo integration

All three backend routes call the Qloo Hackathon server at `https://hackathon.api.qloo.com`. The shared server client resolves taste names with `GET /search`, then sends the resolved IDs to `GET /v2/insights` with the destination filter. The API key is sent only in the `X-Api-Key` header; it is never returned to the browser or logged. The old `QLOO_BASE_URL` setting is no longer used.

Requests have a 12-second overall deadline. Initial recommendations can use a labeled demo response when live data is unavailable. Replacement and refinement instead preserve the submitted items unchanged on missing credentials, upstream failures, empty or insufficient results. These responses set `meta.changed: false` and `meta.fallback: true`, omit new source/strategy claims, and include a localized explanation. The browser keeps the existing route and its metadata. Successful adaptations set `meta.changed: true`. Replacement excludes existing stop names; refinement requires enough distinct results and never repeats one live result to fill the day.

Refinement recognizes the existing English, Russian, Ukrainian, Spanish and Chinese intent patterns. It translates budget and less-touristy requests into price/popularity filters and resolves category names through `/v2/tags`, using the API's `id` field and matching place tags rather than same-name media tags. Fashion uses the concrete Clothing store category and nightlife uses Night club; generic Fashion/Nightlife tags returned empty place results during live verification. Equivalent place tags are combined with a union. Unsupported instructions and unavailable category tags preserve the existing route and explain that no change was made. This is deterministic intent matching, not general LLM understanding. Live affinity percentages are shown only when Qloo returns a finite explicit affinity field; they are an index, not the probability someone will enjoy a stop. Demo venues never receive synthetic scores. Suggested visit times are **not verified opening hours**; road travel requires a separately configured OSRM-compatible provider.

The client retries a 429, 502, 503 or 504 response at most once, respecting `Retry-After` when supplied and the overall 12-second deadline. If recovery is not possible within that deadline, existing routes remain unchanged.

Environment variables:

```env
QLOO_API_KEY=your_key_here
# Qloo server: https://hackathon.api.qloo.com (fixed server-side)
```

API keys are never committed to the repository.

### Vercel setup

1. Open the `tastepassport-ai` project in the `taste-passport` Vercel team, then **Settings → Environment Variables**.
2. Add `QLOO_API_KEY` with your hackathon key, enable **Sensitive**, and select **Production** (and **Preview** if you want live preview testing). Do not use a `NEXT_PUBLIC_` prefix or paste the key into source files, issues, or logs.
3. Deploy the integration branch for preview testing, or merge it and deploy production. After changing the variable, use **Deployments → Redeploy** on a deployment containing the integration changes. Existing deployments do not pick up new environment values.
4. Generate a route, replace a stop, and refine the route. Successful live responses report `meta.source: "Qloo Insights API"` and `meta.fallback: false`. A demo label indicates fallback, not a verified live connection.

See [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables) and [sensitive variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables).

### Verification

Run `npm ci`, `npm test`, and `npm run build`. Tests mock Qloo and cover all three routes, five fallback locales, live request parameters, replacement exclusions, refinement slot preservation, missing credentials, empty/insufficient results, invalid requests and upstream failures. A real-key smoke test must be run separately after configuring the environment.



### Route evidence audit and OpenStreetMap (October 2026)

The route result now includes a **Data about route / Дані про маршрут** panel.
It displays the number of live Qloo stops, demo placeholders, stops with explicit
numeric Qloo affinity, and stops with usable coordinates. This is evidence
**coverage**, not the quality of personal recommendations or a satisfaction
probability. The server also supplies `meta.audit` and a generic
`meta.fallbackReason` for the initial recommendation response; the upstream
client deliberately does not expose auth failures or secret error bodies.

When at least two stops have coordinates, the user can choose **Show
OpenStreetMap**. Map tiles load only on click, with attribution; this may
disclose the requested viewport to the OSM tile service. There are no
bulk-prefetch or offline tile functions. Without a separate routing provider
the blue dotted line is **straight-line connectivity**, not a road route.

Optionally configure an OSRM-compatible HTTPS server you operate, or one
explicitly licensed for your production use:

```env
ROUTING_OSRM_BASE_URL=https://your-routing-provider.example.org/
```

The backend validates coordinates and timeouts, and refuses the public
OSRM demonstration hostnames as Production backends. Without this variable
`/api/road-route` responds with `routing_not_configured`, and the map remains
useful with markers and straight-line connections. With a configured provider,
the returned route is **driving**, not walking, and is never proof of current
traffic conditions or of venues being open. [OSRM HTTP API](https://project-osrm.org/docs/v5.24.0/api/#route-service)

The Qloo production credentials are not available in GitHub Actions. Unit
tests use mock Qloo data and cannot confirm *live* API outcomes; to audit
production, generate routes in New York, Paris and Berlin and compare the new
evidence counters, Qloo percentage availability and exact addresses. Do not
log raw user taste profiles or API keys.

For OSM tiles, adhere to the [OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/).
The public OSRM demo service is not a capacity-guaranteed production provider.

## Tech stack

- **Next.js**
- **React**
- **TypeScript**
- **Qloo Insights API**
- **Vercel**

## Project structure

```text
app/
  api/
    recommend/       # builds the main route
    replace/         # adapts a single stop
    refine/          # refines the full route from a natural-language instruction
  page.tsx           # interactive client experience
  scroll-effects.tsx # reveal motion + cursor interaction
  results-actions.tsx# build-another-passport results action
  globals.css
  enhancements.css
  animations.css
  cursor-blob.css
  taste-map.css
  mobile-polish.css
```

## Run locally

```bash
npm install
```

Create `.env.local`:

```env
QLOO_API_KEY=your_key_here
# Qloo server: https://hackathon.api.qloo.com (fixed server-side)
```

Then run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Hackathon goal

TastePassport explores a simple idea: **taste can travel**.

The long-term direction is to make the agent understand not just what a person likes, but how adventurous they want to be, which parts of their identity they want preserved, and which parts they want challenged when entering a new city.

## License

MIT
