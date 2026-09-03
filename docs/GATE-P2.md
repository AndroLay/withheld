# GATE-P2 — is the problem real to anyone but the author?

**Status: NOT RUN.** `docs/evidence/gate-p2-not-run.json` records the reason and rerun protocol.
This file is the instrument, not the result. Nothing in this repository should
be read as evidence about a teacher's workload until the "Result" section at the foot has been filled
in with someone's actual answers.

It exists because the gate cannot be closed by writing code, and because "ask a non-builder four
questions" is the kind of task that never happens if the questions have to be invented on the day.
Twenty minutes: ten to ask, ten of session.

## Why this gate, and what it is not

`README.md` says the shape of the marking problem is a description and not a finding: no teacher was
interviewed, no marking session was timed. `GATE-P1` was closed the weak way — by downgrading the
claim in as many words rather than by reading a primary source. This gate is the other half, and it
is deliberately cheap: one person who did not build this, one sitting, four written questions.

**One participant is not a rate.** A pass here means the problem exists for one person other than the
author. It does not license a sentence about how common the hard answers are, how long marking takes,
or what fraction of it is recognition. If the result tempts anyone to write such a sentence, the gate
has been misread.

## Who

One person who did not build this and does not need to be a teacher — anyone who has had to grade,
score, review or triage a pile of similar things against a fixed standard. A marker, a code
reviewer, an interviewer who has scored a take-home, an admissions reader. Those are backgrounds a
participant may come from, not audiences this page claims: the page is written for one persona, the
instructor marking a class of short answers.

One is enough to run the gate, and three is the sensible ceiling. Each session is one person, one
pile, recorded separately and quoted verbatim; three separate records are worth more than three
summarised into a finding, and nothing here is ever averaged.

Not: anyone who has seen this repository, and not anyone the author has already explained the idea
to. The comprehension half of this gate is destroyed by a prior explanation.

## Protocol

The two problem questions come **before** the app is opened. The two comprehension questions come
after ninety seconds of looking at it, with no tour and no narration.

1. Ask Q1 and Q2. Write the answers down as they are said, not as they are meant.
2. Open the page. Say exactly one sentence: *"This is a page for marking a class of short answers,
   and an AI agent can help with it."* Nothing else — no walkthrough, no pointing.
3. Ninety seconds of silence. They may click anything, including "Mark all from the worked example".
4. Ask Q3 and Q4.

**What the observer must not do.** Do not explain, lead, defend, or fill a pause. Do not answer a
question with the answer — "what does that mean?" gets "what do you think it means?" once, and then
gets recorded as a failure to communicate. A gate that the observer can talk their way past measures
the observer.

Running step 2 needs the page open in a browser, and that prerequisite is now met: `pnpm build &&
pnpm browser` opens `dist/` in a headless Chromium and reports all 43 of its checks green, so the
page lays out and responds. What this gate still needs is a person who did not build it — twenty
minutes of one, which is not something code can supply.

The page has since grown an introduction whose whole purpose is to say, in the first ten seconds, what
Q3 asks a reader to say back (`docs/DECISIONS.md` D-24). That does not make this gate any less
necessary — the band was written by the same person whose understanding the gate exists to distrust,
and whether the words work is exactly the kind of question only the first stranger to read them can
settle. If anything it sharpens Q3: a wrong answer now means the band's own sentences failed, which is
a more specific and more useful finding than the page having said nothing at all.

## The four questions

**Q1 — the triage behaviour.** *"Think of the last time you had to score or grade a pile of similar
things. How did you decide which ones to look at twice?"*

Looking for: whether a small hard subset exists unprompted, and how they find it. A pass is any
description of a real second pass. A fail is "I didn't — I read them all the same way", and that is a
real answer worth writing down, because it says this product solves a problem this person does not
have.

**Q2 — what they would refuse to delegate.** *"If something else read the whole pile and handed you
back only a few to decide yourself, which ones would you want handed back — and what would make you
distrust the ones it kept?"*

Looking for: whether *they* name the cases this page holds — the boundary case, the long answer that
earned nothing, the one addressed to the marker. If they name a case the page does not hold, that is
the most valuable sentence in the whole exercise and belongs in `docs/PROGRESS.md` as a work item.

**Q3 — the central claim, unprompted.** *"In your own words: what can the agent on this page not
do?"*

Looking for: the absence, found by looking rather than by being told. A pass is anything in the
neighbourhood of *it can't decide the mark* or *it can't send anything to a student*. A fail is a
shrug, or a confident wrong answer — and a confident wrong answer is the worse result, because it
means the page is teaching something false.

Since the introduction states that claim in the first paragraph on the page, note whether the answer
comes back in the band's words or in the reader's own. An echo is a weaker pass than a paraphrase: it
shows the sentence was read, not that the page was understood. If they point at something on the
screen while answering — the tool list, the printed payloads, the human-only gate, or the zero in the
band — record which, because that is the artefact doing the work.

**Q4 — whether the demonstration convinces.** *"The page held five answers back for you, and three it
will not name to your agent. Do you believe it could not tell your agent which three? What would you
need to see to believe it?"*

Looking for: whether the printed payloads in the contract column do any work, or whether the claim
reads as an assertion. "I'd have to take your word for it" is a failure of the page, not of the
participant, and the answer to "what would you need" is the design brief for fixing it.

## The paired task: the same pile by hand, then with the page

The four questions measure comprehension. They do not measure whether the page saves anyone anything,
and that is the weakest claim in this package. This half measures it, on one pile, with one person, and
it produces a description rather than a rate.

The two halves use the same fourteen answers and the same rubric. `docs/GATE-P2-BYHAND.md` is the
by-hand sheet, generated from `src/data/fixtures.ts` so the wording cannot drift from the page's.

1. **By hand, first.** Hand over `docs/GATE-P2-BYHAND.md` — printed, or on screen with the page
   closed. The task, said once: *"Find the answers you would want to look at twice before any of these
   marks went out. You do not have to mark them."* Start a timer. Stop it when they say they are done.
   Record: the elapsed time, the ids they named, and the ids they did not.
2. **Then the page**, from `https://androlay.github.io/withheld/`. Same task, same sentence, new timer,
   and the same silence rule as the protocol above: no tour.
3. **Ask, in this order, and write the answers as sentences:** which of the two was easier and why;
   whether anything the page held surprised them; and — only if they have not already said it —
   *"who decides the mark here, and who sends it?"*

What to record, all of it verbatim:

| field | why |
| --- | --- |
| time by hand, time with the page | the two numbers, as measured, for one pile and one person |
| ids named by hand | which cases a person finds unaided |
| ids named with the page | whether the page's five holds match what a person wanted back |
| ids the page holds that they did not name | the page holding more than a person asked for is a cost, not a win |
| ids they named that the page does not hold | the most valuable sentence in the exercise; it goes to `docs/PROGRESS.md` as work |
| whether they said, unprompted, that the agent cannot score or release | Q3 by another route: if they only say it when asked, the page did not say it |

**One participant is not a rate.** Two timings from one person on one pile are an anecdote with a
number attached. Write them as "one participant, one pile, N minutes against M minutes" and never as a
percentage, a speed-up, a saving per week, or a claim about markers in general. If two or three people
run it, write each one separately; do not average them, and do not let three become "users found". The
honest form of this evidence is a quotation, and the honest sample size is the one that happened.

## Recording

Verbatim, in the section below: the date, what the participant does, whether they had seen anything
of this project before, and the four answers as sentences rather than as a summary. Then one line per
question saying pass or fail, and one closing line naming anything the participant said that this
package cannot currently do.

A fail is a result. It goes in `README.md` and `docs/PROGRESS.md` in the same words it was given, and
it is more useful than a pass, because a pass changes nothing about what gets built next.

## Result

Not run. No participant, no date, no answers, and no paired timing. As of 2026-09-03 at 09:30 UTC the
instrument is complete — four questions, the paired task, and the by-hand sheet — and what is missing
is a person. Nobody has been asked and nobody has declined; no participant was reachable inside this
working session, and recruiting one is not something this package can do for itself.
`docs/evidence/gate-p2-not-run.json` carries the same statement in machine-readable form.

The page is live at `https://androlay.github.io/withheld/`, so step 2 needs no build and no local
server — a participant can be handed a URL. That removes the last technical obstacle and leaves only
the human one.

If this section still says that at submission time, then `README.md`'s statement that the size of the
problem was not measured here stands as the whole of the evidence, and it should be read as the
author's own account of the work rather than as anything a second person confirmed.
