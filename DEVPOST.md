# TastePassport AI — Devpost Submission Draft

## Tagline

**Translate your taste into a city.**

TastePassport AI turns the music, movies, fashion and food you already love into a personalized cultural route in another city — then lets you reshape that route without losing your original Taste DNA.

## Inspiration

Travel recommendations are usually built around popularity: top restaurants, top attractions, top neighborhoods.

But people do not experience cities as generic tourists. They arrive with a cultural identity already shaped by music, films, fashion, food and places they love.

We wanted to build an agent that answers a different question:

> If this is my taste at home, what does that taste look like somewhere else?

That became TastePassport AI.

## What it does

A user enters a small set of taste signals such as:

- Travis Scott
- Interstellar
- Stone Island
- Japanese food

They also choose where their taste comes from, a destination city, and a discovery mode: **Safe, Balanced or Unexpected**.

TastePassport creates a morning-to-night cultural route. Every stop includes a category, time of day, recommendation rationale, a **Taste Bridge** back to the user's interests, and a **Route Fit** score.

The experience is agentic after generation. A user can change one stop with **More like me** or **Surprise me more** while preserving the rest of the day. They can also refine the entire route in natural language with prompts such as **“Make it less touristy,” “More fashion-focused,” “Make it cheaper,”** or **“More nightlife.”**

A **Taste Translation Map** visualizes how the user's original signals connect to the generated destination route, making the recommendation logic easier to understand at a glance.

The generation flow also includes a cinematic multi-stage sequence — reading Taste DNA, mapping cross-domain signals, translating culture between cities, and building the final route — so the interface communicates what the agent is doing instead of showing a generic spinner.

## How we built it

TastePassport is built with **Next.js, React and TypeScript** and deployed on **Vercel**.

The backend is structured around the **Qloo Insights API** for cross-domain cultural discovery.

The main recommendation endpoint receives the user's Taste DNA, origin, destination and discovery mode and converts the recommendation response into a sequenced cultural route.

A separate replacement endpoint handles targeted single-stop changes, while a dedicated refinement endpoint accepts natural-language instructions and reshapes the full route while preserving its morning-to-night structure.

The application includes a clearly labeled Demo Mode so the full product experience remains testable while live API access is unavailable. Once `QLOO_API_KEY` is configured, the backend is designed to switch to Qloo-backed requests.

On the frontend we built custom motion for scroll reveals, route cards, loading feedback, and a cursor-reactive Taste DNA sphere. The interface is responsive across desktop and mobile and includes a fast path to build another TastePassport after viewing a route.

## Challenges we ran into

The biggest product challenge was avoiding a generic “AI travel planner.”

We focused the product around **taste translation** rather than itinerary generation. The route is not supposed to answer “what should everyone visit?” It is supposed to answer “what in this city feels culturally adjacent to me?”

Another challenge was making the experience feel agentic without forcing the user to regenerate everything. We solved that with two levels of control: targeted single-stop adaptation and full-route natural-language refinement.

We also wanted explainability to be part of the interface rather than hidden in model output. Taste Bridges, Route Fit scores and the Taste Translation Map all make the recommendation path visible.

## Accomplishments that we're proud of

- Built and deployed a complete working web experience
- Designed a distinct **Taste DNA / taste translation** concept
- Created a morning-to-night cultural route system
- Added explainable **Taste Bridges** and **Route Fit** scores
- Added a visual **Taste Translation Map**
- Added controlled serendipity through **Safe / Balanced / Unexpected** modes
- Added targeted agentic adaptation for individual route stops
- Added natural-language refinement for the entire route
- Preserved route context instead of rebuilding the day after every change
- Added cinematic generation feedback and polished interaction motion
- Built a responsive mobile experience
- Kept the project publicly accessible and open source

## What we learned

Recommendation quality is only part of the experience. Users also need to understand **why** something was recommended and need simple controls for pushing the system closer to, or further away from, their existing preferences.

We also learned that a useful cultural agent should preserve context. When a user dislikes one stop or wants a different vibe, it should adapt the current plan instead of forgetting everything and starting over.

## What's next for TastePassport AI

- Validate and tune the live Qloo request structure once the hackathon API key is available
- Use richer Qloo relationship signals inside the Taste Translation Map
- Add real images for interests and recommended places when available from live data
- Add smarter geographic route ordering and a real route map
- Add saved Taste DNA profiles
- Add shareable TastePassport routes
- Expand cross-domain balancing between food, music, fashion, film and places

## Links

**Live demo:** https://tastepassport-ai.vercel.app

**GitHub:** https://github.com/d3montazh/tastepassport-ai
