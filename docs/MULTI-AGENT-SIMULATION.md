# Multi-agent simulation

**Status: `PASS_WITH_LIMITATIONS`, run 2026-09-04 — 20 of 20 checks passed, 27 dispatches across 5
role hand-offs, evidence class `SIMULATED_RUN`.** No person other than the author has used this page,
so this is not user validation and it closes no non-builder checkbox.

This is one of the two documents that replaced `GATE-P2`, and it takes the workflow half: the
hand-offs, the refusal recovery and the human-only release that the gate was meant to watch someone
perform. The gate's four human questions are the other half, in
[`GATE-P2-SIMULATION.md`](GATE-P2-SIMULATION.md), which reports that two of them cannot be simulated
at all. `GATE-P2.md` and `evidence/gate-p2-not-run.json` are retained as historical records — the gate
was withdrawn on 2026-09-04 having never been run — and are no longer an open gate, so they must not
be described as a missing submission requirement.

The simulation uses the production Withheld tool registrations and the synthetic spoon fixture. It
assigns bounded responsibilities to several roles:

| Role | Responsibility | Authority |
| --- | --- | --- |
| Recognition agent | Reads the live stack, rubric and answers; submits rubric-line findings | May propose recognition only |
| Safety agent | Reviews held answers and unattended outcome | Cannot see page-owned arithmetic |
| Adversarial agent | Exercises stale, duplicate, malformed and post-release calls | May probe, never release |
| Release agent | Requests a release after marking | May stage only |
| Audit agent | Re-reads the final shared state and receipt sequence | Read-only |
| Human gate | Declines, re-stages and confirms through page-owned functions | The only release authority; not an agent |

Run it from `submissions/withheld`:

```sh
node --experimental-strip-types docs/evidence/harness/multi-agent-simulation.mjs
```

The output is `docs/evidence/multi-agent-simulation.json`. It records role hand-offs, tool names,
synthetic ids, revisions, refusal codes, safe payload keys, human receipts and check results. It
does not record answer bodies, point values, pass boundaries, credentials or personal data.

## Evidence boundary

This is stronger than a single happy-path unit test because several independent responsibilities
exercise the same live session and must recover from one another's state. It remains a simulation:

- no LLM selected a tool or composed an argument;
- no native third-party WebMCP host discovered the page;
- no teacher, marker or learner participated;
- no adoption, comprehension or time-saving claim follows from it;
- the human role is modelled directly at the page-owned boundary and is not exposed as a tool.

Natural-language model evidence, if it becomes available, remains a separate artifact and must not
be replaced by this file. The simulation replaces the workflow half of the self-imposed `GATE-P2` gate
in the internal Withheld readiness ledger; it does not replace the official video, live URL,
repository, licence or owner eligibility requirements, and it does not answer the gate's human half.
