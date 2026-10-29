# LinkedIn weekly run

The procedure the Sunday scheduled run follows, and any chat that drafts a single post on demand. Read VOICE.md, MARKERS.md and UTM.md first; they are part of these instructions.

Rule over everything: verified facts only. No invented statistic, study, quote, patient or quote attribution. Label anything inferred. If a fact can't be verified, drop it.

## Fixed settings

| Item | Value |
|---|---|
| Metricool brand, personal profile | blogId `7721132` ("Personal LinkedIn") |
| Metricool brand, Sicknote page | blogId `7622007` |
| Personal posts | Tuesday and Wednesday, 08:30, timezone `Europe/Zagreb` |
| Sicknote page posts | Tuesday, Wednesday and Thursday, 09:00, timezone `Europe/Dublin` |
| Reshare | one page post (usually Thursday's) gets ready-to-paste "my take" text for Viktor's profile |
| Carousel host | this repo, folder `media/`, public raw URL `https://raw.githubusercontent.com/doktorsimunovic-wq/linkedin-carousels/main/media/<file>` |
| Approval | every post is created as a Metricool draft (`draft: true`, `autoPublish: true`); nothing publishes until Viktor schedules it |
| Run log | `runs/<date of the Tuesday>.json` |
| Notify | push notification + one message to Viktor when done |

"The week" means the Tuesday to Thursday right after the run.

## Steps

### 0. Set up and guard
1. Attach and clone this repo with push access (add_repo `doktorsimunovic-wq/linkedin-carousels`, access "push"; then `git clone --depth 1`). Set git user to "Claude" / noreply@anthropic.com.
2. If `runs/<Tuesday>.json` exists with `"status": "done"`, send nothing and stop. If it says `"partial"`, only make the posts it lists as missing.
3. Load tools with ToolSearch: Metricool (`createScheduledPost`, `getBrandSettings`), PubMed, Consensus, Slack read tools, PushNotification.
4. `getBrandSettings`: confirm both blogIds still exist with LinkedIn connected. If one is missing, stop and tell Viktor which.

### 1. Pick five topics
- Read the last 8 files in `runs/` and avoid their topics.
- Search news and rule changes from the last 14 days in the VOICE.md topic lists (WebSearch "standard"; "extended" only when standard is thin). For studies use PubMed and Consensus.
- Optional Sicknote data point: the latest "Sicknote Radar — Daily Digest" in Slack #radar-info (channel C0B2NABAW6R). Aggregate figures only, over at least a full week; never anything about an individual. Skip it if the digest is missing or stale.
- Choose 2 personal topics and 3 Sicknote page topics. For each, write down the primary sources (official site, journal, regulator) you will cite. A topic without a primary source is dropped.
- To link a sicknote.com page in a first comment, find it with WebSearch `site:sicknote.com <topic>` (direct fetches of sicknote.com may be blocked) and use only a URL that search returned.

### 2. Draft each post
For each of the five posts write, in a working folder:
- `post.txt`: the post text (VOICE.md structure, 120–220 words, no links).
- `comment.txt`: the first comment (sources; UTM-tagged sicknote.com link where it fits).
- `spec.json`: the slide spec for render.js. Carousel: 4–7 slides (cover, content, close with the binary question and the source line). Infographic: 1 slide, only when the post is about a single number.
- `title.txt`: the LinkedIn document title (max 58 characters) for carousels.
- For the reshare post also `reshare.txt`: 2–4 lines in Viktor's voice, saying he founded Sicknote, ending with his own view.

### 3. Check
1. Dump all slide text from each spec into `slides.txt` and run `python3 system/check_markers.py post.txt comment.txt slides.txt reshare.txt`. Rewrite until it prints CLEAN. A word-only hit (e.g. "key", "features") may stay only when it is used literally; note why.
2. Run every arithmetic example in code.
3. Independent review: give a fresh subagent (Agent tool) only the five drafts, their source URLs, VOICE.md and MARKERS.md. Ask it to list (a) any claim the sources don't support, (b) any marker or pattern from MARKERS.md the scanner can't catch (inflated significance, tacked-on analysis, forced threes, synonym cycling, false balance), (c) anything that reads like an ad, (d) any breach of VOICE.md hard rules. Fix what it finds. At most two review rounds; if a post still fails, drop it and say so in the message.

### 4. Render
- `node system/render.js spec.json out.pdf` (or `out.png` for an infographic). It fails on missing fonts (exit 3) or text overflow (exit 4): shorten the copy and rerun.
- Look once at the slide PNGs it writes next to the PDF (a contact sheet is fine). Fix only what is visibly broken.
- Name files `<YYYY-MM-DD>-<brand>-<slug>.pdf` with the publish date.

### 5. Upload and create drafts
For each post:
1. Copy the file into `media/`, commit ("Add carousel <file>") and push. Wait until `curl -sS -o /dev/null -w "%{http_code}"` on the raw URL returns 200.
2. `createScheduledPost` with `blogId`, `date` (ISO with offset) and `info`:
   - `providers: [{"network":"linkedin"}]`, `text` from post.txt, `firstCommentText` from comment.txt
   - `media: [<raw URL>]`, `draft: true`, `autoPublish: true`, `shortener: false`
   - `publicationDate: {"dateTime": "...", "timezone": "Europe/Zagreb" | "Europe/Dublin"}`
   - `linkedinData: {"documentTitle": <title>, "previewIncluded": true, "type": "post"}` (omit documentTitle for a PNG)
3. Check the response: `media[0]` must start with `https://static.metricool.com/`. If the call fails, retry once. If it fails again, keep going with the other posts and report it.
4. After all posts are created, `git rm` the files from `media/`, commit ("Remove carousels copied to Metricool") and push.

### 6. Log
Write `runs/<Tuesday>.json`: `{"status": "done" | "partial", "run_at": ISO time, "posts": [{"brand", "publish_at", "topic", "sources": [...], "planner_url", "media_file"}], "missing": [...], "notes": "..."}`. Commit and push.

### 7. Tell Viktor
- PushNotification (one line): "LinkedIn drafts ready: <n> for <Tue date>–<Thu date>. Approve in Metricool."
- One message (SendUserMessage), short and readable on a phone, written to MARKERS.md rules:
  - one line per draft: day and time, brand, topic, planner link
  - the reshare text, ready to paste, and which page post it belongs to
  - anything dropped or failed, and why
  - last line: "Open each draft in Metricool and press Schedule to approve. Anything you don't schedule stays unpublished."

## On-demand single post
When Viktor asks in a chat for one post ("draft a LinkedIn post about X"): follow steps 0.1, 2, 3, 4 and 5 for that one post, with the publish slot he names (or the next free slot from the table above), then send him the planner link. Log it in `runs/` under the matching week with `"on_demand": true`.

## Comments on other people's posts
When Viktor sends a post link or screenshot: write 2 comment options (max 3 sentences each: one adds a specific insight or data point, one politely disagrees or adds a caveat), in his voice, run them through check_markers.py, and send them ready to paste. Never post them.
