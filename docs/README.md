# Withheld — documentation

The package documents each answer a different question, with one directory of evidence.

| document | the question it answers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | how it is built, and why the seams are where they are |
| [DECISIONS.md](DECISIONS.md) | why it is built that way, one numbered decision at a time |
| [TESTING.md](TESTING.md) | what the 136 tests, 43 browser checks, 17 two-view checks, 19 native dispatch checks, and 27 recovery checks prove — and what they do not |
| [GATE-W1.md](GATE-W1.md) | whether an agent could derive the points or the pass boundary |
| [GATE-P2.md](GATE-P2.md) | whether the problem is real to anyone but the author. Never run; withdrawn as a blocking gate on 2026-09-04 and kept as the instrument |
| [GATE-P2-SIMULATION.md](GATE-P2-SIMULATION.md) | the human half of what replaced it — a derived step count and a transcript marked as an echo. `INFERENCE`, and not user validation |
| [MULTI-AGENT-SIMULATION.md](MULTI-AGENT-SIMULATION.md) | the workflow half of what replaced it, `SIMULATED_RUN` at 20/20, with its explicit evidence limits |
| [MODEL-REPLAY.md](MODEL-REPLAY.md) | the one run where a model chose these tools from plain language: what it called, whose marks reached the page, and the four things it does not show |
| [GATE-P2-BYHAND.md](GATE-P2-BYHAND.md) | the by-hand marking sheet that forms the control half of that paired task, generated from the shipped fixtures |
| [agent-integration.md](agent-integration.md) | how to put a real MCP client in front of the nine tools through `scripts/mcp-bridge.mjs`, and what has and has not been run over it |
| [VIDEO-SCRIPT.md](VIDEO-SCRIPT.md) | the shot order for the demo video, which is still unrecorded |
| [RUNBOOK.md](RUNBOOK.md) | how to run it, and what to look at once it is running |
| [PROGRESS.md](PROGRESS.md) | what is verified, what is not, and what is waiting on a decision |
| [PREFLIGHT.md](PREFLIGHT.md) | what the hackathon requires, what is present, and who each gap belongs to |
| [SUBMISSION-TEXT.md](SUBMISSION-TEXT.md) | the current form copy, laid out field by field — this is the one to paste from |
| [SUBMISSION-TEXT-WINNER-STYLE-DRAFT.md](SUBMISSION-TEXT-WINNER-STYLE-DRAFT.md) | the earlier prose-shaped draft, superseded and retained for provenance |
| [UPGRADE-PLAN.md](UPGRADE-PLAN.md) | evidence-first backlog after the 13-page/video and tier A/B audit |
| [UI-V3-RECONCILIATION.md](UI-V3-RECONCILIATION.md) | which parts of the external UI V3 target the frozen build already satisfies, and what the five unbuilt items would cost |
| [DEEP-AUDIT.md](DEEP-AUDIT.md) | source-level findings, evidence boundaries, and detailed enhancement register |
| [INVENTORY.md](INVENTORY.md) | claim-to-evidence classification and stale-metric reconciliation |
| [SCORECARD.md](SCORECARD.md) | the 20-row internal W/X/I/C assessment and target check |
| [E4-REQUIREMENTS.md](E4-REQUIREMENTS.md) | the internal evidence gate, its classes, and what each one may be used to claim |
| [`evidence/`](evidence/) | local reports, blocked external-evidence runbooks, checksums, and four screenshots |
| [`target-images/`](target-images/) | the mockups the page was built against, kept as provenance |
| [`gallery/`](gallery/) | eleven 2× captures of the built page in the states it reaches, for the Devpost card and the write-up |
| [`design/`](design/) | a clickable layout proposal and its renders. Not part of the submission |
| [`images/`](images/) | the two screenshots the top-level `README.md` embeds |

Two more sit one directory up: [`../README.md`](../README.md) for the pitch and the honest status
list, and [`../SECURITY.md`](../SECURITY.md) for the threat model — prompt injection through a
student answer, the absence of a release tool, the information boundary, and what a header-less
static host cannot enforce.

## If you only read one paragraph

An agent may read a stack of exam answers, recognise which canonical rubric ideas each answer
expresses, and report them back by id. The page computes every total itself, decides which answers
a person must look at, and tells the agent neither. There is no tool that sends a mark to a
student — releasing is a click, made by a person, in the page. That absence is the design.

Start with [ARCHITECTURE.md](ARCHITECTURE.md) if you want to know how, and
[DECISIONS.md](DECISIONS.md) if you want to argue with it.

## Reading order for a reviewer

1. `../README.md` — the problem and the mechanic.
2. `ARCHITECTURE.md` — the layers and the two boundaries that matter.
3. `../SECURITY.md` — the four threats, and what a static host cannot do.
4. `GATE-W1.md` — the leak this gate found, and the two channels it leaves open.
5. `TESTING.md` — starting from "What these tests cannot tell you".
6. `PROGRESS.md` — before believing anything is working.

Two of the documents above are not for a reviewer at all. `PREFLIGHT.md` is the hackathon's own
requirement list with an owner against each gap, and `SUBMISSION-TEXT.md` is the copy for the form — a
draft, unsent, but no longer placeholder-bound: it carries the real live URL and repository URL.

The evidence directory now carries a filled `manifest.json`, written from the runs it sits beside: it
binds the hosted URL, the published refs, one source/build pair, every run artifact, the four screenshot
hashes, and the gates that were open when it was written — model replay `UNKNOWN` and the video
`NOT_RUN`. The replay ran twice on 2026-09-04, after that manifest was frozen, so its `openGates` entry
("no run of either is recorded in this package") is a snapshot of the state before those runs rather than a
current reading; [`MODEL-REPLAY.md`](MODEL-REPLAY.md) with `evidence-staging/nl-replay.json` and
`nl-replay-hosted.json` is the record, and what remains unshown there is a native third-party host. The
video is still `NOT_RUN`. The former
GATE-P2 remains a historical `NOT_RUN` record but is retired as an active gate; its two replacements are
[`GATE-P2-SIMULATION.md`](GATE-P2-SIMULATION.md) for the human half and
[`MULTI-AGENT-SIMULATION.md`](MULTI-AGENT-SIMULATION.md) for the workflow half, whose
`multi-agent-simulation.json` reports 20/20 deterministic checks.
`manifest.template.json` stays as the empty form. Read `evidence/README.md` before
interpreting a local CDP artifact as hosted, model-selected, or user validation evidence.
