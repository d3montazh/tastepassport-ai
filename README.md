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
- Agent strategy panel showing how the route is being adapted
- Interactive **More like me** replacement for a single stop
- Interactive **Surprise me more** replacement for a single stop
- Single-stop adaptation without rebuilding the rest of the route
- Responsive dark UI for desktop and mobile
- Public Vercel deployment
- Transparent fallback Demo Mode while API access is unavailable

## Agentic interaction

TastePassport is not just a one-shot recommendation list.

After the initial route is generated, the user can adapt individual stops:

- **More like me** pulls one stop closer to the strongest taste signals.
- **Surprise me more** widens the discovery radius for one stop.

The rest of the day remains intact, so the agent is making a targeted plan revision rather than regenerating everything from scratch.

## Qloo integration

The backend is designed around the Qloo Insights API. With a valid key configured, the app calls Qloo for destination-aware cultural recommendations and maps the results into the route experience.

Environment variables:

```env
QLOO_API_KEY=your_key_here
QLOO_BASE_URL=https://api.qloo.com/v2
```

API keys are never committed to the repository.

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
    recommend/   # builds the main route
    replace/     # adapts a single stop
  page.tsx       # interactive client experience
  globals.css
  enhancements.css
```

## Run locally

```bash
npm install
```

Create `.env.local`:

```env
QLOO_API_KEY=your_key_here
QLOO_BASE_URL=https://api.qloo.com/v2
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
