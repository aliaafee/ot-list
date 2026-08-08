# Catalogue proposal — batch 2026-08

A candidate release (`v2026.2`) derived from what the department has
actually been recording, not from a review of the catalogue in the
abstract.

**This is a request, not an edit.** Per section 8 of the spec, the
custodian mints concepts. Everything below is evidence and a draft; none
of it has been applied to `seed_procedures.csv`.

## Evidence base

Every procedure in the database, triaged by running the app's own
type-ahead over each recorded name — the question being "would the picker
have found this?"

| | Procedures | Distinct names |
|---|---|---|
| Total procedures | 432 | — |
| Coded against a real concept | 4 | — |
| Uncoded (`NSX-00000`) | 428 | 253 |
| — would already be found by search | 43 | 30 |
| — found nothing | 385 | 223 |

Of those 385:

| Outcome | Procedures | What it needs |
|---|---|---|
| No concept exists | 246 | New concepts — this proposal |
| Concept exists, wording differs | 120 | Synonyms only |
| Level-parser limits (multi-level, laterality prefix) | 19 | Search fixes, not catalogue changes |

**The headline: 120 of 385 need no new concept at all.** That is the
failure mode section 8 predicts — "most requests are an existing concept
the requester couldn't find, which is a synonym problem, not a catalogue
gap." Adding those synonyms is the cheapest win available and should
happen regardless of what else is accepted.

## Two whole domains are absent

Searching the catalogue for `inject`, `block`, `stent`, `coil`, `emboli`,
`angio`, `puncture` returns **nothing**. That is not a scatter of missing
entries; it is two services with no vocabulary at all.

**Endovascular — 116 procedures, 27% of everything recorded.** Diagnostic
cerebral angiography alone accounts for 108 across 14 spellings (`DSA`,
`CEREBRAL DSA`, `Check DSA`, `Diagnostic DSA`, `DSA cerebral`…). One
concept would code a quarter of the department's workload. The Cath Lab
is already a separate OT list, so this is an organisational unit the
catalogue simply does not model.

**Interventional pain — 71 procedures across 49 spellings.** Transforaminal
injections, facet blocks, SIJ blocks, epidurals. The high spelling count
relative to volume is itself the symptom: with no shared vocabulary,
everyone writes it differently.

Both need a new `subspecialty` value, which is a closed select — the
generated seed migration widens it automatically from the CSV, so no
schema work is required.

## 1. New subspecialty values

| Value | Label |
|---|---|
| `endovascular` | Endovascular / neurointervention |
| `pain` | Interventional pain |

Add to `SUBSPECIALTY_LABELS` and `SUBSPECIALTY_ORDER` in `src/lib/nspc.js`
so the browser tree groups and orders them.

## 2. New facet values

Rows for `seed_facet_values.csv`. IDs continue the existing sequences
(next free: `MTH-0023`, `SIT-0043`, `APP-0021`, `DEV-0020`, `MOR-0039`).

Kept deliberately small — coiling reuses `MTH-0014 Occlusion`, stenting
and flow diversion reuse `MTH-0007 Insertion`, and a pump refill reuses
the new `Injection` method rather than minting one of its own.

```csv
facet_value_id,facet_id,term,snomed_attribute,active,effective_from,effective_to,notes
MTH-0023,method,Angiography,Has method,1,2026-08-08,,
MTH-0024,method,Injection,Has method,1,2026-08-08,,
MTH-0025,method,Puncture,Has method,1,2026-08-08,,
SIT-0043,site,Zygapophyseal joint,Procedure site,1,2026-08-08,,
SIT-0044,site,Sacroiliac joint,Procedure site,1,2026-08-08,,
SIT-0045,site,Intervertebral foramen,Procedure site,1,2026-08-08,,
SIT-0046,site,Cerebral venous sinus,Procedure site,1,2026-08-08,,
SIT-0047,site,Trachea,Procedure site,1,2026-08-08,,
APP-0021,approach,Endovascular,Surgical approach,1,2026-08-08,,
APP-0022,approach,Full-endoscopic interlaminar,Surgical approach,1,2026-08-08,,
APP-0023,approach,Full-endoscopic transforaminal,Surgical approach,1,2026-08-08,,
DEV-0020,device,Endovascular coil,Using device,1,2026-08-08,,
DEV-0021,device,Flow diverter stent,Using device,1,2026-08-08,,
DEV-0022,device,Intraluminal arterial stent,Using device,1,2026-08-08,,
DEV-0023,device,Liquid embolic agent,Using device,1,2026-08-08,,
DEV-0024,device,Intrathecal drug delivery pump,Using device,1,2026-08-08,,
DEV-0025,device,Tracheostomy tube,Using device,1,2026-08-08,,
MOR-0039,morphology,Carotid artery stenosis,Associated morphology,1,2026-08-08,,
MOR-0040,morphology,Dural arteriovenous fistula,Associated morphology,1,2026-08-08,,
MOR-0041,morphology,Lumbar radiculopathy,Associated morphology,1,2026-08-08,,
MOR-0042,morphology,Facet joint arthropathy,Associated morphology,1,2026-08-08,,
MOR-0043,morphology,Sacroiliac joint dysfunction,Associated morphology,1,2026-08-08,,
MOR-0044,morphology,Idiopathic intracranial hypertension,Associated morphology,1,2026-08-08,,
MOR-0045,morphology,Spasticity,Associated morphology,1,2026-08-08,,
MOR-0046,morphology,Acute ischaemic stroke,Associated morphology,1,2026-08-08,,
MOR-0047,morphology,Intracranial arterial stenosis,Associated morphology,1,2026-08-08,,
```

## 3. Candidate concepts

22 concepts covering **236 procedures**. Ordered by the volume each would
code; the count column is procedures currently recorded as free text that
this concept would absorb.

Counts are attributions from clustering, not a partition, and will not
reconcile exactly against the 246 in the evidence table. Some recorded
names are combined cases — `DSA + AVM embolization`, `Cerebral DSA +/-
Thrombectomy`, `Burrhole evacuation of hematoma +/- Craniotomy` — which
the schema handles as **two code rows on one procedure**, so they belong
to two concepts or, where the second half is conditional, to neither
cleanly. Treat each figure as the order of demand for that concept, not
an exact caseload. A further 3 procedures were declined as too uncommon
(section 5).

Laterality and spinal level are **post-coordination** — that is why
`Right CTR` and `Left CTR` are not two concepts, and why there is no
"two-level ACDF" entry. Every count below already collapses those
variants.

| # | Concept | Covers |
|---|---|---|
| NSX-00089 | Diagnostic cerebral digital subtraction angiography | 108 |
| NSX-00097 | Transforaminal epidural steroid injection | 25 |
| NSX-00100 | Facet joint medial branch block | 20 |
| NSX-00098 | Interlaminar epidural steroid injection | 15 |
| NSX-00104 | Full-endoscopic transforaminal lumbar discectomy | 12 |
| NSX-00090 | Endovascular coiling of intracranial aneurysm | 8 |
| NSX-00106 | Lumbar puncture with opening pressure measurement | 8 |
| NSX-00094 | Carotid artery stenting (extracranial) | 6 |
| NSX-00101 | Sacroiliac joint injection | 6 |
| NSX-00105 | Full-endoscopic interlaminar lumbar discectomy | 6 |
| NSX-00092 | Embolisation of cerebral arteriovenous malformation | 4 |
| NSX-00099 | Caudal epidural steroid injection | 4 |
| NSX-00108 | Intrathecal baclofen pump refill | 3 |
| NSX-00091 | Flow diverter placement for intracranial aneurysm | 2 |
| NSX-00095 | Cerebral venous sinus stenting with manometry | 2 |
| NSX-00093 | Embolisation of dural arteriovenous fistula | 1 |
| NSX-00096 | Mechanical thrombectomy for acute ischaemic stroke | 1 |
| NSX-00102 | Erector spinae plane block | 1 |
| NSX-00103 | Peripheral nerve steroid injection | 1 |
| NSX-00107 | Intrathecal baclofen pump insertion | 1 |
| NSX-00109 | Tracheostomy | 1 |
| NSX-00110 | Intracranial arterial stenting | 1 |

Rows for `seed_procedures.csv`:

```csv
NSX-00089,Diagnostic cerebral digital subtraction angiography (procedure),Diagnostic cerebral DSA,endovascular,MTH-0023,Angiography,SIT-0016,Cerebral artery,APP-0021,Endovascular,,,,,INT-0002,0,0,0,,,1,,,2026-08-08,,v2026.2
NSX-00090,Endovascular coil occlusion of intracranial aneurysm (procedure),Aneurysm coiling,endovascular,MTH-0014,Occlusion,SIT-0016,Cerebral artery,APP-0021,Endovascular,DEV-0020,Endovascular coil,MOR-0015,Saccular aneurysm,INT-0001,1,1,0,,,1,,,2026-08-08,,v2026.2
NSX-00091,Flow diverter stent placement for intracranial aneurysm (procedure),Flow diverter placement,endovascular,MTH-0007,Insertion,SIT-0016,Cerebral artery,APP-0021,Endovascular,DEV-0021,Flow diverter stent,MOR-0015,Saccular aneurysm,INT-0001,1,1,0,,,1,,,2026-08-08,,v2026.2
NSX-00092,Embolisation of cerebral arteriovenous malformation (procedure),AVM embolisation,endovascular,MTH-0014,Occlusion,SIT-0016,Cerebral artery,APP-0021,Endovascular,DEV-0023,Liquid embolic agent,MOR-0016,Arteriovenous malformation,INT-0001,1,1,0,,,1,,,2026-08-08,,v2026.2
NSX-00093,Embolisation of dural arteriovenous fistula (procedure),Dural AVF embolisation,endovascular,MTH-0014,Occlusion,SIT-0016,Cerebral artery,APP-0021,Endovascular,DEV-0023,Liquid embolic agent,MOR-0040,Dural arteriovenous fistula,INT-0001,1,1,0,,,1,,,2026-08-08,,v2026.2
NSX-00094,Stent placement in extracranial carotid artery (procedure),Carotid artery stenting,endovascular,MTH-0007,Insertion,SIT-0035,Internal carotid artery,APP-0021,Endovascular,DEV-0022,Intraluminal arterial stent,MOR-0039,Carotid artery stenosis,INT-0001,1,1,0,,,1,,,2026-08-08,,v2026.2
NSX-00095,Cerebral venous sinus stenting with venous manometry (procedure),Venous sinus stenting,endovascular,MTH-0007,Insertion,SIT-0046,Cerebral venous sinus,APP-0021,Endovascular,DEV-0022,Intraluminal arterial stent,MOR-0044,Idiopathic intracranial hypertension,INT-0001,1,1,0,,,1,,,2026-08-08,,v2026.2
NSX-00096,Mechanical thrombectomy for acute ischaemic stroke (procedure),Mechanical thrombectomy,endovascular,MTH-0008,Removal,SIT-0016,Cerebral artery,APP-0021,Endovascular,,,MOR-0046,Acute ischaemic stroke,INT-0001,1,0,0,,,1,,,2026-08-08,,v2026.2
NSX-00097,Transforaminal epidural steroid injection (procedure),Transforaminal epidural steroid injection,pain,MTH-0024,Injection,SIT-0045,Intervertebral foramen,APP-0017,Transforaminal,,,MOR-0041,Lumbar radiculopathy,INT-0001,1,0,1,interspace,"cervical,thoracic,lumbar,lumbosacral",1,,,2026-08-08,,v2026.2
NSX-00098,Interlaminar epidural steroid injection (procedure),Interlaminar epidural steroid injection,pain,MTH-0024,Injection,SIT-0026,Spinal epidural space,APP-0018,Percutaneous,,,MOR-0041,Lumbar radiculopathy,INT-0001,0,0,1,interspace,"cervical,thoracic,lumbar,lumbosacral",1,,,2026-08-08,,v2026.2
NSX-00099,Caudal epidural steroid injection (procedure),Caudal epidural steroid injection,pain,MTH-0024,Injection,SIT-0026,Spinal epidural space,APP-0018,Percutaneous,,,MOR-0041,Lumbar radiculopathy,INT-0001,0,0,0,,,1,,,2026-08-08,,v2026.2
NSX-00100,Zygapophyseal joint medial branch block (procedure),Facet joint block,pain,MTH-0024,Injection,SIT-0043,Zygapophyseal joint,APP-0018,Percutaneous,,,MOR-0042,Facet joint arthropathy,INT-0001,1,0,1,interspace,"cervical,thoracic,lumbar,lumbosacral",1,,,2026-08-08,,v2026.2
NSX-00101,Sacroiliac joint injection (procedure),Sacroiliac joint injection,pain,MTH-0024,Injection,SIT-0044,Sacroiliac joint,APP-0018,Percutaneous,,,MOR-0043,Sacroiliac joint dysfunction,INT-0001,1,0,0,,,1,,,2026-08-08,,v2026.2
NSX-00102,Erector spinae plane block (procedure),Erector spinae plane block,pain,MTH-0024,Injection,SIT-0026,Spinal epidural space,APP-0018,Percutaneous,,,,,INT-0001,1,0,0,,,1,,,2026-08-08,,v2026.2
NSX-00103,Peripheral nerve steroid injection (procedure),Peripheral nerve steroid injection,pain,MTH-0024,Injection,SIT-0028,Peripheral nerve,APP-0018,Percutaneous,,,MOR-0036,Entrapment neuropathy,INT-0001,1,0,0,,,1,,,2026-08-08,,v2026.2
NSX-00104,Full-endoscopic transforaminal lumbar discectomy (procedure),Endoscopic transforaminal lumbar discectomy,spine-degenerative,MTH-0001,Excision,SIT-0025,Intervertebral disc,APP-0023,Full-endoscopic transforaminal,,,MOR-0021,Herniated intervertebral disc,INT-0001,1,1,1,interspace,"lumbar,lumbosacral",1,,,2026-08-08,,v2026.2
NSX-00105,Full-endoscopic interlaminar lumbar discectomy (procedure),Endoscopic interlaminar lumbar discectomy,spine-degenerative,MTH-0001,Excision,SIT-0025,Intervertebral disc,APP-0022,Full-endoscopic interlaminar,,,MOR-0021,Herniated intervertebral disc,INT-0001,1,1,1,interspace,"lumbar,lumbosacral",1,,,2026-08-08,,v2026.2
NSX-00106,Lumbar puncture with measurement of opening pressure (procedure),Lumbar puncture with manometry,cranial-csf,MTH-0025,Puncture,SIT-0032,Lumbar subarachnoid space,APP-0018,Percutaneous,,,MOR-0028,Hydrocephalus,INT-0002,0,0,0,,,1,,,2026-08-08,,v2026.2
NSX-00107,Insertion of intrathecal baclofen infusion pump (procedure),Intrathecal baclofen pump insertion,pain,MTH-0007,Insertion,SIT-0032,Lumbar subarachnoid space,APP-0019,Open direct exposure,DEV-0024,Intrathecal drug delivery pump,MOR-0045,Spasticity,INT-0001,0,1,0,,,1,,,2026-08-08,,v2026.2
NSX-00108,Refill of intrathecal baclofen infusion pump (procedure),Intrathecal baclofen pump refill,pain,MTH-0024,Injection,SIT-0032,Lumbar subarachnoid space,APP-0018,Percutaneous,DEV-0024,Intrathecal drug delivery pump,MOR-0045,Spasticity,INT-0001,0,0,0,,,1,,,2026-08-08,,v2026.2
NSX-00109,Tracheostomy (procedure),Tracheostomy,cranial-trauma,MTH-0004,Incision,SIT-0047,Trachea,APP-0019,Open direct exposure,DEV-0025,Tracheostomy tube,,,INT-0001,0,0,0,,,1,,,2026-08-08,,v2026.2
NSX-00110,Stent placement in intracranial artery (procedure),Intracranial arterial stenting,endovascular,MTH-0007,Insertion,SIT-0016,Cerebral artery,APP-0021,Endovascular,DEV-0022,Intraluminal arterial stent,MOR-0047,Intracranial arterial stenosis,INT-0001,1,1,0,,,1,,,2026-08-08,,v2026.2
```

### On selecting the target artery

The two are separate concepts rather than one with a selectable vessel
because **`procedure_site` is concept-level, not per-encounter**. The
encounter record carries only laterality, priority, revision status,
staged sequence, intent and spinal level; there is no vessel slot, so
"choose the artery when coding" is not something the current model can
express.

The catalogue already settles how to handle this. Aneurysm clipping keeps
a generic `NSX-00026` *Craniotomy aneurysm clipping* (site: Cerebral
artery) **alongside** eight vessel-specific concepts, `NSX-00074`–
`NSX-00081`, one per artery — ACoA, PCoA, ICA, MCA, ACA, basilar, PICA,
vertebral. Selecting the vessel means selecting a different concept.

`NSX-00110` is deliberately the generic form of that pattern, because
intracranial stenting is **one recorded procedure**. Minting eight
vessel-specific stenting concepts today would be the over-minting just
declined in section 5. If the volume grows, they can be added later
exactly as the clipping family was, and the generic concept keeps working
beside them — `NSX-00026` still does.

The third option, a per-encounter target-vessel slot on `procedure_code`,
would be a schema and picker change rather than a catalogue one. Worth
considering if vessel-level audit is ever wanted across *all* vascular
procedures, but it is out of scope for a vocabulary release.

Synonyms for the new concepts — these are the abbreviations actually
typed, and are what make the concepts findable:

```csv
NSX-00089,DSA,en,1,1,2026-08-08
NSX-00089,cerebral DSA,en,0,1,2026-08-08
NSX-00089,check DSA,en,0,1,2026-08-08
NSX-00089,diagnostic angiogram,en,0,1,2026-08-08
NSX-00089,ADA,en,1,1,2026-08-08
NSX-00090,coiling,en,0,1,2026-08-08
NSX-00090,stent assisted coiling,en,0,1,2026-08-08
NSX-00090,intrasaccular device,en,0,1,2026-08-08
NSX-00094,ICA stenting,en,1,1,2026-08-08
NSX-00094,carotid stent,en,0,1,2026-08-08
NSX-00110,MCA stenting,en,1,1,2026-08-08
NSX-00110,intracranial stenting,en,0,1,2026-08-08
NSX-00097,TFESI,en,1,1,2026-08-08
NSX-00097,transforaminal block,en,0,1,2026-08-08
NSX-00097,nerve root block,en,0,1,2026-08-08
NSX-00098,epidural steroid injection,en,0,1,2026-08-08
NSX-00098,ESI,en,1,1,2026-08-08
NSX-00098,epidural block,en,0,1,2026-08-08
NSX-00100,facet block,en,0,1,2026-08-08
NSX-00100,medial branch block,en,0,1,2026-08-08
NSX-00100,MBB,en,1,1,2026-08-08
NSX-00101,SIJ block,en,1,1,2026-08-08
NSX-00101,SI joint injection,en,0,1,2026-08-08
NSX-00104,endoscopic discectomy,en,0,1,2026-08-08
NSX-00104,TELD,en,1,1,2026-08-08
NSX-00105,IELD,en,1,1,2026-08-08
NSX-00106,LP,en,1,1,2026-08-08
NSX-00106,tap test,en,0,1,2026-08-08
NSX-00106,CSF tap,en,0,1,2026-08-08
NSX-00109,trachy,en,1,1,2026-08-08
```

## 4. Synonyms for existing concepts — 120 procedures, no new codes

The cheapest work in this document. Each of these already has a concept;
the picker just cannot find it from what people type.

| Existing concept | Missed by | Procedures |
|---|---|---|
| `NSX-00045`–`47` lumbar fusion family | "L4-5 decompression and fusion", "MIS fusion", "short segment fusion" | 26 |
| `NSX-00082`/`00083` lumbar microdiscectomy / laminectomy | "decompressive laminectomy", "laminotomy and discectomy" | 25 |
| `NSX-00080` carpal tunnel decompression | `CTR`, `CTS release`, `CT release` | 21 |
| meningioma / glioma craniotomy concepts | "craniotomy and excision", `MSOC` | 8 |
| `NSX-0002x` decompressive craniectomy | "FTP decompressive craniectomy" | 7 |
| `NSX-00001` burr hole drainage SDH | **"Burrhole"** (one word), "evacuation" vs "drainage" | 7 |
| `NSX-00032` VP shunt insertion | "Programmable VP shunt" | 6 |
| cranioplasty / skull base repair | "skull base repair", "duroplasty" | 5 |
| `NSX-00008` elevation depressed skull fracture | "elevation of depressed bone", "removal of bone fragments" | 5 |
| `NSX-00020` endoscopic transsphenoidal pituitary | **"transphenoidal"** (missing S) | 4 |
| EVD / aneurysm clipping / MVD | `EVD`, `MVD` | 4 |
| nerve sheath tumour excision | "schwannoma" | 2 |

Two of these are pure spelling — `Burrhole` and `transphenoidal` — and
cost nothing to add.

## 5. Deliberately not proposed

**Too uncommon to mint — 3 procedures.** Drafted, then declined on
volume: a concept nobody reaches for is vocabulary to maintain for no
return, and section 8's duplicate-check burden grows with every entry.

| Candidate | Procedures |
|---|---|
| Endoscopic fenestration of ventricular septations | 2 |
| Common peroneal nerve decompression | 1 |

Both remain recordable as free text against `NSX-00000`, which is exactly
what the sentinel is for. Revisit if the counts grow: the uncoded list is
regenerable at any time, so the evidence for reversing this decision will
be there. Note that the septostomy needed no new facet values at all —
`Fenestration`, `Lateral ventricle` and `Endoscopic transventricular`
already exist — so it is cheap to add later if it recurs.

**Multi-level and laterality variants.** `C4-5-6 ACDF`, `C5-6 C6-7 ACDF`,
`Redo C5-C6 ACDF`, `Right CTR` — 19 procedures. Levels are an ordered set
and laterality is a qualifier, so these are already representable by
existing concepts. They are search failures, and minting concepts for
them would be exactly the "single level / multilevel" mistake section 5.1
warns against.

They need two fixes in `searchWithLevel` instead:

1. **Strip a leading `Left`/`Right`/`Bilateral` before searching.**
   Would resolve 10 names / 21 procedures on its own.
2. **Constrain the level-stripping fallback to the right region.** Today
   `L4-L5 fusion` suggests *Anterior **cervical** corpectomy and fusion*
   and `L4-5 discectomy` suggests *Anterior **cervical** discectomy and
   fusion*. The level prefill is correctly rejected afterwards, but the
   wrong concept is still offered at the top of the list — a silent
   mis-coding path, and the most serious defect this exercise found.
