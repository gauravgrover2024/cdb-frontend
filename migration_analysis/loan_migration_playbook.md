# Loan Migration Playbook

## What this is
This document defines the safest migration approach for moving legacy Oracle-export JSON data into the current loans module.

It is based on:
- the 8 representative cases you selected
- all 10 legacy JSON files
- the current frontend field inventory generated from the active codebase
- the actual frontend stage flow in the loans module

## Core conclusion
Do not migrate with a direct left-field -> right-field mapper alone.

That approach will fail because your data has:
- multiple identifiers for the same case
- duplicate rows inside the same file
- dropdown/enumeration mismatches
- split/combined name and date-time formats
- workflow-dependent pages that cannot be activated by field mapping alone
- vehicle master mismatches for make/model/variant
- optional files that are absent in valid cases

The correct design is:
1. Resolve one legacy case across all 10 files.
2. Build one canonical legacy case snapshot.
3. Transform that snapshot into a target loan payload.
4. Derive workflow state and stage completion.
5. Validate dropdowns and master-data matches.
6. Post as an upsert into Mongo using legacy IDs as external references, not `_id`.
7. Produce exception queues for manual review.

## Current target system facts
Frontend-generated field catalog:
- Unique loan fields: 266
- Field occurrences in UI: 316
- Catalog file: `/Users/gauravgrover/cdb-frontend/migration_analysis/loan_field_catalog.json`
- Human-readable list: `/Users/gauravgrover/cdb-frontend/migration_analysis/loan_field_catalog.md`

Loan journey in code:
1. `profile`
2. `prefile`
3. `approval`
4. `postfile`
5. `delivery`
6. `payout`

Flow conditions found in code:
- Cash case: `isFinanced === "No"` skips finance flow and moves to delivery.
- Finance case: profile -> prefile -> approval -> postfile -> delivery/payout.
- Refinance / cash-in: postfile moves to payout before closure.
- Approval/disbursement state is not only field-based; it also drives bank-state and downstream visibility.

## Important product risk already present in frontend
Loan-type values are inconsistent in the current codebase:
- `FinanceDetailsForm.jsx` uses `Cash-in` and `Re-finance`
- `StageFooter.jsx`, `VehiclePricingLoanDetails.jsx`, `VehicleDeliveryStep.jsx` expect `Car Cash-in` and `Refinance`

This must be normalized before bulk migration, otherwise imported cases can enter the wrong branch.

Relevant files:
- `/Users/gauravgrover/cdb-frontend/src/modules/loans/components/loan-form/customer-profile/FinanceDetailsForm.jsx`
- `/Users/gauravgrover/cdb-frontend/src/modules/loans/components/StageFooter.jsx`
- `/Users/gauravgrover/cdb-frontend/src/modules/loans/components/loan-form/pre-file/VehiclePricingLoanDetails.jsx`
- `/Users/gauravgrover/cdb-frontend/src/modules/loans/components/loan-form/vehicle-delivery/VehicleDeliveryStep.jsx`

## Legacy source roles
### 1. `CPV_DETAIL.json`
Primary applicant source.
Best for:
- customer name
- split names
- father name split
- mobile/email
- residence/office details
- marital status / education / profession / dependents
- financier / loan expected / loan type hints
- source/dealt by
- references

### 2. `CUSTOMER_BANK.json`
Primary banking seed.
Best for:
- bank name
- account numbers
- bank address/contact

### 3. `GURANTOR.json`
Conditional guarantor source.
Best for:
- guarantor profile and occupation details

### 4. `AUTH_SIGNATORY.json`
Conditional authorized signatory source.
Best for:
- signatory name, DOB, address, designation, Aadhaar/mobile

### 5. `RC_CUSTOMER_ACCOUNT.json`
Legacy master operational record.
Best for:
- case type and stage hints
- loan amount / tenure / ROI / EMI
- delivery and disbursement dates
- invoice, insurance, vehicle, dealer, payout flags
- coded make/model/variant fields
- bank and file movement details

### 6. `RC_DOC_DESPATCH_MASTER.json`
Dispatch timeline source.
Best for:
- dispatch date/time
- dispatch mode
- docs prepared/collected metadata

### 7. `RC_INSTRUMENT_DETAIL.json`
Instrument/ECS/SI source.
Best for:
- instrument type, number, amount, date
- MICR/account/favouring

### 8. `RC_RC_INV_RECEIVING_DETAIL.json`
Invoice/RC receiving source.
Best for:
- invoice number/date
- RC number/date
- received-as / received-from / received-on
- registration/chassis/engine details

### 9. `RC_RC_INV_STATUS.json`
Workflow snapshot source.
Best for:
- case type code
- overall/invoice/RC status
- delivery/disbursement/registration timestamps
- manufacturer/model/variant codes

### 10. `RC_SOURCE_REFERENCE.json`
Reference source, but missing in all 8 test cases.
Treat as optional.

## 8-case audit summary
Reference audit:
- `/Users/gauravgrover/cdb-frontend/migration_analysis/8_case_audit.md`
- `/Users/gauravgrover/cdb-frontend/migration_analysis/case_match_summary.json`
- `/Users/gauravgrover/cdb-frontend/migration_analysis/case_match_extracted.json`

Observed sample coverage:
- all 8 cases were found
- coverage ranged from 5/10 to 8/10 files
- `RC_SOURCE_REFERENCE.json` was absent in all 8
- `GURANTOR.json` was absent in 7/8
- several cases had duplicate rows in `CPV_DETAIL`, `RC_INSTRUMENT_DETAIL`, `RC_RC_INV_RECEIVING_DETAIL`, or `RC_CUSTOMER_ACCOUNT`

## Migration architecture
### Step 1. Case resolver
A case must be resolved using alias matching, not a single identifier.

Use these aliases together:
- `CPV_ACCOUNT_NO`
- `TEMP_CUST_CODE`
- `CDB_ACCOUNT_NO`
- `CDB_ACCOUNT_NUMBER`

Recommended resolver rules:
- treat `TEMP_CUST_CODE`, `CDB_ACCOUNT_NO`, and `CDB_ACCOUNT_NUMBER` as the same customer/case identity family
- treat `CPV_ACCOUNT_NO` as a linked alias, not a separate case
- case is selected when any chosen alias matches
- maintain all matched aliases in `legacyMeta.aliases`
- keep source file names and row indexes in `legacyMeta.sources`

### Step 2. Canonical legacy snapshot
For each resolved case, build one normalized object:

```json
{
  "legacyMeta": {
    "primaryCaseId": "3000004231",
    "aliases": ["3000004231", "3419"],
    "matchedFiles": ["CPV_DETAIL", "RC_CUSTOMER_ACCOUNT"],
    "conflicts": []
  },
  "customer": {},
  "vehicle": {},
  "finance": {},
  "approval": {},
  "postfile": {},
  "delivery": {},
  "payout": {},
  "raw": {}
}
```

This canonical layer is where you solve legacy inconsistency once.
Do not solve it repeatedly during direct posting.

### Step 3. Transformation layer
Transform canonical data into one Mongo-ready target payload matching the current loans module.

### Step 4. Workflow derivation
After field mapping, derive:
- `typeOfLoan`
- `isFinanced`
- `currentStage`
- `status`
- `approval_status`
- `approval_banksData`
- payout applicability
- delivery completion state

### Step 5. Validation and exception queues
Every case should end in one of these buckets:
- `ready_to_post`
- `ready_with_defaults`
- `manual_dropdown_normalization`
- `manual_vehicle_mapping`
- `manual_conflict_review`
- `missing_required_target_fields`

## Recommended field ownership by stage
### Customer Profile
Primary source priority:
1. `CPV_DETAIL`
2. `RC_CUSTOMER_ACCOUNT`

Target examples:
- `customerName` <- `CUSTOMER_NAME` or joined `CUST_NAME_FIRST/MIDDLE/LAST`
- `primaryMobile` <- `MOBILE` else `RESI_PHONE1`
- `email` <- `EMAIL_ADDRESS` else `E_MAIL`
- `applicantType` <- normalize from `HIRE_TYPE`
- `dealerName` <- dealer fields from lead/vehicle sources if available
- `typeOfLoan` <- derived, not blindly copied
- `financeExpectation` <- `LOAN_EXPECTED` / `APPLIED_LOAN_AMOUNT`
- `loanTenureMonths` <- `APPLIED_TENOR`

### Pre-file
Primary source priority:
1. `CPV_DETAIL`
2. `CUSTOMER_BANK`
3. `RC_CUSTOMER_ACCOUNT`
4. `GURANTOR`
5. `AUTH_SIGNATORY`
6. `RC_DOC_DESPATCH_MASTER`

Typical transforms:
- father name: join `FATHERS_NAME_FIRST/MIDDLE/LAST`
- applicant address: join `RESI_ADD1/RESI_ADD2`
- office address: join `OFF_ADD1/OFF_ADD2`
- bank fields: seed `bankName`, `accountNumber`, `branch`
- record details: use dispatch/receiving/file movement timestamps
- guarantor/signatory sections only when source rows exist

### Approval
Primary source priority:
1. `RC_CUSTOMER_ACCOUNT`
2. `CPV_DETAIL`

Recommended approach:
- create one synthetic bank object in `approval_banksData` from the legacy sanctioned/disbursed finance record
- use financier / HP / loan terms from `RC_CUSTOMER_ACCOUNT`
- derive status using legacy workflow codes

### Post-file
Primary source priority:
1. `RC_CUSTOMER_ACCOUNT`
2. `RC_DOC_DESPATCH_MASTER`
3. `RC_INSTRUMENT_DETAIL`
4. `RC_RC_INV_RECEIVING_DETAIL`

Typical transforms:
- split datetime into separate date/time fields
- derive ECS/SI fields from instrument rows
- populate dispatch and receiving dates
- seed `postfile_*` amounts from approval/disbursement values

### Delivery
Primary source priority:
1. `RC_CUSTOMER_ACCOUNT`
2. `RC_RC_INV_RECEIVING_DETAIL`
3. `RC_RC_INV_STATUS`

Typical transforms:
- invoice number/date
- RC registration number/date
- dealer delivery info
- insurance details
- chassis/engine

### Payout
Primary source priority:
1. `RC_CUSTOMER_ACCOUNT`
2. derived business rules

Important note:
Legacy files do not appear to hold the full payout transaction ledger required by the current module. This stage may need:
- partial seeding only
- or generated placeholders based on payout flags/rates
- or left open for manual completion after migration

## Transformation rules you will need
### 1. Identifier normalization
Rule:
- `TEMP_CUST_CODE`, `CDB_ACCOUNT_NO`, `CDB_ACCOUNT_NUMBER` -> `legacyCaseId`
- `CPV_ACCOUNT_NO` -> `legacyCpvId`
- never assign legacy case ID to Mongo `_id`
- store them in explicit fields such as `legacyCaseId`, `legacyCpvId`, `legacyAliases`

### 2. Name joining
Rule:
- join first/middle/last using trimmed non-empty parts
- preserve original parts in `legacyMeta.rawNames`
- if joined name conflicts with `CUSTOMER_NAME`, flag conflict instead of silently overwriting

### 3. Date/time split
Rule:
- legacy combined timestamp -> split into `date` and `time`
- if only date is present, keep time null
- keep original full timestamp in `legacyMeta`

Examples:
- `DATE_OF_DESP` + `TIME_OF_DESP` -> `dispatch_date`, `dispatch_time`
- combined ISO datetime -> target `*_date` and `*_time`

### 4. Dropdown normalization
Required for:
- loan type
- applicant type
- marital status
- gender
- occupation
- house type
- account type
- usage
- hypothecation
- status values

Approach:
- maintain per-field normalization dictionaries
- if raw value is not mapped, case goes to `manual_dropdown_normalization`
- store unmapped raw value, target field name, and impacted case IDs
- once you approve a mapping, reuse it for all matching rows

### 5. Vehicle mapping
Do not trust free text alone.

Use a layered match:
1. manufacturer/model/variant codes
2. free text `MAKE_MODEL`, `CAR_MODEL`, `DELIVERED_MAKE_MODEL`
3. fuzzy/manual confirmation queue

Output should include:
- matched make/model/variant
- confidence score
- whether manual confirmation was required

### 6. Duplicate row resolution
Use deterministic rules per file.

Suggested defaults:
- choose latest row by business date if date exists
- else prefer row whose customer name best matches expected case name
- for instrument detail: keep all rows and aggregate into an instrument array
- for RC/Invoice receiving: keep latest per document type, but preserve all raw rows

### 7. Workflow derivation
Map legacy process state into the current journey.

Use at least these inputs:
- `CASE_TYPE_CODE`
- `OVERALL_STATUS`
- `INV_STATUS`
- `RC_STATUS`
- `DATE_OF_DISBURSE`
- `DATE_OF_DELIVERY`
- `IS_VEHICLE_DELIVERED`
- financier and loan amount presence

Recommended model:
- derive business flow first
- then derive current stage
- then mark stage data completeness

## Suggested case-type derivation for your 8-case pilot
### New car with finance
Expected target:
- `typeOfLoan = "New Car"`
- `isFinanced = "Yes"`
- stage likely reaches `postfile`, `delivery`, or `payout` depending on downstream evidence

### New car cash purchase
Expected target:
- `typeOfLoan = "New Car"`
- `isFinanced = "No"`
- skip approval/disbursement flow
- move from profile/prefile directly toward delivery

### Used car
Expected target:
- `typeOfLoan = "Used Car"`
- `isFinanced` based on financer/loan evidence

### Car cash-in
Expected target:
- normalize to the exact value supported by product flow
- current code inconsistently uses `Cash-in`, `Car Cash-in`, `Re-finance`, `Refinance`
- finalize one canonical value before pilot posting

## Critical migration rules for Mongo posting
### Upsert strategy
Use a stable external key, not `_id`.

Recommended unique key:
- `legacyCaseId`
- plus optional `legacyCpvId`

Post behavior:
- if `legacyCaseId` exists, update existing loan
- else create new loan
- keep `_id` as Mongo ObjectId only

### Audit metadata to store on every imported loan
```json
{
  "legacyMeta": {
    "legacyCaseId": "3000004231",
    "legacyCpvId": "3419",
    "aliases": ["3000004231", "3419"],
    "sourceFiles": ["CPV_DETAIL", "RC_CUSTOMER_ACCOUNT"],
    "rowCounts": {
      "CPV_DETAIL": 2,
      "RC_INSTRUMENT_DETAIL": 4
    },
    "conflicts": [],
    "normalizationWarnings": [],
    "vehicleMatch": {
      "confidence": 0.71,
      "manual": true
    }
  }
}
```

## Manual review queues you should keep
### A. Dropdown mismatch queue
For each mismatch show:
- case ID
- customer name
- target field
- raw legacy value
- candidate normalized values
- impacted cases count

### B. Vehicle master queue
For each mismatch show:
- case ID
- raw make/model/variant text
- raw code values
- best candidate
- confidence

### C. Conflict queue
For same case, same concept, multiple conflicting values:
- customer name conflict
- mobile conflict
- financier conflict
- loan type conflict
- amount conflict
- vehicle conflict

## What should be optional during migration
Treat these as optional unless your business says otherwise:
- guarantor
- authorised signatory
- source reference
- payout ledger detail
- some RC/invoice records in non-delivered cases

## What should block posting
These should block automatic posting:
- unresolved customer name after merge
- unresolved primary mobile when target requires it
- unresolved loan type normalization
- unresolved vehicle variant when target logic depends on it
- `_id` being set from legacy string
- multiple conflicting applicant identities without manual resolution

## Recommended pilot execution for your 8 cases
1. Build canonical snapshots for all 8.
2. Produce target dry-run payloads without posting.
3. Review mismatch reports for dropdowns and vehicle masters.
4. Lock normalization dictionaries.
5. Post 8 pilot cases as upserts.
6. Verify live entry snapshots in UI.
7. Only then run batch import.

## Questions still requiring your decision
1. For legacy cash-in cases, what is the final canonical loan-type value you want in the new system: `Car Cash-in` or `Refinance`?
2. For new-car cash purchase, should we always force `isFinanced = "No"` even when legacy files contain financier-like text such as `CASH SALE` or `OTHERS`?
3. When the same case has two customer names in CPV rows, should priority be latest edited row, exact name match, or manual review only?
4. Do you want missing mandatory target fields to be filled with placeholders/defaults, or should those cases stop for manual review?
5. For payout stage, do you want us to seed empty payout structures or leave payout untouched unless legacy proof exists?

## Recommended next implementation step
Build an importer with four internal layers:
1. `legacyCaseResolver`
2. `legacyCanonicalBuilder`
3. `loanPayloadTransformer`
4. `importValidatorAndUpserter`

That gives you repeatable, explainable migration instead of one-off mapping screens.
