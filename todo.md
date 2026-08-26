# SentimentIQ enhancement checklist

The requested enhancement pass is complete. Upload parsing now exposes staged progress, animated loading dots, and per-phase labels; natural-language search interprets sentiment, themes, ratings, products, and recency; VADER scores are attached to imported reviews and summarized in the dashboard and detail drawer; and the profile page persists identity, default filters, starting page, theme, widget visibility, and widget order.

TypeScript checking, the production build, browser navigation through dashboard, reviews, upload, profile, and dark-mode states, preference save/restore interaction, and browser-console verification have been completed. The natural-language search is implemented as a privacy-preserving local intent interpreter in the current frontend-only project; a server-side LLM route can be connected later without exposing credentials in the browser.
