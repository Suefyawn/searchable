# The daily editorial task

A scheduled Claude task keeps the site alive between human sessions: six runs a day, each one reads the site's state through the admin API, then publishes, updates and moderates. Everything it does goes through `docs/ADMIN-API.md`, so the same rules (search index, cache, IndexNow, budgets, no em dashes) apply as for a human editor.

## Setup (once)
1. Generate a key: `openssl rand -hex 32`. Set it as `ADMIN_API_KEY` in Vercel (Production) and redeploy.
2. In Claude, create a scheduled task (or six, one per slot) with the prompt below. Give the task the key as a secret or paste it into the prompt; it is the only credential it needs. Base URL: `https://searchable.pk/api/admin`.
3. First run: ask it to do only a "state" pass (read `/context`, `/reference`, `/queue`; report, publish nothing) and check the report reads sensibly.

## Schedule (Pakistan time, PKT = UTC+5)
| Run | Time | Focus |
|---|---|---|
| Dawn | 06:30 | Overnight world and markets: US close, crypto, cricket results. Data: `POST /data {ingest:true}`. Newsletter: create today's issue from the automatic draft, tidy it, schedule for 07:30. |
| Morning | 09:30 | Pakistan morning news: press headlines from `/ideas?region=pk`, three to five stories with the Searchable angle. Queue pass. |
| Midday | 12:30 | Markets open (PSX, USD/PKR), one explainer or guide update, inbox replies. |
| Afternoon | 15:30 | Business, tech, government notifications (OGRA, SBP, FBR, NEPRA): record readings by hand with sources. Queue pass. |
| Evening | 18:30 | Sport (cricket, MMA, snooker), entertainment, one evergreen guide refresh. |
| Night | 22:00 | Day wrap: update stories that moved, weekly guide audit (one guide per night gets its numbers checked), housekeeping `POST /jobs {job:"due"}`, report. |

On the 1st and 16th of the month (petrol price reviews), the Afternoon and Night runs check OGRA and update `petrol-price` and `diesel-price` the moment the notification is out, and publish the "what a full tank costs now" story.

## What a run does
1. `GET /context` and `GET /reference`. Note Karachi time, the last 40 stories, drafts, queue counts, latest data, searches with no results, email budget.
2. `GET /ideas` for the slot's topics. Pick stories that matter to readers in Pakistan (money, prices, rules, jobs, sport they follow). Skip anything already covered; update the existing story instead.
3. For each story: write 350 to 700 words of original reporting in markdown with a clear structure (what happened, numbers, what it means for you, what to do), link at least one calculator, guide or data page, add sources with URLs, an FAQ pair when useful, tags, entities, city when local. `POST /articles` with `image: { query }` chosen for the subject. Publish, or schedule spaced 30 to 40 minutes apart when there are several.
4. Guides: when `searchesWithNoResults` shows a repeated question, write the guide (kind `guide`, a guide category), 800 to 1,500 words, step by step, with fees, timelines and the mistakes people make.
5. Data: run `ingest` on the Dawn and Midday runs; record notified prices by hand with `sourceUrl` on the others.
6. Queue: `GET /queue`, then `POST /queue` with clear approvals and rejections; leave doubtful items alone and mention them in the report.
7. Inbox: `GET /inbox?status=new`; reply to genuine questions from the right mailbox (editorial for corrections, billing for payments, hello for the rest); archive spam.
8. Newsletter: Dawn run only. `GET /newsletter`, take `suggestedDraft`, improve the subject, `POST /newsletter { create: true, subject, body, scheduledFor }` for 07:30 PKT.
9. Finish with a short report: what was published (titles and URLs), what was updated, data recorded, queue decisions, anything left for a human.

## Editorial rules (short form of docs/CONTENT-OPERATIONS.md)
- Pakistan-first, plain English, rupees, local examples; world, US, markets, crypto, cricket, MMA, snooker covered from a Pakistani reader's point of view.
- Never copy press text. Headlines are leads; the story is ours, with our own numbers and a link to our tools.
- No em dashes. No AI-sounding filler. No hedging paragraphs. Numbers first.
- Every claim about a rate, fee or rule has a source with a URL, dated.
- Photos only via Openverse query or a known openly licensed URL. Never a press or agency photo.
- Do not publish anything invented. If a source cannot be found, do not write the story.
- When unsure whether a business, claim or post is legitimate, do not approve; describe it in the report.

## The prompt to paste into the scheduled task
```
You are the editorial automation for Searchable.pk, a Pakistan-first news, guides, calculators, data and directory site.
Base URL: https://searchable.pk/api/admin   Key: <ADMIN_API_KEY>  (send as "Authorization: Bearer <key>")
The API reference is docs/ADMIN-API.md in the repository (github.com/Suefyawn/searchable); GET /reference gives every slug you may use.

This run's slot: <Dawn|Morning|Midday|Afternoon|Evening|Night> (see the schedule in docs/DAILY-TASK.md).

Do, in order:
1. GET /context and GET /reference. Read recentArticles so you never duplicate a story.
2. GET /ideas for this slot's topics. Choose 3 to 5 stories that matter to readers in Pakistan.
3. For each story, write an original 350 to 700 word piece in markdown (what happened, the numbers, what it means for you, what to do), link at least one of our calculators, guides or data pages, add sources with URLs, tags, entities and a city when local. POST /articles with an image query. Publish, or schedule if there are several.
4. Record any notified prices with POST /data readings (with sourceUrl). On the Dawn and Midday runs also POST /data { "ingest": true }.
5. GET /queue and moderate: approve what is clearly fine, reject spam with a one-line note, leave doubtful items.
6. GET /inbox?status=new and reply to genuine mail from the right mailbox; archive spam.
7. Dawn run only: GET /newsletter, improve the suggested draft and POST /newsletter { create: true, ... } scheduled for 07:30 Pakistan time.
8. End with a report: published (title, URL), updated, data recorded, queue decisions, items left for a human, and any API errors.

Rules: no em dashes anywhere; never reproduce press text; every rate or rule has a dated source; photos only through the image query; do not publish anything you cannot source; Pakistan-first framing with rupees and local examples.
```
