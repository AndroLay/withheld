# GATE-P2 — the simulation that took its place

**Status: SIMULATED, 2026-09-04. This does not close GATE-P2, and it is not user validation.**
Every line below is class `INFERENCE`. No person other than the author has read this page, and nothing
here changes that sentence anywhere else in the package.

GATE-P2 asked whether the marking problem is real to anyone but the author. That question could only
be answered by twenty minutes of a person who did not build this, and no such person was reachable
inside the working session. On 2026-09-04 the owner withdrew it as a blocking gate — it was our own
gate, set above the hackathon's own bar, which asks for a URL, a description, a repository, a licence
and a video and not for a user study (`PREFLIGHT.md`) — and put this in its place. The instrument
stays in [`GATE-P2.md`](GATE-P2.md), unfilled, for whoever runs it after the window; the by-hand sheet
stays in [`GATE-P2-BYHAND.md`](GATE-P2-BYHAND.md) as the control half of its paired task.

`evidence/gate-p2-not-run.json` still records `"status": "NOT_RUN"`, and this file did not change that
field. Nothing here is an entry in the evidence ledger at all: `scripts/evidence-meta.mjs` hashes the
source tree and the build tree, and `docs/` is in neither, so this document moves neither source
`b924a27a…` nor build `84eee099…`. The frozen artifact and this file do not disagree with each other —
the gate was never run.

This is one of two documents that took the gate's place, and it takes the human half — the four
questions, and what a simulation can and cannot reach in them. The workflow half is
[`MULTI-AGENT-SIMULATION.md`](MULTI-AGENT-SIMULATION.md), whose generated
[`multi-agent-simulation.json`](evidence/multi-agent-simulation.json) passed 20 of 20 deterministic
checks as class `SIMULATED_RUN`. That one exercises hand-off, refusal recovery and the human-only
release boundary; it is a different claim from this one, and neither of them is user validation.

## What a simulation can reach, and what it cannot

| half of the gate | simulable | why |
| --- | --- | --- |
| Q1 — how they triaged the last real pile | **no** | it asks what a person did on one specific afternoon. A simulation has no last time. |
| Q2 — what they would refuse to delegate | **no** | its whole value was a case *they* name that this page does not hold. Anything that has read the page names the page's own cases back. |
| Q3 — what the agent cannot do | partly | answerable from the page's copy — but by the author's own model, so an echo cannot be told apart from a pass |
| Q4 — whether the printed payloads convince | partly | same contamination. A reader who already knows the payloads are real cannot test whether they *read* as real. |
| paired task — the page half | **yes, derived** | every interaction on the path is a control in the shipped build, and two of the states are committed captures |
| paired task — the by-hand half | structurally | the work the sheet presents is countable. How long a person takes over it is not. |

The contamination is not a footnote, it is the finding: **two of the four questions cannot be
simulated at all**, and the two that can be are answered by the same understanding this gate existed
to distrust. What follows is a derivation with a transcript attached, not a session.

## The page half: seven interactions, five of them optional

The paired task asks a participant to *"find the answers you would want to look at twice before any of
these marks went out"*, and counts steps. On the page that path is fully determined by the shipped
build, so it can be counted without a person:

| # | interaction | what it produces |
| --- | --- | --- |
| 1 | click **Mark all from the worked example** | 14 answers, 13 marked, 5 held, 0 staged, revision 03 |
| 2 | set the queue filter to **Held for you** | the five held answers, 5 of 14, and nothing else |
| 3–7 | open each of the five rows | the rule that held that row, one sentence per row |

**Two interactions reach the ids; seven reach the reasons.** Steps 1 and 2 are captured in
[`gallery/04-marked-1440.png`](gallery/04-marked-1440.png) and steps 2–7 in
[`gallery/05-queue-holds.png`](gallery/05-queue-holds.png) — real frames of the built tree, so the
path is evidenced even though no human walked it. The five holds at the *Standard* care level are
three answers on the line against the 50 / 88 pass mark, one long answer that matched no rubric idea,
and one quarantined for addressing the marker
([`gallery/03-quarantine-1440.png`](gallery/03-quarantine-1440.png), `ans-11`).

## The by-hand half: what the sheet asks of a reader

[`GATE-P2-BYHAND.md`](GATE-P2-BYHAND.md) is the same fourteen answers and the same rubric, generated
from `src/data/fixtures.ts`. Four ideas, worth 17, 19, 23 and 29; maximum 88; pass boundary 50. The
sheet prints no totals, so the work it presents is countable:

- **14 answers to read.**
- **56 recognition decisions** — every answer against each of the four ideas. The task says *"you do
  not have to mark them"*, but nothing on the sheet says which answers are near the boundary, so a
  reader has to approximate a mark for each one to find them. The 56 are not optional.
- **14 sums, and 14 comparisons against 50** — done in the head, unaided and unchecked.

**What this does and does not compare.** Both halves require reading fourteen answers; the reading is
the bulk of the work and the page removes none of it. What the seven interactions remove is the
arithmetic and the boundary test, and what they add is a stated reason per held row. So the honest
form of this derivation is *the page does the sums and names the rule; it does not read for you* — and
it is a count of interface work, not a saving, not a rate, and not a measurement of any person.

## Q3 and Q4, simulated — and read as an echo

The answers below were produced by the language model that helped write this package, from the page's
rendered copy. They are the author's own understanding coming back, which is the one thing the gate
was built to exclude. Recorded verbatim, and marked as an **echo, not a pass**:

> **Q3 — what can the agent on this page not do?** It cannot decide a mark and it cannot send
> anything to a student. It proposes which rubric ideas an answer expresses, by id; the page does
> every sum, chooses what is held, and keeps both. Of the nine tools, the furthest a caller reaches is
> staging a release — there is no tool that confirms one, and the only button that sends is marked
> HUMAN ONLY.

> **Q4 — do you believe it could not tell your agent which three?** The contract column prints four
> verbatim payloads, so the absence is legible rather than asserted, and that is the artefact doing
> the work. But those payloads are still the page's account of itself. To settle it I would want the
> tool schema or the source — the repository has both; a judge who only opens the URL has neither.

**Marking, honestly.** Q3 is an echo: it comes back in the page's own words, which shows the sentence
exists, not that it communicates. Q4's second half is the only line in this exercise that behaves like
a finding — *the page can only offer its own testimony* — and it is not new; it is the same boundary
[`GATE-W1.md`](GATE-W1.md) probes from the other side. A stranger might have said something the
package does not already say. This did not.

## What this changes

Nothing about the product, and nothing about any other gate. Specifically:

- **No claim of user validation, adoption, comprehension or impact** is licensed by this file, and E4
  is not advanced by it. `INFERENCE` cannot be promoted to observation of a person.
- `README.md`'s sentence that the size of the marking problem was described and not measured **stands
  unchanged** as the whole of the evidence.
- The natural-language **model replay stays `UNKNOWN`** and the **video stays `NOT_RUN`**. Withdrawing
  our own gate does not touch either.
- If a non-builder becomes available before the deadline, run [`GATE-P2.md`](GATE-P2.md) as written and
  let its Result section supersede this file. Twenty minutes of one person outranks all of the above.
