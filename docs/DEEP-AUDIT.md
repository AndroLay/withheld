# Withheld — deep audit dan enhancement register

**Snapshot audit:** 2 September 2026 (WITA)
**Mode:** audit plus bounded local hardening; no deploy, public push, video upload, or submission.
**Tujuan:** mencatat seluruh peningkatan bernilai tinggi yang dapat memperkuat Withheld berdasarkan source, test, artefak browser, package documentation, audit tier A/B, serta audit video publik.

Dokumen ini melengkapi UPGRADE-PLAN.md. UPGRADE-PLAN.md berfungsi sebagai urutan P0–P2. Dokumen ini berfungsi sebagai audit teknis yang menjelaskan mengapa item tersebut penting, bukti yang ada, batas klaim, dan acceptance test yang harus menutupnya.

## Implementation update — 2 September 2026

The audit below is the pre-hardening snapshot. The following source-level findings are now
implemented and covered by tests or the fresh browser artifact:

- H-01: human confirm and decline write receipt events with exact revisions and appear in the timeline;
- H-02, M-01, and M-13: tool schemas are closed and bounded, runtime parsing rejects extra, duplicate,
  or oversized input, every agent write requires a bounded single-use `operationId`, identical
  proposals and current-emphasis requests refuse as `no-change`, and a second pending release request
  refuses as `release-already-staged`;
- M-02: manual checkboxes are controlled and a stale open form enters a visible conflict state;
- M-06 and M-08: the detector covers the tested multilingual/Unicode variants, generated prose is
  checked at runtime, and unexpected tool failures return a non-diagnostic recovery envelope;
- M-09: unknown rubric-line IDs are rejected before arithmetic, and the native browser probe records
  that refusal without a revision change;
- M-12: a partial registration, including a failure before the first tool lands, is reported in the
  UI with a bounded status and an explicit retry action;
- M-11: the fixture invariant comment now points to the tests that actually enforce it.

The implementation was rebuilt and checked on Node 26.4.0: 125 tests, typecheck, build, 44 browser
checks, 19 WebMCP CDP checks, and 27 local failure/recovery checks pass. The evidence JSON is bound to the base Git SHA, dirty-tree
state, source/build SHA-256 values, browser flags, and screenshot hashes. The remaining submission
blockers are external or human evidence: a hosted HTTPS URL, public repository/About visibility,
natural-language model replay, GATE-P2, Node 22/CI execution, screen-reader listening, and the
public video.

The sections below preserve the original audit reasoning and acceptance criteria. References to
the old **HISTORICAL_LOCAL** 37/37, 110-test, missing-receipt, loose-schema, or EROFS snapshot are historical findings,
not the current implementation status.

## 1. Putusan singkat

Withheld sudah mempunyai tesis yang kuat dan cukup berbeda dari game Flowline:

> **Agent membawa bahasa dan pengenalan rubric; halaman memegang arithmetic, identitas, keputusan eskalasi, dan human-only release.**

Source menunjukkan bahwa tesis itu bukan sekadar teks pemasaran. Mark dihitung di page, payload agent direduksi, input invalid/stale ditolak, prompt-injection answer dikarantina, dan tidak ada confirm_release pada tool surface. Artefak historis juga menunjukkan registry/dispatch native dan browser layout pernah lulus.

Namun paket belum dapat disebut release candidate. Empat status pentingnya adalah:

1. **Final human action is now in the receipt/audit timeline.** confirmRelease and declineRelease
   route through the same receipt constructor with explicit human actions and exact revisions.
2. **The schema and validator boundary is now closed and bounded.** Findings, ids, and line lists
   are rejected when extra, duplicated, malformed, or oversized, at both schema and runtime.
3. **Semua bukti model-selected replay, hosted URL, dan user/problem validation masih UNKNOWN atau belum ada.** DevTools dispatch bukan bukti model memilih tool.
4. **Fresh local verification is now green on a writable Node 26 environment** (125 tests, typecheck,
   build, 44 browser checks, 19 WebMCP checks, and 27 local failure/recovery checks). Node 22/CI and the hosted artifact still need
   their own run.

Peningkatan tertinggi bukan menambah tool, backend, akun, persistence, atau animasi. Peningkatan tertinggi adalah membuat satu alur kecil yang dapat dibuktikan dari clean build sampai hosted replay, dengan audit final manusia yang konsisten dan payload yang strict.

## 2. Scope, metode, dan kelas evidence

### 2.1 Scope yang diperiksa

- submissions/withheld/src/** — domain, views, tool boundary, registration, dan UI;
- submissions/withheld/tests/** — unit, contract, render, style, boundary, dan registration tests;
- submissions/withheld/scripts/** — browser session dan WebMCP CDP invocation;
- package.json, vite.config.ts, index.html, README.md, SECURITY.md;
- package docs: ARCHITECTURE, DECISIONS, GATE-P2, GATE-W1, PREFLIGHT, PROGRESS, RUNBOOK, SUBMISSION-TEXT, TESTING, UPGRADE-PLAN;
- audit komparatif tier A/B dan 13 halaman/video publik di 46-tier-ab-audit-and-two-submission-upgrade-plan.md serta 47-devpost-video-audit-2026-09-02.md.

### 2.2 Kelas evidence

| Label | Arti | Klaim yang diizinkan |
| --- | --- | --- |
| VERIFIED_SOURCE | Terlihat langsung pada source/test yang dibaca | Perilaku dirancang/diimplementasikan; belum membuktikan hosted atau model |
| VERIFIED_ARTIFACT | JSON/screenshot/run dengan URL, browser, waktu, dan commit yang tercatat | Hanya berlaku untuk artefak tersebut |
| HISTORICAL_LOCAL | Run lokal terdahulu yang disimpan dalam package | Harus diulang dari build yang akan dikirim |
| SELF_REPORTED | README, caption, atau deskripsi pembuat | Tidak boleh dinaikkan menjadi bukti independen |
| INFERENCE | Kesimpulan audit dari source atau benchmark | Harus diberi alasan dan tidak diperlakukan sebagai hasil user/model |
| UNKNOWN | Belum ada bukti yang memadai | Tetap gap sampai artefak dikumpulkan |

### 2.3 Batas audit ini

- Tidak ada model yang diminta atau diizinkan memilih tool dalam audit ini.
- Tidak ada URL hosted Withheld yang diuji.
- Tidak ada sesi marker/reviewer non-builder yang menjalankan GATE-P2.
- Audit video peserta berbasis metadata/caption yang tersedia; bukan frame-by-frame visual review terhadap seluruh video.
- Tidak ada penilaian resmi juri. Skor W/X/I/C adalah scorecard internal.

## 3. Baseline implementasi yang sudah kuat

Temuan berikut merupakan aset yang harus dipertahankan, bukan alasan untuk membuat ulang produk.

| Area | Evidence pointer | Status | Nilai yang perlu dipertahankan |
| --- | --- | --- | --- |
| Page-owned arithmetic | src/domain/marks.ts:57-91 | VERIFIED_SOURCE | Agent hanya mengembalikan rubric line IDs; page menjumlahkan points |
| Redacted rubric | src/domain/marks.ts:30-38,57-62 | VERIFIED_SOURCE + tests | Point values/pass boundary tidak masuk agent view |
| Derived holds | src/domain/session.ts:197-243 | VERIFIED_SOURCE + tests | Hold diputuskan ulang dari state dan emphasis, bukan dipercaya dari model |
| Stale revision | src/domain/session.ts:312-318,359-367,427-464 | VERIFIED_SOURCE + tests | Caller wajib membaca ulang setelah revision bergerak |
| Atomic batch | src/domain/session.ts:359-423 | VERIFIED_SOURCE | Unknown/already-released ID menolak seluruh batch |
| Prompt-injection quarantine | src/domain/session.ts:104-123,385-390 | VERIFIED_SOURCE + tests | Instruksi ke marker tidak memperoleh mark dan naik ke human review |
| Agent boundary guard | src/tools/agent-boundary.ts:32-107 | VERIFIED_SOURCE + tests | Numeric allowlist dan text canary fail closed |
| Shared state | src/ui/useMarkingSession.ts:19-36 | VERIFIED_SOURCE | UI dan tools membaca/menulis Session yang sama, termasuk latest-ref manual guard |
| Human-only release | src/domain/session.ts:446-502, src/ui/ActionBar.tsx:77-97 | VERIFIED_SOURCE + historical dispatch | Tidak ada confirm_release tool; final action ada di UI |
| Real registration surface | src/tools/webmcp.ts:613-727 | VERIFIED_SOURCE + historical artifact | document.modelContext/fallback dan AbortSignal ditangani |
| Registry/UI parity | src/tools/webmcp.ts:729-788, src/ui/AgentPanel.tsx:163-185 | VERIFIED_SOURCE + tests | Panel memakai registration/payload builder nyata, bukan daftar mock terpisah |
| Synthetic data disclosure | src/data/fixtures.ts:1-18, SECURITY.md:11-16 | VERIFIED_SOURCE | Tidak ada real student PII, backend, account, atau network |
| Monochrome accessible intent | src/styles.css, style/contrast/render tests | VERIFIED_SOURCE + historical browser | Palette/token/CSP/landmark/focus diuji secara terukur |

### 3.1 Evidence package saat ini dan batasnya

Artefak package menyimpan:

- docs/evidence/browser-session.json: local 127.0.0.1, Chrome/151, 44/44 checks, layout/CSP/AX/contrast/responsive/no off-site request, form conflict, and human release transitions;
- docs/evidence/webmcp-invocation.json: local CDP WebMCP, 19/19 checks, including unknown rubric-line,
  duplicate-operation
- docs/evidence/native-registry.json: the nine native registrations observed in that same local
  production-build run;
- docs/evidence/failure-recovery.json: a redacted local CDP trace with 27/27 continuous journey
  checks, including human decline, reload, re-stage, and confirm;
  refusal, stale refusal, injection quarantine, stage, dan tidak adanya confirm_release;
- package docs menyebut 125 tests, typecheck, dan build; older 110/37 figures remain historical only.

Evidence package sekarang mencerminkan run writable terbaru pada 2026-09-02: suite Node yang sama dengan script package lulus 125/125, typecheck lulus, build lulus, browser checks lulus 44/44, WebMCP dispatch checks lulus 19/19, dan failure/recovery journey lulus 27/27. Wrapper pnpm pada rerun kandidat terhenti sebelum test karena SQLite store workspace tidak writable; hasil direct Node yang setara tetap lulus. Catatan EROFS dari audit environment sebelumnya tetap historis dan tidak boleh menggantikan hasil writable tersebut. Run ini menggunakan Node 26 lokal; Node 22/CI, hosted HTTPS, public repository, natural-language model replay, dan validasi manusia masih terbuka.

## 4. Temuan prioritas tinggi

Severity digunakan untuk memisahkan risiko: P0 dapat menggagalkan submission atau membuat klaim utama tidak dapat dibuktikan; P1 menurunkan ceiling atau kepercayaan; P2 polish/maintainability setelah bukti inti ada.

### H-01 / P1 — Human confirm dan decline tidak tercatat sebagai audit event (closed)

**Evidence (historical snapshot):** src/domain/session.ts:262-278 originally defined the only helper commit that wrote a Receipt. The implementation now routes confirmRelease and declineRelease through that helper, and AgentPanel renders their exact receipt revisions in the timeline.

**Masalah konkret (historical):** setelah request release, revision dapat bergerak dari misalnya 3 ke 4 tanpa receipt human release event. Timeline kemudian menampilkan receipt terakhir sebagai revision berurutan berdasarkan array index, bukan revision aktual. Wording “every write” juga menjadi tidak tepat karena final human write tidak ada di ledger. Decline memiliki masalah yang sama, sehingga rejection/recovery tidak terlihat sebagai event.

**Dampak:**

- Execution: juri tidak melihat final state transition yang lengkap;
- WebMCP Leverage: klaim bahwa page owns release tidak memiliki receipt final yang dapat dibandingkan dengan request;
- Potential Impact/Trust: auditability berhenti tepat sebelum keputusan penting;
- debugging: revision ID dan timeline dapat berbeda setelah confirm/decline.

**Perbaikan yang disarankan:**

1. Pisahkan AgentReceipt dan PageAuditEvent, atau perluas union receipt dengan page-only human release events.
2. Simpan requestReceiptId, fromRevision, toRevision, actor=human, jumlah item, dan outcome. Jangan mengembalikan daftar held/identity/points pada payload agent.
3. Render event final di audit rail dan timeline dengan revision aktual, bukan index + 1.
4. Pastikan double click, refresh, dan stale hold tidak membuat dua final events.

**Acceptance tests:**

- confirm menambah tepat satu event page-owned dan melepaskan hanya intersection yang masih releasable;
- decline menambah satu event dan tidak melepaskan apa pun;
- event menghubungkan request receipt dengan final action;
- timeline tidak melompati revision atau menamai event dengan index yang salah;
- agent-facing projection tetap tidak mengembalikan detail final yang terlarang.

### H-02 / P1 — Schema disebut strict, tetapi object/array contract masih longgar (closed)

**Evidence:** komentar src/tools/webmcp.ts:91-113 menyatakan loose schema/strict code dan readFindings di :114-132 menyatakan findings “must be exactly” { answerId, foundLineIds }. Namun:

- ANSWER_ID_ARG di :230-234 tidak memiliki additionalProperties:false;
- item findings di :350-357 tidak memiliki additionalProperties:false;
- array findings tidak mempunyai minItems, maxItems, atau batas panjang;
- readFindings menerima extra keys dan mengabaikannya;
- duplicate answer IDs dan duplicate line IDs diterima; duplicate line IDs didedupe kemudian oleh computeMark, sementara duplicate answer IDs diproses berurutan dan dapat mengubah fingerprint/unstable state.

**Masalah konkret:** contract yang dibaca model memberi kesan lebih ketat daripada yang sebenarnya ditegakkan. Model atau integrator yang mengirim metadata tambahan tidak menerima refusal, sehingga reproduksi dan debugging menjadi kurang deterministik.

**Perbaikan yang disarankan:**

1. Tambahkan additionalProperties:false pada root dan setiap object schema.
2. Tetapkan minItems:1, maxItems yang masuk akal, maxLength untuk IDs, dan uniqueItems bila semantik memang unik.
3. Putuskan secara eksplisit apakah duplicate answer ID adalah invalid, atau apakah “last finding wins” merupakan kontrak. Untuk auditability, invalid whole-batch lebih aman daripada implicit last-wins.
4. Validasi schema dan parser dari satu definisi, atau tambahkan contract test yang membandingkan semua field schema dengan parser.

**Acceptance tests:** extra key, empty ID, oversize batch, duplicate answer, duplicate line, unknown line, dan numeric/string revision semuanya mempunyai hasil refusal yang terstruktur dan tidak membocorkan angka page-owned.

### H-03 / P0 — Model-selected replay belum ada

**Evidence:** docs/evidence/webmcp-invocation.json dan SECURITY.md:208-217 menyatakan CDP script memilih tool dan menulis argumen; tidak ada model yang mencari page, memilih tool, atau menyusun input. scripts/webmcp-invoke.mjs adalah registry dispatch harness, bukan agent transcript.

**Perbaikan wajib:** lakukan satu replay natural-language dengan client/model yang benar-benar memiliki WebMCP access. Simpan prompt, transcript/tool calls, client, model, URL, commit SHA, timestamp, dan limitation. Model harus:

1. menemukan/membaca page;
2. memilih describe_stack/read_rubric/read_answer sendiri;
3. menyusun proposal line IDs;
4. menangani satu stale/invalid response;
5. meminta stage tanpa dapat confirm release;
6. menghasilkan perubahan DOM/revision/receipt yang cocok.

**Kill condition:** DevTools atau script yang menentukan semua tool/argumen tidak boleh diberi label “model replay”.

### H-04 / P0 — Hosted URL belum dibuktikan

**Evidence:** PREFLIGHT.md, PROGRESS.md, dan UPGRADE-PLAN.md:60-64 masih menyatakan hosted URL absent/UNKNOWN. Current artifact memakai 127.0.0.1.

**Perbaikan wajib:** deploy static build yang sama ke provider zero-cost yang dipilih owner, buka dari clean profile/private window, lalu ulangi title, relative asset, CSP, console, focus, overflow, no-login, native registry, dan dispatch. Simpan URL, provider, commit, build hash, browser, timestamp, dan hasil.

### H-05 / P0 — Fresh verification passes on Node 26; Node 22/CI remains unverified

**Evidence (historical snapshot):** the earlier environment audit produced EROFS on the Vite temp cache and TypeScript build info. The current writable run passes 125 tests, 44 browser checks, 19 WebMCP checks, and 27 recovery checks on Node 26; Node 22/CI remains unverified.

**Remaining closure:** repeat test/typecheck/build/browser/webmcp on Node 22/CI and on the final
committed/hosted artifact. Do not disable typecheck, change package manager, or copy old counts.
Keep a manifest:

~~~text
commit SHA
Node + pnpm version
Chromium version + flags
URL
timestamp UTC
test/typecheck/build/browser/webmcp counts
artifact SHA-256
~~~

### H-06 / P0 — Problem/persona masih hypothesis karena GATE-P2 belum dijalankan

**Evidence:** docs/GATE-P2.md:1-5,99-115 secara eksplisit masih Not run. Synthetic answer fixture membuktikan mekanik, bukan demand atau penghematan waktu marker.

**Perbaikan wajib:** satu non-builder menjalankan protokol tanpa tour: dua pertanyaan sebelum app, 90 detik melihat app, dua pertanyaan comprehension, jawaban verbatim, tindakan, dan pass/fail. Satu participant bukan statistik populasi; copy harus tetap menyebut potential dan limitation.

### H-07 / P0 — Video dan submission evidence belum ada

**Evidence:** package belum memiliki video publik; audit video tier A/B menunjukkan alur paling efektif adalah baseline → satu agent action → failure/refusal → approval atau recovery → receipt. Official requirement dan batas durasi harus dibaca ulang pada Official Rules.

**Perbaikan wajib:** video 150–170 detik dari hosted build yang sama, audio/caption jelas, satu failure tidak dipotong, dan tidak mengklaim model/host/user test yang belum direkam. Repo publik, MIT/About, source/instructions, rights/asset disclosure, dan live URL harus konsisten dengan video.

## 5. Temuan source/UI dan reliability

### M-01 / P1 — Tidak ada idempotency key untuk write (closed for session-local WebMCP retries)

**Evidence (historical plus current):** proposeMarks, setMarkingEmphasis, dan requestRelease tetap
bergantung pada expectedRevision, dan setiap write melalui WebMCP kini wajib membawa `operationId`
opaque yang dibatasi panjangnya. Session menyimpan key itu pada receipt internal; key yang sudah
diterima, termasuk ketika dikirim ulang dengan revision terbaru, ditolak sebagai
`duplicate-operation` sebelum state/revision berubah. A reuse across tool names is refused as well.

**Risiko yang tersisa:** key dan receipt hanya hidup di session memory. Refresh atau restart membuat
dedupe history hilang; itu sengaja tidak diposisikan sebagai durable idempotency karena fixture tidak
memiliki backend atau network retry layer.

**Pilihan perbaikan (historical):**

- minimal: dokumentasikan bahwa retry dengan revision baru adalah operasi baru dan tampilkan receipt baru secara jujur;
- lebih kuat, tetapi belum dipilih untuk fixture ini: simpan hasil terakhir dalam session-local dedupe map
  dan kembalikan receipt yang sama untuk retry identik.

Jangan menambah persistence/backend hanya untuk ini. Pilih mekanisme yang tetap deterministic dan tidak memberi agent authority baru.

The selected scoped behaviour is a bounded at-most-once contract: exact no-op proposals and duplicate
pending release requests are refused without revision, and an accepted operation id cannot create a
second receipt within the session. A real hosted product would need durable request storage, which is
outside this prototype's scope.

### M-02 / P1 — Form marking memakai defaultChecked, bukan state terkontrol (closed)

**Evidence (historical):** the old form used `defaultChecked`. `src/ui/Stack.tsx` now uses controlled
checkboxes, captures the opened revision, and blocks save with an explicit reload action when a
concurrent tool or form write moves the session.

**Skenario:** teacher membuka answer, agent mengusulkan mark pada answer yang sama, teacher kemudian menyimpan form lama. Payload manual dapat menimpa agent result berdasarkan tampilan yang tidak lagi merepresentasikan session terbaru.

**Perbaikan (implemented):** controlled checked + opened answer/revision state. Saat revision berubah,
form menampilkan conflict alert, disables its stale save, and offers “Reload current mark” without
silently discarding the newer session. Submit juga meneruskan `revisionAtOpen` ke `readLatest()` yang
berbasis ref sebelum memanggil reducer, sehingga race sebelum React menyelesaikan render tetap ditolak
sebagai stale.

**Acceptance:** external session update, dirty form, stale save, dan answer switching tidak boleh menghasilkan mark berdasarkan checkbox yang tidak terlihat oleh user.

### M-03 / P1 — Staged release dapat berubah sebelum confirm tanpa diff yang cukup

**Evidence:** App.tsx:78-83,144-158 menghitung stackMoved dan confirmRelease di session.ts:390-398 melakukan intersection ulang. ActionBar menjelaskan bahwa count di atas adalah current count (ActionBar.tsx:68-72), tetapi button tetap dapat mengirim setelah state berubah.

**Risiko/keuntungan:** recheck adalah safety property yang benar—hold baru menang—namun juri dapat melihat “Send N marks” berubah dari request tanpa daftar perubahan atau acknowledgement baru. Itu terlihat seperti silent mutation.

**Current closure:** the action bar now prints the requested count and the current re-decided count
when the staged set changes, while confirmRelease still intersects the request with the current
releasable set.

**Perbaikan pilihan:**

1. Tampilkan requested count → current safe count dan reason “recomputed after revision”; atau
2. Jadikan stage stale sebagai refusal yang meminta re-stage, jika ingin semantik paling mudah dipahami.

Pilihan harus dicatat sebagai decision; jangan menghapus recheck safety.

### M-04 / P1 — Refusal ada di domain, tetapi artefak judge harus tetap terlihat

**Evidence:** tool refusal dikembalikan melalui `replyRefused` dan UI manual memakai live region.
The local browser/WebMCP artifacts now exercise and record stale, invalid, injection, and missing-tool
refusals; a future hosted/model run must preserve the same visible recovery path.

**Status:** closed for the local transport/browser evidence; hosted/model replay remains open. The
page still does not invent a refusal in the UI without a dispatch that produced it.

### M-05 / P1 — Partial registration failure now has a bounded retry path

**Evidence (historical snapshot):** installWithheldTools originally collected failures and the panel displayed only the refused count. It now aborts a partial registration before exposing a retry callback; the connection panel offers that retry while preserving the ordinary-app fallback.

**Perbaikan (implemented):** ordinary fallback remains; the connection status reports the refused
count and exposes a real retry anchor when the provider can retry. The partial registration is
aborted before retry so already-successful tools are not registered twice. Provider-specific
diagnostics are intentionally not echoed into the page.

### M-06 / P1 — Injection detector hanya mencakup pola bahasa Inggris tertentu (scope clarified)

**Evidence (historical snapshot):** MARKER_DIRECTED_INSTRUCTION originally covered four English regexes. It now normalises Unicode/zero-width spacing and covers the tested direct, role-labelled, generous-scoring, and Indonesian variants; quarantine coverage is still not universal.

**Perbaikan (implemented with bounded scope):** the threat-model scope is explicit: a miss only
removes automatic quarantine, not authority. Multilingual, obfuscated, and Unicode cases are now
tested. Do not say “prompt injection solved”; the supported claim remains “injected text cannot
directly award points or release marks.”

### M-07 / P1 — Residual inference channel harus tetap diaudit setiap perubahan

**Evidence:** SECURITY.md:103-130 dan GATE-W1.md mengakui count, ordering, characters, aliases, dan one-bit heldCount channel. Numeric allowlist tidak dapat mendeteksi leak berbentuk nama/urutan.

**Perbaikan:** setiap perubahan payload wajib mengulang:

- count/ordering complement analysis;
- receipt answer-ID analysis;
- error-message analysis;
- alias/character-length analysis;
- one-answer-at-a-time probing.

Dokumentasikan residual bound, jangan mengklaim information-theoretic perfection.

### M-08 / P1 — Tool result error path belum memiliki typed internal failure envelope (closed)

**Evidence (historical snapshot):** reply() ran assertAgentSafe, but handlers called port.read() and
port.write() without a global wrapper. The current `guardTool` catches unexpected port, serializer,
or boundary failures and returns the fixed `internal-error` recovery envelope.

**Perbaikan (implemented):** the boundary wrapper returns an envelope without numbers, stack traces,
or fixture text. Tests cover a throwing reader, and registration partial failure has a retry path;
page diagnostics remain fixed rather than copying private error details.

### M-09 / P1 — confirmRelease mempertahankan marks; semantik count perlu dipertegas (closed)

**Evidence:** confirmRelease hanya menambah releasedAnswerIds; marks tidak dihapus (session.ts:393-398). stackPayload menghitung markedCount dari Object.keys(session.marks) (webmcp.ts:150-167), sehingga released answer tetap terhitung marked dan state-nya menjadi released.

Ini memang kontrak yang dipilih: `marked` berarti pernah memiliki page-side mark, sedangkan
`released` berarti sudah dikirim dan tidak lagi actionable. UI menampilkan released rows sebagai
`sent`, dan tool payload membedakan `markedCount`, `releasedCount`, dan `releasableCount`.

**Perbaikan (implemented):** pertahankan history, expose terminology yang tidak ambigu di page UI
and tool payload, and keep these invariants in the test suite:

- released answer tidak dapat ditandai ulang;
- releasedCount meningkat tepat sekali;
- releasableCount turun ke zero untuk item yang dikirim;
- markedCount disebut “ever marked” bila itu maksudnya.

### M-10 / P1 — Test absence boundary dulu bergantung pada pencarian string source (closed)

**Evidence (historical snapshot):** `tests/webmcp.test.mts` dulu mengandalkan `source.includes("confirmRelease")` sebagai guard utama.

**Perbaikan (implemented):** daftar registered tool names sekarang menjadi assertion utama, native registry
dan negative browser probe menguji surface aktual, dan static source check hanya menjadi defense in depth
untuk memastikan human page function tidak masuk ke tool builder. Agent UI sendiri hanya menampilkan
sembilan tool yang benar-benar terdaftar.

### M-11 / P1 — Fixture invariant yang dirujuk tidak ada di inventory test

**Evidence (historical snapshot):** src/data/fixtures.ts:7-13 referred to a missing tests/fixtures.test.mts.
The comment now points to the existing views and boundary tests, and marks.test.mts contains the
fixture identity/positive-value checks.

**Dampak:** pembaca mengira property point/count collision dan answer-length invariant memiliki suite khusus, padahal sebagian assertion tersebar di marks, views, render, dan boundary tests.

**Perbaikan (implemented):** the pointer was corrected and the fixture checks were added to the
existing marks test file. The original alternatives were:

- buat tests/fixtures.test.mts yang benar-benar menguji semua invariant yang dirujuk;
- atau ubah komentar menjadi pointer ke test yang ada dan tulis invariant sebagai named exported assertion/helper.

Jangan membiarkan documentation pointer yang tidak dapat dibuka.

### M-12 / P1 — Tidak ada property/fuzz test untuk boundary dan payload

**Evidence (partially closed):** deterministic property-style coverage now sweeps all subsets of
duplicate and unknown line ids, plus fixture invariants. Full fuzz/property tooling is still not
part of the package.

**Perbaikan minimal tanpa dependency baru (implemented in the current slice):** deterministic table
generator untuk:

- semua subset rubric line IDs;
- duplicate/unknown IDs;
- arbitrary extra object keys;
- answer lengths di sekitar thresholds;
- all emphasis transitions;
- repeated stale revisions;
- randomized tool result payloads yang mengandung numbers/names.

Property penting: no unknown line earns points; no agent projection contains forbidden page-owned numbers; monotonic emphasis; no released answer is releasable; every write revision/receipt invariant holds.

### M-13 / P1 — No-op emphasis masih membuat receipt/revision baru (closed)

**Evidence (historical):** setMarkingEmphasis used to accept `wanted === current` and call commit.
It now refuses with `no-change` before a receipt or revision is created.

**Historical risk:** model retrying “set current emphasis” could write a receipt without a change,
which made idempotency and the timeline weaker.

**Current contract:** no-op produces a structured refusal without a revision; tests and the refusal
table document it.

### M-14 / P1 — Fixture structural validation belum terlihat (partially closed)

**Evidence:** the current tests cover fixture identity, matching question ids, positive page-owned
values, and answer-length collision properties. `createSession` still accepts typed inputs without
runtime validation, which is acceptable for this fixture-only prototype but remains an integration
boundary if data ever becomes external.

**Perbaikan:** validasi fixture saat development/test: unique answer IDs, matching question IDs, unique rubric line IDs, non-negative finite points, valid pass boundary, non-empty aliases/bodies, no released IDs at start. Fail early sebelum tool registry.

### M-15 / P1 — React error boundary dan malformed runtime data belum diuji (closed for render path)

**Evidence:** the current source has a page-level `ErrorBoundary` with a fixed recovery message and
render tests cover its non-diagnostic fallback. Static TypeScript still does not validate arbitrary
runtime data, so malformed provider/session inputs remain outside this fixture-only boundary.

**Perbaikan:** tambahkan page-level error boundary untuk menampilkan recovery message yang tidak menghapus synthetic disclosure atau human authority. Test malformed tool result/session dan pastikan page tidak blank tanpa penjelasan. Jangan menelan error secara diam-diam.

### M-16 / P1 — Hosted subpath/base path belum dibuktikan

**Evidence:** vite.config.ts menggunakan base "./"; index.html source memakai /src/main.tsx untuk dev. Local build berhasil secara historical, tetapi subpath hosting dan clean profile belum diuji.

**Perbaikan:** deploy pada path aktual, probe asset URLs/script/CSP/favicon, reload langsung pada nested route bila ada, dan simpan screenshot/console. Pastikan dev-only absolute source path tidak menjadi production asset reference.

### M-17 / P1 — CSP policy hanya meta tag; header guarantees tidak tersedia

**Evidence:** SECURITY.md:132-185 sudah mengakui static host tidak dapat memberi frame-ancestors, X-Frame-Options, COOP/COEP, atau Permissions-Policy override.

**Perbaikan:** jangan memperluas klaim security. Pada hosted preflight, catat response headers aktual, frame behavior, secure context, dan apakah tools permission default sesuai. Jika framing menjadi risiko, pilih host/header yang dapat mengaturnya atau tulis limitation secara eksplisit; jangan berpura-pura meta CSP menggantikan header.

### M-18 / P1 — Performa belum mempunyai baseline terukur

**Evidence:** historical browser artifact mengukur layout/focus/request, bukan cold render, warm render, long task, input delay, atau dispatch-to-DOM latency.

**Perbaikan:** ukur pada hosted build yang sama:

- cold/warm first contentful/interactive render;
- dispatch tool → state update → visible DOM;
- long tasks saat membuka answer, stage, dan scroll;
- 1440px/420px scroll/focus responsiveness;
- bundle size gzip/brotli.

Gunakan repeat count dan environment; jangan mengklaim angka headless sebagai performa universal. Optimasi hanya jika data menunjukkan bottleneck.

### M-19 / P1 — Accessibility evidence belum mencakup listener assistive technology

**Evidence:** browser artifact membaca AX tree dan focus, tetapi README.md dan PREFLIGHT.md menyatakan tidak ada screen-reader session atau human listener.

**Perbaikan:** keyboard-only run + satu listener yang belum membangun app. Catat landmark order, live-region announcement, details/summary state, checkbox labels, disabled human-only button, focus setelah stage, dan apakah agent/page boundary dapat dipahami tanpa visual.

### M-20 / P1 — First viewport terlalu padat untuk judge path

**Evidence:** UI tiga kolom dan halaman panjang dimaksudkan sebagai readable workspace; target evidence/browser mengukur layout, tetapi GATE-P2 belum menguji comprehension.

**Risiko:** juri melihat banyak copy/tool rows sebelum memahami satu hook.

**Perbaikan:** jangan menghapus kedalaman. Buat satu “judge focus” yang muncul pada viewport awal: satu answer, satu redacted agent payload, satu hold reason, satu refusal, dan human-only gate. Detail comparison/other answers tetap di bawah atau disclosure. Validasi perubahan lewat GATE-P2, bukan preferensi pembuat.

## 6. Enhancement matrix untuk empat kriteria juri

Official Rules memiliki empat kriteria dengan bobot sama. W/X/I/C di bawah adalah subcriteria internal; bukan skor resmi. Baris “evidence required” adalah bukti yang harus dikumpulkan sebelum mengklaim peningkatan.

### 6.1 WebMCP Leverage (W1–W5)

| Subcriteria | Kekuatan sekarang | Pengembangan terbaik | Evidence required | Failure condition |
| --- | --- | --- | --- | --- |
| W1 Essentiality | Page-scoped answer/rubric state dan redaction terlihat pada source | Tampilkan counterfactual: chatbot/API luar harus menduplikasi arithmetic/secret atau kehilangan same-page state | Hosted model replay + before/after transcript | Tool call hanya script, atau page tetap sama tanpa WebMCP |
| W2 Tool quality | 9 tool, read/write hints, descriptions, refusal path | Strict schemas, bounds, duplicate semantics, one real payload per key tool | Schema contract tests + registry capture | Extra fields silently accepted atau tool tour tidak terbaca |
| W3 Context/authority | Revision, emphasis monotonicity, human release | Add final page audit event dan explicit staged revision | Unit + browser stale/release run | Confirm event missing atau stale stage silently sends |
| W4 Shared state | SessionPort dipakai UI/tools | Show DOM/revision/receipt transition from model call | Model replay with DOM capture | Panel/payload hanya mock atau separate state |
| W5 Safety/recovery | Injection quarantine, stale, unknown, no confirm tool | Typed error envelope, schema negative cases, refusal-first judge path | Boundary/fuzz + hosted refusal artifact | Number/name leak, agent can release, recovery hidden |

### 6.2 Execution (X1–X5)

| Subcriteria | Kekuatan sekarang | Pengembangan terbaik | Evidence required | Failure condition |
| --- | --- | --- | --- | --- |
| X1 Complete loop | Source punya read → propose → stage → human confirm | Satu resettable 90–120s path dengan final event | Fresh/hosted run and video | Juri harus merakit urutan sendiri |
| X2 Correctness | Pure arithmetic, holds, stale tests | Invariant tests for confirm/decline/idempotency/duplicates | Full test artifact from same commit | Revision/receipt mismatch atau send wrong set |
| X3 UX/demo clarity | Monochrome contract/workspace and visible absence | Hook in first 8s; one focused answer; actual refusal shown | GATE-P2 comprehension + final video | Copy dense, failure cut, no visible WebMCP action |
| X4 Responsiveness | Historical layout/overflow/focus/CSP checks | Measure hosted latency and mobile keyboard/scroll | Performance artifact + manual run | Tool/UI hangs or layout breaks at subpath/mobile |
| X5 Reproducibility | Pinned dependencies, scripts, MIT file | Public repo/About, clean clone, hosted URL, exact manifest | Hashes, CI/clean-profile run | Local-only, missing instructions, stale counts |

### 6.3 Potential Impact (I1–I5)

| Subcriteria | Kekuatan sekarang | Pengembangan terbaik | Evidence required | Failure condition |
| --- | --- | --- | --- | --- |
| I1 Problem clarity | Short-answer marking mechanic jelas di fixture | Narrow persona: marker/reviewer triaging short-answer batch | GATE-P2 pre-demo Q1/Q2 verbatim | “For everyone” atau invented time savings |
| I2 Audience specificity | Teacher-facing language and aliases | State who uses it, when, and what they refuse to delegate | One non-builder session + copy | Persona hanya asumsi author |
| I3 Before/after | Unattended outcome page projection exists | Show same pile before vs after recognition + held subset | Hosted judge path with counts/page view | No measurable workflow difference |
| I4 Human-agent split | Recognizer ≠ grader; human release | Explain why language recognition can be delegated, judgement cannot | Model transcript + human action receipt | Agent computes/releases outcome |
| I5 Credibility/trust | Synthetic disclosure, no PII/network | GATE-P2 result, limitation, rights, security scope | Verbatim record + rights attestation | Synthetic presented as real impact or “solved injection” |

### 6.4 Creativity & Ambition (C1–C5)

| Subcriteria | Kekuatan sekarang | Pengembangan terbaik | Evidence required | Failure condition |
| --- | --- | --- | --- | --- |
| C1 Original mechanic | Information boundary is more than chatbot UI | Make one memorable scene: page shows arithmetic while agent payload cannot | Video + side-by-side payload/page | Generic AI grading dashboard |
| C2 Human-agent relationship | Agent recognizer, page authority | Give agent a precise role and refusal language; no avatar gimmick | Tool description + replay | Agent role is “chat assistant” only |
| C3 WebMCP novelty | Same-page context and bounded tools | Show why page-local state/permission matters vs external API | Counterfactual narration + run | API would provide identical experience |
| C4 Differentiation | Distinct from Flowline/game and benchmarks | Keep education/marking domain, arithmetic boundary, human release | Two-submission separation matrix | Copies Cograph/MCPencil/Flowline loop |
| C5 Ambition/scope | Deep security idea in small static app | Finish one narrow path; add no speculative backend | Release checklist + video | Feature sprawl prevents evidence |

## 7. Pelajaran yang aman dipinjam dari tier A/B dan video

Audit komparatif tidak memberi nilai resmi; ia menunjukkan pola bukti yang mudah dinilai.

| Sumber benchmark | Pola yang terbukti berguna | Adaptasi Withheld | Yang tidak boleh disalin |
| --- | --- | --- | --- |
| Ceiling | Refusal-first, least authority, one-use approval, receipt/recovery | Mulai dengan invalid/stale, lalu stage dan human confirm | Klaim “50 checks” tanpa artifact yang sama |
| HowToPC | Incompatible request ditolak; canonical state | Tunjukkan payload yang mencoba membawa point/pass authority dan ditolak | Domain/wording project lain |
| StillHere | Conflict/stale → reviewed outcome | Hubungkan answer evidence → hold → human decision | Klaim legal/real-world truth dari fixture |
| Catchfly | Observation → diagnosis → artifact/eval | Jadikan payload/refusal/receipt inspectable artifact | Menambah dashboard evaluasi tanpa kebutuhan |
| VT | Bounded workspace, diff, approval, restore | Contract column + staged/recomputed diff | Tool count besar untuk demo singkat |
| Respira | Fallback dan control path jujur | Ordinary web fallback diberi label, tidak diam-diam ganti protocol | Menyembunyikan unsupported client |
| Cograph/MCPencil | Agent punya role/seat/capability memorable | “Recognizer, not grader” sebagai role | Avatar/game framing pada utility marking |
| 2D WebMCP | Semantic focus, live notification, navigable result | Keyboard/deep-link ke answer dan gate | Menganggap AX tree sebagai screen-reader user test |
| Happy Coffee | Persona profesional dan prepare ≠ publish | Recognition → review → release | Klaim productivity tanpa measurement |

Kesimpulan lintas benchmark: ceiling Withheld naik melalui **evidence density**, bukan jumlah fitur. Satu refusal nyata dan satu final receipt lebih berharga daripada sepuluh tool baru yang tidak dipakai dalam judge path.

## 8. Judge path yang direkomendasikan

Path ini adalah rancangan verifikasi, bukan klaim bahwa sudah dijalankan.

### 8.1 Versi 90–120 detik

1. **0–8s — Hook:** “The agent brings language. The page keeps arithmetic and release authority.” Tampilkan satu answer dan rubric page-side.
2. **8–25s — Read:** model memilih describe_stack, read_rubric, dan read_answer; panel menunjukkan payload tanpa points/pass boundary.
3. **25–45s — Propose:** model mengirim line IDs dengan revision; same answer row berubah menjadi marked/held; page-owned total tetap hanya di kolom teacher.
4. **45–60s — Explain:** page menunjukkan hold reason, evidence chain, dan unattended counterfactual; agent hanya menerima redacted projection.
5. **60–75s — Failure:** kirim stale/invalid request; result menjadi structured refusal dan live region meminta read again. Tunjukkan no state mutation.
6. **75–95s — Stage:** agent/request membuat staged release; button final tetap human-only dan tidak ada operasi release pada UI agent.
7. **95–110s — Confirm/decline:** manusia memilih satu jalur; final page audit event dan receipt muncul, dengan set yang benar-benar dikirim.
8. **110–120s — Limitation:** synthetic/alias-only, static session, browser/model version, fallback, dan URL/repo yang cocok.

### 8.2 Bukti yang harus tampak, bukan hanya diucapkan

- tool dipilih model, bukan script;
- DOM/revision/receipt berubah dari state yang sama;
- payload agent tidak mempunyai points/pass/distance/hidden-answer identity;
- refusal benar-benar berasal dari invalid/stale call;
- final action hanya dilakukan manusia;
- final audit event cocok dengan state setelah confirm/decline;
- fallback dan limitation terbaca tanpa narasi pembuat.

## 9. Verification matrix

| Layer | Command/aktivitas | Saat ini | Required closure | Artifact |
| --- | --- | --- | --- | --- |
| Pure domain | Node tests marks/session/views | Fresh rerun pass: 125 tests across 9 files | Keep hash-bound test log | test log + SHA |
| Tool contract | webmcp, boundary tests | Fresh source/tests plus 19/19 WebMCP dispatch checks | Repeat against final hosted build | JSON test report |
| Render | render.test.mts | Fresh rerun pass | Keep hash-bound test log | test log |
| Type/build | pnpm typecheck, pnpm build | Fresh Node 26 writable pass; build hash recorded | Repeat on Node 22/CI and final hosted build | build manifest/hash |
| Local browser | pnpm browser | 44/44 on Node 26 | Repeat on final committed source | browser-session.json |
| Local registry | pnpm webmcp | 19/19 latest, script-composed; unknown rubric-line, duplicate, and stale retries refused | Keep as transport proof | webmcp-invocation.json + native-registry.json |
| Local recovery | failure-recovery.mjs | 27/27 continuous local journey; decline, reload, re-stage, and confirm are receipt-backed | Repeat on final hosted build where applicable | failure-recovery.json |
| Hosted browser | clean profile + HTTPS | Absent | URL open, assets/CSP/focus/no console | hosted-session.json |
| Native hosted WebMCP | client/flag | Absent | registry + dispatch on hosted URL | hosted-webmcp.json |
| Model replay | authorized Sol/Terra/Chrome path | Absent | model chooses tools/args | transcript/video |
| Human problem | GATE-P2 | Not run | non-builder verbatim session | gate result |
| Accessibility | keyboard + listener | AX tree only | manual listening/focus notes | accessibility log |
| Performance | hosted measurements | Absent | cold/warm/dispatch/input baseline | perf JSON |
| Rights/release | owner attestation | MIT file only | repo/About/assets/video rights | preflight record |

## 10. Prioritized work register

### P0 — kill gates sebelum menyebut release candidate

| ID | Work item | Owner/dependency | Done when |
| --- | --- | --- | --- |
| P0-01 | Re-run test/typecheck/build/browser/webmcp pada writable env | Environment/implementer | Same commit has fresh logs and hashes |
| P0-02 | Freeze one resettable judge fixture | Implementer | One path starts revision 1 and ends with known receipt |
| P0-03 | Add/verify hosted static URL | Owner + provider | Clean profile opens HTTPS and assets/CSP/native probe pass |
| P0-04 | Execute natural-language model replay | Owner/client | Transcript proves model selection and limitation |
| P0-05 | Run GATE-P2 | Owner + non-builder | Verbatim answers and pass/fail recorded |
| P0-06 | Record 150–170s video | Owner | Hosted build, audio/caption, failure/recovery, no false claims |
| P0-07 | Public repo/About/MIT/rights/preflight | Owner | Form URLs and repository are mutually consistent |

### P1 — highest score/quality return setelah P0

| ID | Work item | Evidence/test |
| --- | --- | --- |
| P1-01 | Page-owned final confirm/decline audit event | session/render/browser tests |
| P1-02 | Strict schemas and parser/schema parity | contract negative/property tests |
| P1-03 | Decide idempotency/no-op write semantics **(closed for session-local agent retries)** | repeated-call tests + docs |
| P1-04 | Fix controlled form/revision conflict behavior | render/browser stale-form test |
| P1-05 | Make staged/current release diff explicit | browser judge path |
| P1-06 | Typed internal error envelope | port/guard throw tests |
| P1-07 | Clarify marked/released/actionable counts | domain/view/invariant tests |
| P1-08 | Resolve fixtures test pointer | add test or correct comment |
| P1-09 | Add fixture validation and property tests | test report |
| P1-10 | Repeat GATE-W1 after every payload change | boundary/inference artifact |
| P1-11 | Add refusal-first visible judge state | hosted video + render test |
| P1-12 | Manual keyboard/screen-reader listening | accessibility log |
| P1-13 | Measure hosted performance | perf artifact, no universal claim |

### P2 — polish setelah evidence tidak lagi kosong

| ID | Work item | Guardrail |
| --- | --- | --- |
| P2-01 | Typography/spacing/empty/error copy polish | GATE-P2 recheck |
| P2-02 | Caption/transcript and screenshot consistency | hosted build hash |
| P2-03 | CI Node 22 | do not hide local failure |
| P2-04 | React error boundary | preserve transparent error state |
| P2-05 | Favicon/manifest/subpath polish | hosted asset probe |
| P2-06 | Persistence/undo only if user evidence requires it | never weaken human authority |
| P2-07 | Bundle optimization only after measurement | before/after perf artifact |

## 11. Hal yang sebaiknya tidak dikembangkan sekarang

Item berikut tidak meningkatkan skor secara proporsional sebelum P0/P1 tertutup:

- backend, database, account, authentication, analytics, atau telemetry;
- LLM scoring service yang memindahkan arithmetic/authority keluar page;
- confirm_release tool, auto-send, atau hidden bypass;
- avatar/agent persona animation yang tidak memperjelas boundary;
- lebih banyak tool yang tidak dipakai pada judge path;
- persistence/undo yang membuat seolah marks dapat ditarik kembali setelah dikirim;
- broad “AI grading” claims atau real-school impact claims tanpa primary evidence;
- 3D/WebGL/physics untuk Withheld; itu milik visual game Flowline, bukan tesis information-boundary Withheld.

## 12. Definition of done Withheld

Withheld boleh disebut **release candidate** hanya jika semua item berikut memiliki artefak dari commit/build yang sama:

- [ ] Full test, render, typecheck, build, local browser, dan registry dispatch pass;
- [ ] Hosted HTTPS URL terbuka di clean profile tanpa setup author;
- [ ] Relative assets, CSP, secure context, console, focus, dan fallback diverifikasi;
- [ ] Native hosted registration/dispatch terbukti, atau limitation ditulis;
- [ ] Model benar-benar memilih tool dan menyusun argumen dalam replay terekam;
- [ ] Satu non-builder menyelesaikan GATE-P2 dan jawaban disimpan verbatim;
- [ ] Judge path memperlihatkan read → proposal → hold → refusal → stage → human confirm/decline → final audit event;
- [ ] Final human event masuk receipt/timeline tanpa memberi agent authority;
- [ ] Strict schema/parser parity dan negative/property tests pass;
- [ ] Tidak ada point value, pass boundary, distance, hidden answer identity, atau release authority di agent-facing result;
- [ ] Public repository, MIT/About, source/instructions, rights, synthetic disclosure, dan English submission copy konsisten;
- [ ] Video publik <180 detik, berasal dari hosted build, audio/caption jelas, dan tidak memotong failure/recovery;
- [ ] README, SECURITY, PROGRESS, PREFLIGHT, RUNBOOK, SUBMISSION-TEXT, evidence JSON, screenshot, dan video tidak menyebut status yang lebih tinggi daripada buktinya.

## 13. Honest residual claims

Bahkan setelah semua item di atas selesai, klaim berikut tetap harus dibatasi:

- Satu GATE-P2 bukan statistik semua marker atau institusi.
- Satu model/client/browser replay hanya berlaku untuk environment dan timestamp yang dicatat.
- Synthetic fixtures tidak membuktikan dampak pada kelas nyata.
- Static page tidak memberi server-side authorization atau durable audit storage.
- Omission/count/ordering masih dapat membawa bounded inference signal.
- Quarantine regex bukan solusi universal prompt injection; authority boundary-lah yang mencegah direct award/release.
- Historical benchmark tier A/B dan skor internal bukan penilaian resmi juri.
- Screenshot target/reference bukan bukti hosted/native.

## 14. Dokumentasi yang menjadi source of truth

| File | Peran |
| --- | --- |
| docs/DEEP-AUDIT.md | Temuan source-level dan enhancement register ini |
| docs/UPGRADE-PLAN.md | Urutan P0–P2 dan acceptance backlog utama |
| docs/PROGRESS.md | Status measured/current; jangan menyalin klaim historical sebagai fresh |
| docs/TESTING.md | Command, test scope, dan batas bukti |
| docs/GATE-W1.md | Audit numeric/name/inference boundary |
| docs/GATE-P2.md | Primary user/comprehension evidence |
| docs/PREFLIGHT.md | Requirement resmi, hosting, public repo, rights, video |
| docs/RUNBOOK.md | Clean build/judge walkthrough |
| docs/SUBMISSION-TEXT.md | Copy final setelah hosted/model/user evidence |
| ../SECURITY.md | Threat model dan static-host limitation |
| ../../../docs/research/46-tier-ab-audit-and-two-submission-upgrade-plan.md | Comparative tier A/B and two-submission lessons |
| ../../../docs/research/47-devpost-video-audit-2026-09-02.md | 13-page/video audit and transferable presentation patterns |

**Rule:** bila dokumen lain menyatakan status berbeda, gunakan artifact terbaru yang memiliki commit, URL, environment, dan timestamp; jangan menaikkan status hanya karena source terlihat masuk akal.
