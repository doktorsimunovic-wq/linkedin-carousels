# UTM convention: LinkedIn → sicknote.com

Applies to every sicknote.com link the LinkedIn system publishes (first comments, reshare comments, carousel last slide). Other domains get no tags.

## Format

https://sicknote.com/<path>?utm_source=linkedin&utm_medium=<medium>&utm_campaign=<campaign>&utm_content=<content>

| Parameter | Values | Meaning |
|---|---|---|
| utm_source | linkedin | always |
| utm_medium | profile / page | profile = Viktor's personal profile, page = Sicknote company page |
| utm_campaign | li-YYYY-MM-DD-topic | publish date + 2–4 word topic slug, e.g. li-2026-11-03-ireland-sick-leave-days |
| utm_content | comment1 / reshare / slide | where the link sits: first comment, reshare comment, or printed on the last slide |

## Rules

- Lowercase only, hyphens between words, no spaces, no personal or patient data in any value.
- One campaign value per post; the profile reshare of a page post keeps the page post's campaign value and uses utm_medium=profile, utm_content=reshare, so both routes to the same post can be compared.
- Links printed on slides cannot be clicked in a LinkedIn PDF carousel; a slide link is for people who type it, so use a short path and still tag it.
- Never shorten tagged links with the Metricool shortener (shortener: false), so the tags stay readable in analytics.

## Still to confirm (blocking attribution, not posting)

- That sicknote.com keeps UTM values through checkout and stores them on the order (Supabase orders table or GA4 purchase events). Until confirmed, clicks are measurable in GA4 but orders cannot be attributed to a post.
