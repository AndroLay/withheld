# Withheld — evidence-first upgrade plan

Snapshot: 3 September 2026 (WITA)
Status: rencana perbaikan dan audit; bukan bukti release, bukan izin deploy, dan bukan izin submit.

Dokumen ini adalah backlog terpusat untuk memperkuat Withheld setelah:

1. audit seluruh 13 halaman Devpost dan video yang ditemukan;
2. audit mendalam tier A/B serta 30 record benchmark;
3. pemeriksaan source, test, browser artifact, dan dokumen package Withheld.

Dokumen ini tidak menggantikan status ledger. Angka hanya dianggap benar jika ada
artefak atau perintah yang dapat diulang. Rujukan komparatif tetap
[audit tier A/B](../../../docs/research/46-tier-ab-audit-and-two-submission-upgrade-plan.md)
dan [audit 13 video](../../../docs/research/47-devpost-video-audit-2026-09-02.md).
Temuan source-level yang mendasari backlog ini dirinci di
[DEEP-AUDIT.md](DEEP-AUDIT.md), termasuk final human receipt, schema strictness,
idempotency, form revision, property test, performance, dan accessibility.

## Status update — 3 September 2026

The first reliability slice is implemented in the Withheld package. Closed items include
human confirm/decline receipts and timeline events, closed and bounded WebMCP schemas, runtime
oversized/duplicate-input refusal, no-op and duplicate-release refusal, a controlled
revision-aware marking form, runtime generated-text canary enforcement with an explicit raw
answer exception, a generic tool failure envelope, expanded Unicode/multilingual detector
coverage, and evidence metadata with source/build/artifact hashes. The page was rebuilt the same day:
a fourteen-cell spine strip and a view toggle in the opening band, all fourteen queue rows with four
panels each, authority as a 3×5 table in the rail, every arrived call listed in the agent column
including the refused ones, a gate that says when a tool staged the request, and the audit account
and the two slabs under it as disclosures.

Fresh local evidence: 136 tests in 9 files, typecheck, build, 43 browser checks, 17 agent-view
checks, 19 WebMCP CDP checks, and 27 failure/recovery checks pass on Node 26.4.0. This does not
close the external gates: hosted HTTPS, public repository and About licence visibility,
natural-language model replay, GATE-P2, Node 22/CI, manual screen-reader review, and the public
video remain open.

The backlog below remains useful as the acceptance map. Its earlier descriptions of missing
receipts, loose schemas, uncontrolled forms, and absent runtime canary are pre-hardening
findings; do not treat them as current source status.

## Keputusan kerja

- Withheld tetap submission utility/education yang terpisah dari Flowline.
- Thesis produk tetap: **agent brings language; page keeps arithmetic, identity, and
  release authority**.
- Tidak perlu menambah backend, akun, persistence, atau tool kosmetik sebelum
  evidence inti tertutup.
- Tidak perlu mengubah human-only release menjadi otomatis. Ketiadaan
  confirm_release adalah bagian dari desain.
- Semua data demo tetap synthetic dan alias-only.
- Nilai A/B, skor 0–5, dan E0–E4 pada audit participant adalah alat triage internal,
  bukan nilai resmi juri dan bukan bukti bahwa Withheld akan menang.

## Cara membaca evidence

| Label | Arti | Batas klaim |
| --- | --- | --- |
| VERIFIED_SOURCE | perilaku dapat ditelusuri langsung ke source/test | belum berarti berjalan pada host atau dipilih model |
| VERIFIED_ARTIFACT | JSON/screenshot/browser run yang tersimpan | hanya berlaku untuk URL, commit, browser, dan waktu yang tercatat |
| HISTORICAL_LOCAL | hasil run lokal terdahulu yang dicatat package | harus diulang dari build/commit yang akan dikirim |
| SELF_REPORTED | klaim pada README, caption, atau deskripsi peserta | tidak boleh dinaikkan menjadi fakta independen |
| UNKNOWN | tidak ada bukti yang cukup | harus tetap ditulis sebagai gap |

## 1. Audit Withheld saat ini

### 1.1 Yang sudah kuat dan dapat ditelusuri

| Area | Temuan source/artifact | Rujukan |
| --- | --- | --- |
| Thesis | page-owned arithmetic; agent hanya melaporkan rubric ideas | README dan src/domain/marks.ts |
| Tool surface | sembilan tool: enam read-only dan tiga write; confirm_release sengaja tidak terdaftar | src/tools/webmcp.ts; docs/evidence/webmcp-invocation.json |
| Information boundary | point values, pass boundary, page identity, dan release authority tidak dikirim ke agent; numeric allowlist dan text canary fail-closed; toggle agent's view menggambar ulang halaman dari proyeksi itu, dengan 0 figure page-owned pada teks maupun markup dan 132 redaction | src/tools/agent-boundary.ts; src/domain/views.ts; docs/evidence/agent-view-sweep.json |
| Authority | expectedRevision plus single-use operationId, atomic batch, invalid/stale/duplicate refusal, care setting hanya dapat dinaikkan, prompt-injection answer dikarantina | src/domain/session.ts; tests/session.test.mts; tests/boundary-inference.test.mts |
| Shared state | UI manual dan tool memakai SessionPort yang sama; hasil write mengubah revision/hold count yang terlihat | src/ui/useMarkingSession.ts; evidence webmcp-invocation |
| Human boundary | tool dapat stage, tetapi hanya tombol page yang memanggil confirmRelease; gate menyebut bila release di-stage oleh tool call | src/domain/session.ts; src/ui/ActionBar.tsx; tests/webmcp.test.mts |
| UI evidence | tiga kolom monochrome di bawah band pembuka yang memuat spine strip 14 cell dan view toggle; 14 baris queue, tiap baris membuka empat panel; tiga slab di bawah kolom (audit account terbuka, comparison dan limits tertutup); human gate pinned | docs/evidence/browser-session.json; docs/evidence/agent-view-sweep.json |
| Browser artifact | artifact terakhir mencatat 43/43 browser checks, CSP, contrast, AX tree, responsive fold, zero off-site requests, form conflict, and human release transitions | docs/evidence/browser-session.json |
| Registry dispatch | artifact terakhir mencatat 19/19 checks, termasuk unknown rubric-line, duplicate/stale refusal, injection quarantine, staged release, dan confirm_release tidak ditemukan | docs/evidence/webmcp-invocation.json |

### 1.2 Yang belum terbukti atau masih lemah

| Gap | Status evidence sekarang | Mengapa menurunkan skor |
| --- | --- | --- |
| Model memilih tool | UNKNOWN; registry/DevTools script memilih semua call | WebMCP Leverage dan Execution belum terbukti pada perilaku agent |
| Hosted URL | **closed** — `https://androlay.github.io/withheld/` HTTP 200 (2026-09-03 09:01 UTC); `hosted-browser-session.json` 43/43 dan `hosted-webmcp-invocation.json` 19/19 pada 07:44 UTC | tidak lagi menurunkan skor; juri dapat membuka artefaknya sendiri |
| GATE-P2 | belum dijalankan | Potential Impact masih hipotesis dari author |
| Video | belum ada | alur, failure, authority, dan WebMCP thesis belum terlihat dalam batas <180 detik |
| Re-run penuh hari ini | **closed for Node 26 writable environment** | 136 tests, typecheck, build, 43 browser checks, 17 agent-view checks, 19 WebMCP checks, and 27 local recovery checks pass; Node 22/CI remains open |
| Node 22/CI | belum dijalankan | package/CI compatibility masih inferred dari konfigurasi |
| Screen-reader listening | belum dilakukan | AX tree dan named controls bukan bukti bahwa urutan/wording terdengar masuk akal |
| Public repo/license detection | **closed untuk repo** — `AndroLay/withheld` publik, `main` `9cce7d0a`, `gh-pages` `15baf8f0`, dipush 2026-09-03 18:02 UTC; About/license badge belum dikonfirmasi pemilik | requirement repository sudah tertutup; tampilan About tinggal dilihat pemilik di halaman repo |
| Confirmed-release receipt | **closed in source and fresh browser artifact** | confirm/decline add human receipt events with exact revisions; repeat on hosted build |
| Persistence/undo setelah confirm | tidak ada dan sengaja demikian | bukan defect otomatis; jangan ditambah tanpa alasan produk dan waktu |

Catatan verifikasi: artifact lama tetap disimpan sebagai provenance, tetapi evidence terbaru di
`docs/evidence/` berasal dari run Node 26 writable pada 3 September. Kelima capture — browser,
agent-view, native registry, dispatch, recovery — memakai satu `gitSha` `df9608c4`, satu
`sourceSha256`, dan satu `buildSha256`, jadi semuanya menggambarkan satu tree; tree itu masih dirty
dan belum di-commit, jadi release final tetap perlu check yang sama setelah hardening dipublikasikan.

## 2. Apa yang dipelajari dari benchmark terbaik

Audit 13 video memberikan pola yang konsisten. Pola tersebut bukan salinan desain;
yang dipinjam adalah cara membuktikan nilai.

| Benchmark | Sinyal yang terlihat | Adaptasi untuk Withheld |
| --- | --- | --- |
| Ceiling | refusal-first, least authority, one-use approval, rollback/receipt | buka dengan satu permintaan invalid/stale; kemudian tunjukkan stage dan human-only confirm |
| HowToPC | permintaan incompatible ditolak sebelum happy path; state canonical tetap | tampilkan payload yang mencoba membawa point/pass authority dan hasil refusal tanpa leak |
| StillHere | konflik stale → proposal bersitasi → keputusan manusia | buka satu answer, tunjukkan evidence chain, lalu biarkan manusia menentukan release |
| Catchfly | observation → diagnosis → artifact → eval/CI | jadikan redacted payload, refusal, dan receipt sebagai artifact yang dapat diperiksa |
| VT | bounded workspace, diff, approval, restore | tampilkan contract surface dan perbedaan page state/agent state, bukan tool tour |
| Respira | fallback dan perpindahan control path dijelaskan jujur | unsupported browser harus tetap playable dan diberi label, tanpa berpindah jalur diam-diam |
| Cograph / MCPencil / AI Lovey-Dovey | agent punya role/seat/capability yang mudah diingat | pertahankan “recognizer, not grader”; gunakan contract column sebagai role, tanpa menambah avatar gimmick |
| 2D WebMCP | semantic focus, navigable result, live notification | satu answer dan audit reason harus dapat dicapai dari keyboard/deep link; WebGL tidak relevan bagi Withheld |
| Happy Coffee | persona profesional, end-to-end workflow, prepare ≠ publish | jelaskan marking recognition → human review → release; jangan klaim agent mengirim nilai |

### Pelajaran dari seluruh tier A/B

Tiga puluh benchmark A pada ledger memiliki sinyal source/live yang baik, tetapi
tidak ada satu pun yang mendapat E4 pada snapshot tersebut. Lima hanya memiliki
native read-only historis; sisanya terutama E2. Karena itu keunggulan Withheld
tidak akan datang dari menambah jumlah tool, melainkan dari:

1. state deterministik yang dapat diulang;
2. schema dan authority yang sempit;
3. refusal, stale-state, dan recovery yang terlihat;
4. artifact receipt/diff yang menghubungkan input ke hasil;
5. persona dan before/after yang bisa dipahami tanpa penjelasan pembuat;
6. hosted serta model-selected evidence yang tidak dimiliki banyak benchmark.

Rincian basis angka dan keterbatasannya ada di
[deep review 30 records](../../../docs/research/30-deep-review-30-records.md).

## 3. Prioritas perbaikan

Urutan ini memaksimalkan skor yang masih dapat dibuktikan. P0 adalah kill gate;
P1 menaikkan ceiling setelah P0; P2 hanya polish.

### P0 — wajib sebelum release candidate

#### P0-01 — Pulihkan verifikasi yang reproducible

Tindakan:

- jalankan dari checkout yang dapat menulis cache, atau set path cache yang tidak
  mengubah source;
- jalankan pnpm test, pnpm typecheck, pnpm build;
- setelah build yang sama, jalankan pnpm browser dan pnpm webmcp;
- catat commit SHA, Node, Chromium, URL, timestamp, artifact hash, jumlah pass/fail;
- jangan mengganti package manager, menonaktifkan typecheck, atau menyalin angka
  dari run lama.

Acceptance evidence:

- semua suite pass, termasuk render;
- build berasal dari commit yang sama dengan screenshot/video;
- browser-session.json dan webmcp-invocation.json baru memiliki
  notClaimed yang tetap menyatakan “bukan model replay”;
- tidak ada console error atau request off-site.

Mengapa prioritas pertama: hasil lokal yang tidak dapat diulang membuat semua
klaim Execution dan WebMCP Leverage rapuh, walaupun source terlihat baik.

#### P0-02 — Satu judge path yang dapat di-reset

Buat satu fixture/route yang selalu dimulai dari revision awal dan dapat
menghasilkan alur berikut tanpa menghapus failure:

1. buka stack dan satu answer;
2. baca rubric dan answer sebagai agent-facing view;
3. kirim proposal rubric-line IDs;
4. page menghitung mark dan menahan answer yang memerlukan manusia;
5. tampilkan perbedaan payload agent dengan arithmetic page;
6. kirim satu invalid atau stale request dan tampilkan refusal terstruktur;
7. stage release;
8. confirm hanya melalui UI manusia;
9. tampilkan receipt/audit dan status final.

Acceptance evidence:

- satu script/browser run dari fresh state;
- revision sequence, hold count, dan audit event cocok dengan DOM;
- tidak ada point value, pass boundary, identity, atau answer-id set yang bocor
  pada payload yang dapat dibaca agent;
- proposal kedua tidak menimpa proposal pertama dan request release tidak
  mengirim apa pun tanpa human confirm.

#### P0-03 — Hosted proof pada artefak yang sama

- pilih satu provider static zero-cost dan satu URL HTTPS;
- deploy hanya dari build yang lolos P0-01;
- buka URL pada private window/clean profile;
- verifikasi title, relative assets, CSP, no-login access, console, overflow,
  focus, and WebMCP flag/client;
- simpan URL, commit SHA, provider, tanggal, dan hasil probe.

Acceptance evidence: stranger dapat membuka page tanpa setup lokal dan
browser run mengarah ke URL hosted, bukan 127.0.0.1. Jika WebMCP tidak tersedia
di client tertentu, fallback ordinary web app terlihat dan jujur.

#### P0-04 — Natural-language replay yang benar-benar dipilih model

Gunakan client yang secara aktual mendukung WebMCP (Sol/Terra atau Chrome
WebMCP path yang tersedia). Rekam:

- model menemukan page;
- model membaca contract/rubric/answer;
- model memilih tool tanpa daftar call yang sudah ditulis script;
- model menghadapi satu invalid/stale condition;
- model meminta stage, tetapi tidak dapat confirm release;
- DOM, revision, hold, dan receipt berubah sesuai hasil.

Bukti minimum: transcript atau recording dengan timestamp, client/model,
URL, prompt, tool calls yang dipilih model, dan limitation. DevTools script
yang menulis semua argumen tidak boleh diberi label model replay.

#### P0-05 — Tutup GATE-P2 dengan non-builder

Jalankan protokol pada [GATE-P2](GATE-P2.md): satu orang yang tidak membangun
page, dua pertanyaan sebelum demo, 90 detik tanpa tour, lalu dua pertanyaan
comprehension. Simpan jawaban verbatim, tindakan yang dilakukan, dan pass/fail
tiap pertanyaan.

Acceptance evidence:

- result section pada GATE-P2 terisi;
- README dan submission copy tidak mengubah satu sesi menjadi statistik umum;
- jika orang tersebut salah memahami boundary, wording/UI diperbaiki lalu gate
  diulang.

#### P0-06 — Video publik 150–170 detik

Gunakan build hosted yang sama. Ikuti storyboard pada audit video:

| Waktu | Isi | Bukti |
| ---: | --- | --- |
| 0–8s | “Agent brings language. Page keeps arithmetic.” | problem + boundary |
| 8–30s | satu answer dan rubric | agent view tidak memiliki point/pass value |
| 30–60s | model membaca dan mengusulkan | tool choice, revision, proposal |
| 60–90s | page menghitung dan menahan | held reason pada baris queue, lalu audit account di bawah queue |
| 90–115s | invalid/stale request | refusal dan tidak ada leak |
| 115–145s | stage lalu human confirm | satu human-only control; no confirm_release |
| 145–165s | receipt + limitation | synthetic/alias-only, no model claim palsu |
| 165–170s | why WebMCP | page-scoped usefulness tanpa arithmetic authority |

Checklist video:

- durasi kurang dari 180 detik; jangan tepat 180;
- audio/narasi bahasa Inggris jelas;
- musik original atau berizin, tanpa filler panjang;
- URL, repo, dan state di video sama dengan yang dikirim;
- failure tidak dipotong dari cerita;
- caption/terjemahan Inggris tersedia bila diperlukan.

Official requirement tetap berasal dari
[Official Rules](https://webmcp.devpost.com/rules); audit video hanya memberi
pelajaran presentasi, bukan menggantikan aturan.

#### P0-07 — Tutup repository, rights, dan form preflight

- public repository memiliki source, asset, instruction, dan MIT license yang
  terlihat pada About;
- konfirmasi copyright owner dan hak semua audio/video/image;
- pertahankan synthetic/alias-only disclosure;
- isi live URL dan repository URL pada submission text setelah URL diverifikasi;
- pastikan eligibility/Representative ditangani owner.

Checklist utama ada di [PREFLIGHT.md](PREFLIGHT.md) dan draft copy ada di
[SUBMISSION-TEXT.md](SUBMISSION-TEXT.md).

#### P0-08 — Manual usability dan accessibility listening

- keyboard-only walkthrough dari fresh page;
- satu listener memakai screen reader atau accessibility mode;
- catat kalimat yang tidak dipahami, focus yang hilang, dan apakah human-only
  boundary terbaca tanpa bantuan;
- uji 1440px dan 420px pada perangkat nyata jika tersedia.

AX tree/contrast artifact tetap berguna, tetapi tidak boleh disebut sebagai
screen-reader user test.

### P1 — menaikkan ceiling setelah P0

#### P1-01 — Perkuat final audit receipt

Sudah mendarat. Setiap confirm manusia menulis satu receipt page-owned: `human_release_confirmed`
menamai actor, `revision` adalah revision yang dihasilkan, `answerIds` memberi jumlah item, dan
`operationId` membedakan tool dari tangan tanpa pernah dikirim ke agent. Projection tool tetap tidak
mengembalikan secret arithmetic atau daftar yang dapat mengungkap held set.

Bukti: `node --run test` → **136 passed, 0 failed**, dengan `tests/session.test.mts` menuntut confirm
menambah tepat satu receipt pada revision baru dan hold antara stage dan confirm tidak ikut terkirim,
dan `tests/agent-boundary.test.mts` menolak receipt yang mengutip total. `node --run browser` → **43
passed, 0 failed**, termasuk confirm dan decline lewat human control; event final terbaca pada audit
ledger di rail kiri dan pada timeline agent column. Confirm kedua sebagai no-op ada di source, belum
diuji; ulangi semuanya pada build hosted.

#### P1-02 — Jadikan refusal mudah dilihat dalam satu layar

Sudah mendarat: refusal muncul di live region dengan instruksi baca-ulang-dan-coba-lagi; setiap call
yang tiba terdaftar di agent column dengan revision dan refusal code; empat payload dicetak verbatim
di balik disclosure, semuanya tertutup pada arrival; authority dinyatakan sebagai tabel 3×5 (Agent /
You / Page terhadap Read / Propose / Hold / Score / Send) di rail, menggantikan tiga paragraf.

Masih terbuka: jalur kembali dari agent column ke baris queue atau ke audit account; kolom itu hanya
menautkan ke dirinya sendiri dan ke gate. Tujuannya bukan membuat lebih banyak teks, melainkan
mengurangi waktu juri untuk menemukan bukti.

#### P1-03 — Perjelas contract surface tanpa menambah tool

Kelompokkan sembilan tool menjadi read/write dan tampilkan satu contoh input dan
output yang nyata. Pertahankan batas human-only sebagai teks dan uji ketiadaan operasi release melalui
registry negative probe; jangan menambahkan baris operasi yang tidak terdaftar ke UI agent.
Setiap write harus menjelaskan expectedRevision, single-use operationId, dan failure mode. Jangan
memasukkan angka rubric ke deskripsi schema.

#### P1-04 — Perkuat data boundary terhadap inference

- pertahankan omission terhadap near-boundary reason;
- ulangi GATE-W1 setelah setiap perubahan tool/payload;
- uji ordering, count, receipt, error message, dan alias agar tidak membentuk
  complement leak;
- dokumentasikan residual one-bit channels; jangan menyatakan boundary
  “sempurna” atau “tidak dapat diserang”.

#### P1-05 — Buat README menjadi judge guide 90 detik

README package harus memiliki urutan:

1. satu kalimat problem;
2. apa yang agent boleh dan tidak boleh;
3. satu judge path;
4. satu failure/recovery path;
5. test/evidence commands;
6. hosted URL dan repo URL setelah tersedia;
7. synthetic/fallback/limitation disclosure.

Jangan menaruh test count, browser version, atau model claim yang tidak berasal
langsung dari evidence artifact yang dikirim.

#### P1-06 — Ukur responsiveness secara proporsional

Withheld bukan benchmark throughput. Ukur hanya:

- cold/warm first render pada hosted URL;
- waktu dari tool dispatch sampai DOM update;
- long task atau input delay pada answer opening/stage;
- mobile scroll/focus.

Simpan environment dan repeat count. Jangan mengklaim angka headless sebagai
performa universal. Split bundle hanya jika pengukuran menunjukkan bottleneck.

### P2 — polish setelah evidence

- typography, spacing, dan empty/error states;
- caption dan transcript video;
- screenshot yang konsisten dengan hosted build;
- CI Node 22 jika environment tersedia;
- persistence/undo hanya jika kebutuhan produk terbukti dan tidak mengganggu
  human authority;
- optimasi bundle yang memiliki baseline dan hasil pengukuran.

P2 tidak boleh menggeser P0 hosted/model/user evidence.

## 4. Pemetaan ke empat kriteria juri

Official Rules hanya memiliki empat kriteria; W/X/I/C berikut adalah scorecard
internal. Tidak ada angka achieved sebelum evidence release tersedia.

| Kriteria | Target Withheld | Bukti yang harus dilihat juri | Kill condition |
| --- | --- | --- | --- |
| WebMCP Leverage | agent membaca language/evidence pada page state yang sama; page menghitung dan memegang authority | model-selected tool call, redacted payload, shared DOM update, no confirm_release | tool call hanya script/handwritten atau point/pass value bocor |
| Execution | satu loop utuh, refusal, human stage/confirm, receipt, fallback | hosted replay, clean run, video <180s, README judge path | juri harus menebak urutan atau page tidak dapat dibuka |
| Potential Impact | marker/reviewer tertentu mendapat triage recognition → human judgement | GATE-P2 verbatim, concrete before/after, synthetic limitation | klaim “menghemat X% marker” tanpa measurement |
| Creativity & Ambition | information-boundary mechanic: recognizer ≠ grader | satu adegan arithmetic terlihat di page tetapi tidak di contract payload | menjadi generic AI grading dashboard atau tool list |

### Internal subcriteria yang harus ditutup

- W1 essentiality: counterfactual chatbot/API biasa tidak dapat mempertahankan
  page-owned arithmetic tanpa menduplikasi secret;
- W2 tool quality: nama, schema, read/write hint, refusal, dan payload bounded;
- W3 context/authority: revision, care setting, release boundary;
- W4 shared state: tool dan UI mengubah Session yang sama;
- W5 safety/recovery: injection, stale, invalid, decline, dan audit;
- X1 complete loop: satu journey dari read sampai human confirm;
- X2 correctness: deterministic result dan receipt sequence;
- X3 UX/demo: hook dan evidence terbaca cepat;
- X4 responsiveness: no overflow, focus, no console error, bounded latency;
- X5 reproducibility: clean clone, hosted URL, license, commands;
- I1–I3: problem, persona, before/after harus berasal dari GATE-P2 atau disebut
  hypothesis;
- I4 human-agent split: recognition didelegasikan, judgement/release tetap manusia;
- I5 credibility: synthetic, scope, dan limitation terlihat;
- C1–C3: boundary mechanic dan refusal memorable;
- C4 separation: bukan game Flowline dan bukan generic dashboard;
- C5 ambition/scope: satu answer, satu failure, satu approval; tidak feature
  sprawl.

## 5. Evidence matrix dan owner

| Claim yang ingin ditulis | Evidence sekarang | Bukti berikutnya | Owner |
| --- | --- | --- | --- |
| source/domain works | source + full local suite today (136 tests, 9 files) | same suite from the committed build | implementer/environment |
| WebMCP registered | current local native-registry.json (Chrome 151) | hosted registry capture | environment/owner |
| outside caller dispatches | current local 19-check artifact | hosted dispatch run | environment/owner |
| a model selects tools | belum ada | authorized natural-language replay | owner/client |
| page-owned boundary | source/tests + artifact payload checks + agent-view sweep (132 redactions) | hosted payload capture + GATE-W1 rerun | implementer |
| workflow matters | author description only | GATE-P2 non-builder record | owner/participant |
| browser usability | current local layout/AX/contrast checks inside the 43-check browser run | manual keyboard/screen-reader listen | owner/reviewer |
| public reproducibility | local package only | public repo/About/license + clean clone | owner |
| judge can understand quickly | storyboard only | final hosted video and independent comprehension | owner |

## 6. Documentation map — jangan membuat status bertentangan

| File | Fungsi setelah plan ini |
| --- | --- |
| docs/UPGRADE-PLAN.md | backlog dan acceptance criteria Withheld; file ini |
| docs/PROGRESS.md | hanya status measured/build/not verified; update setelah evidence baru |
| docs/PREFLIGHT.md | requirement resmi, hosting, repo, video, eligibility |
| docs/GATE-P2.md | primary user/comprehension evidence; tidak diisi dengan asumsi |
| docs/GATE-W1.md | boundary/inference audit setiap payload berubah |
| docs/TESTING.md | command, pass count, dan batas test; catat EROFS sebagai environment blocker jika berulang |
| docs/RUNBOOK.md | langkah reviewer/judge dari clean build dan hosted URL |
| docs/SUBMISSION-TEXT.md | copy final hanya setelah hosted run dan video selesai |
| ../../../docs/research/46-tier-ab-audit-and-two-submission-upgrade-plan.md | comparative tier A/B and two-package strategy |
| ../../../docs/research/47-devpost-video-audit-2026-09-02.md | 13-page/video audit and storyboard lessons |

Dua baris terakhir itu path monorepo. Package ini diterbitkan sebagai repositori mandiri
(`AndroLay/withheld`), jadi di tree terbit keduanya tidak ada — sebutkan sebagai provenance internal,
jangan diandalkan sebagai tautan yang bisa dibuka juri.

Jangan menyalin seluruh audit benchmark ke package docs. Gunakan link ke sumber
riset agar satu perubahan tidak membuat dua status berbeda.

## 7. Definition of done

Withheld baru boleh disebut release candidate bila semua pernyataan berikut
memiliki artefak pada commit/build yang sama:

- [ ] full test, typecheck, build, browser, dan registry dispatch pass;
- [ ] hosted HTTPS URL dapat dibuka pada clean profile;
- [ ] native registry/dispatch hosted berhasil atau limitation fallback tertulis;
- [ ] natural-language model replay direkam dan tidak disamakan dengan DevTools;
- [ ] satu non-builder menyelesaikan GATE-P2 atau gap ditulis eksplisit pada copy;
- [ ] satu judge path menunjukkan read → proposal → hold → refusal → stage →
      human confirm → receipt;
- [ ] point value, pass boundary, identity, dan release authority tidak menyeberang
      ke agent-facing result;
- [ ] final human confirmation tidak dapat dilakukan melalui tool;
- [ ] public repository, MIT/About, rights, English copy, dan synthetic disclosure
      selesai;
- [ ] video publik kurang dari 180 detik, audio jelas, dan berasal dari hosted build;
- [ ] README, PROGRESS, PREFLIGHT, SUBMISSION-TEXT, dan video tidak saling
      bertentangan.

## 8. Residual risks yang tetap harus disebut

- Satu GATE-P2 tidak mewakili semua marker atau semua institusi pendidikan.
- Model/client WebMCP dapat berubah; replay berlaku untuk client dan waktu yang
  tercatat.
- Synthetic answers tidak membuktikan dampak pada kelas nyata.
- Static host tidak memberi server-side authorization; human authority hanya
  berlaku pada page/session demo.
- Omission dan count masih dapat membawa inference channel; audit W1 harus tetap
  dibaca bersama batas threat model.
- Tidak adanya persistence berarti refresh memulai session baru; ini harus disebut
  sebagai scope, bukan disembunyikan.
- Screenshot target adalah design reference, bukan evidence hosted/native.

## Urutan eksekusi yang disarankan

1. Tutup P0-01 pada lingkungan writable.
2. Kunci/reset judge fixture dan jalankan P0-02.
3. Jalankan GATE-P2 sebelum mengubah wording besar.
4. Publish/host dan ulangi browser/registry pada URL yang sama.
5. Jalankan natural-language replay.
6. Tambahkan final receipt/refusal clarity hanya bila P0 tidak rusak.
7. Rekam video 150–170 detik dari hosted commit.
8. Jalankan submission preflight terakhir; jangan menganggap dokumen ini sebagai
   izin submit.
