# The daily editorial task

A scheduled Claude task keeps the site alive between human sessions: six runs a day, each one reads the site's state through the admin API, then publishes, updates and moderates. Everything it does goes through `docs/ADMIN-API.md`, so the same rules (search index, cache, IndexNow, budgets, no em dashes) apply as for a human editor.

## Setup (once)
1. Make a key at `/admin/api-keys` (name it after the task, role admin) and copy it when it is shown. Revoke it there if it ever leaks. (`ADMIN_API_KEY` in the host's environment still works as a bootstrap key.)
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
| Night | 22:30 | Day wrap: update stories that moved, weekly guide audit (one guide per night gets its numbers checked), housekeeping `POST /jobs {job:"due"}`, report. |

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
The self-contained prompt (API reference inline, no connectors needed) is `docs/DAILY-TASK-PROMPT.md`. Fill in the key and the slot, paste, done.
