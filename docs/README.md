# Withheld — documentation

The package documents each answer a different question, with one directory of evidence.

| document | the question it answers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | how it is built, and why the seams are where they are |
| [DECISIONS.md](DECISIONS.md) | why it is built that way, one numbered decision at a time |
| [TESTING.md](TESTING.md) | what the test files, 43 hosted browser checks, 17 two-view checks, 19 native dispatch checks, and 27 recovery checks prove — and what they do not |
| [GATE-W1.md](GATE-W1.md) | whether an agent could derive the points or the pass boundary |
| [GATE-P2.md](GATE-P2.md) | whether the problem is real to anyone but the author. Not run |
| [RUNBOOK.md](RUNBOOK.md) | how to run it, and what to look at once it is running |
| [PROGRESS.md](PROGRESS.md) | what is verified, what is not, and what is waiting on a decision |
| [PREFLIGHT.md](PREFLIGHT.md) | what the hackathon requires, what is present, and who each gap belongs to |
| [SUBMISSION-TEXT.md](SUBMISSION-TEXT.md) | the earlier detailed form draft, retained for provenance |
| [SUBMISSION-TEXT-WINNER-STYLE-DRAFT.md](SUBMISSION-TEXT-WINNER-STYLE-DRAFT.md) | the current expressive, evidence-bounded form draft, unsent |
| [UPGRADE-PLAN.md](UPGRADE-PLAN.md) | evidence-first backlog after the 13-page/video and tier A/B audit |
| [DEEP-AUDIT.md](DEEP-AUDIT.md) | source-level findings, evidence boundaries, and detailed enhancement register |
| [INVENTORY.md](INVENTORY.md) | claim-to-evidence classification and stale-metric reconciliation |
| [SCORECARD.md](SCORECARD.md) | the 20-row internal W/X/I/C assessment and target check |
| [E4-REQUIREMENTS.md](E4-REQUIREMENTS.md) | the internal evidence gate, its classes, and what each one may be used to claim |
| [`evidence/`](evidence/) | local reports, blocked external-evidence runbooks, checksums, and four screenshots |
| [`target-images/`](target-images/) | the mockups the page was built against, kept as provenance |
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

The last two are not for a reviewer. `PREFLIGHT.md` is the hackathon's own requirement list with an
owner against each gap, and `SUBMISSION-TEXT.md` is the copy for the form — a draft, unsent, with the
live URL still a placeholder.

The evidence directory intentionally has no final `manifest.json`: the hosted URL, final commit,
model replay, and GATE-P2 are still open. `manifest.template.json` is format-only. Read
`evidence/README.md` before interpreting a local CDP artifact as hosted, model-selected, or user
validation evidence.
