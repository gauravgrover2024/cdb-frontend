# Legacy -> New Field Mapping (Loans Migration)

Source of truth: `/Users/gauravgrover/cdb-frontend/scripts/post-pilot-loans.js`  
Scope: payload built by `buildPayload(caseId, caseData, vehicles)` from 10 legacy JSON files.

## Conventions
- `A -> B -> C` means fallback order (first non-empty wins).
- `merge(...)` means combined/multi-field construction.
- File keys used in extractor:
  - `CPV_DETAIL.json`
  - `RC_CUSTOMER_ACCOUNT.json`
  - `RC_RC_INV_STATUS.json`
  - `RC_RC_INV_RECEIVING_DETAIL.json`
  - `RC_DOC_DESPATCH_MASTER.json`
  - `RC_INSTRUMENT_DETAIL.json`
  - `RC_SOURCE_REFERENCE.json`
  - `CUSTOMER_BANK.json`
  - `AUTH_SIGNATORY.json`
  - `GURANTOR.json`

## 1) Case / Flow / Status Mapping
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `typeOfLoan` | `RC_CUSTOMER_ACCOUNT.CASE_TYPE` -> (`CPV_DETAIL.TYPE_OF_LOAN` / `CPV_DETAIL.LOAN_TYPE` / `CPV_DETAIL.HIRE_PURPOSE` / `CPV_DETAIL.PURPOSE_OF_LOAN` / `RC_CUSTOMER_ACCOUNT.TYPE_OF_LOAN` / `RC_CUSTOMER_ACCOUNT.LOAN_TYPE` / `RC_CUSTOMER_ACCOUNT.LOAN_FOR`) | **Priority is `CASE_TYPE`**; map contains `cash-in` => `Car Cash-in`, `refinance` => `Refinance`, `used` => `Used Car`, else `New Car`. |
| `isFinanced` | derived from `typeOfLoan`, `RC_CUSTOMER_ACCOUNT.LOAN_AMOUNT`, `RC_CUSTOMER_ACCOUNT.APPLIED_LOAN_AMOUNT`, `CPV_DETAIL.LOAN_EXPECTED`, `RC_CUSTOMER_ACCOUNT.HP_TO`, `CPV_DETAIL.FINANCER` | `Car Cash-in/Refinance => Yes`; else loan amount or financier present => `Yes`, else `No`. |
| `currentStage` | `RC_CUSTOMER_ACCOUNT.DATE_OF_DISBURSE`, `RC_RC_INV_STATUS.DATE_OF_DISBURSE`, `RC_CUSTOMER_ACCOUNT.DATE_OF_DELIVERY`, `RC_RC_INV_STATUS.DATE_OF_DELIVERY`, `RC_CUSTOMER_ACCOUNT.DATE_OF_FILE_DESPATCH`, `RC_CUSTOMER_ACCOUNT.DATE_WHEN_FILE_DESPATCH` | If cash loan (`isFinanced=No`) => `delivery`; cash-in/refinance with disburse => `payout`; else delivery/disburse/dispatch fallback. |
| `status` | derived from stage + approval status | Computed by `inferStatus(...)`. |

## 2) Core Identity / Contact
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `customerName` | `RC_CUSTOMER_ACCOUNT.CUST_NAME` -> `CPV_DETAIL.CUSTOMER_NAME` | `pickName(...)` uses case-aware row preference. |
| `applicantType` | `CPV_DETAIL.HIRE_TYPE`, `customerName`, CPV company cues | `normalizeApplicantType(...)` => `Individual`/`Company`. |
| `primaryMobile` | Company: `CPV_DETAIL.OFF_PHONE1 -> OFF_PHONE2 -> OFF_PHONE3 -> GURANTOR.OFF_PHONE -> RC_CUSTOMER_ACCOUNT.PHONE_NUMBERS_OFFICE -> AUTH_SIGNATORY.PHONE/MOBILE -> CPV_DETAIL.RESI_PHONE1`; Individual: `CPV_DETAIL.RESI_PHONE1 -> CPV_DETAIL.MOBILE -> RC_CUSTOMER_ACCOUNT.MOBILE_NUMBER -> RC_CUSTOMER_ACCOUNT.PHONE_NUMBERS_RESI -> AUTH_SIGNATORY.PHONE/MOBILE` | Clean numeric text. |
| `primaryMobileAlt` | `CPV_DETAIL.RESI_PHONE2 -> RESI_PHONE3 -> OFF_PHONE2 -> OFF_PHONE3 -> GURANTOR.RESI_PHONE -> GURANTOR.OFF_PHONE -> CPV_DETAIL.OFF_PHONE1` | First number different from primary. |
| `email` | `CPV_DETAIL.E_MAIL -> CPV_DETAIL.EMAIL_ADDRESS` | clean text |
| `panNumber` | `CPV_DETAIL.PAN_NUMBER` | clean text |
| `gstNumber` | Company only: `CPV_DETAIL.GST_NUMBER -> RC_CUSTOMER_ACCOUNT.GST_NUMBER` | company flow only |

## 3) Address / Residence / Registration
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `residenceAddress` | Company: `merge(CPV_DETAIL.OFF_ADD1,OFF_ADD2) -> merge(CPV_DETAIL.RESI_ADD1,RESI_ADD2)`; Individual: `merge(CPV_DETAIL.RESI_ADD1,RESI_ADD2) -> CPV_DETAIL.RESIDENCE_ADDRESS -> CPV_DETAIL.RESI_ADDRESS -> RC_CUSTOMER_ACCOUNT.RESI_ADDRESS -> RC_CUSTOMER_ACCOUNT.CUST_ADDRESS -> RC_CUSTOMER_ACCOUNT.ADDRESS` | joined cleaned text |
| `pincode` | Company: `CPV_DETAIL.OFF_PIN`; Individual: `CPV_DETAIL.RESI_PIN` | clean |
| `city` | Company: `CPV_DETAIL.OFF_CITY`; Individual: `CPV_DETAIL.RESI_CITY` | clean |
| `permanentAddress` | `CPV_DETAIL.PERMANENT_ADDRESS` | Parsed; if empty/NA then same as current. |
| `sameAsCurrentAddress` | derived from permanent/current | `true` if no permanent or same string-wise. |
| `permanentPincode` | if same => `pincode`; else extract from permanent address | regex extraction fallback |
| `permanentCity` | if same => `city`; else guess from permanent address | heuristic |
| `registrationAddress` | `RC_CUSTOMER_ACCOUNT.ADDRESS_FOR_REGISTER` + current/permanent | Office/GST => current; Permanent => permanent; Resi/Aadhaar => current; else company=>current else permanent/current. |
| `registrationPincode` | extract from registration address -> `permanentPincode -> pincode` | derived |
| `registrationCity` | `registration number prefix` -> address rule -> fallback city hints | Prefix map (DL/UP/HR etc) and address comparisons. |
| `registerSameAsAadhaar` | `RC_CUSTOMER_ACCOUNT.IS_CAR_REGISTER_ON_SAME_ADDRES` | normalize yes/no, else derived from address equality. |
| `registerSameAsPermanent` | derived from registration/permanent/current | yes/no/undefined |

## 4) Vehicle Fields
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `vehicleMake` | legacy text from `RC_CUSTOMER_ACCOUNT.MAKE_MODEL -> RC_CUSTOMER_ACCOUNT.DELIVERED_MAKE_MODEL -> CPV_DETAIL.CAR_MODEL` + vehicle resolver | In raw mode, prefer legacy-safe resolution with conservative fallback. |
| `vehicleModel` | same as above | `preferredVehicleText` fallback retained to avoid bad normalization. |
| `vehicleVariant` | same as above | keeps legacy text in uncertain cases; year split helper used for cash-in/refi. |
| `boughtInYear` | cash-in/refi only: from variant suffix year -> `RC_CUSTOMER_ACCOUNT.BOUGHT_IN_YEAR -> RC_CUSTOMER_ACCOUNT.VEHICLE_YEAR -> CPV_DETAIL.BOUGHT_IN_YEAR -> preferred vehicle text` | parse 4-digit/2-digit year normalization |
| `exShowroomPrice` | `RC_CUSTOMER_ACCOUNT.EX_SHOWROOM_OR_VALUATION` | numeric |
| `usage` | fixed | `"Private"` |
| `purposeOfLoan` | `CPV_DETAIL.PURPOSE_OF_LOAN` + loan type | normalized with loan-type rules |

## 5) Loan Financials / Banking
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `loan_number` | `RC_CUSTOMER_ACCOUNT.LOAN_NUMBER_PREFIX + LOAN_NUMBER_MIDDLE + LOAN_NUMBER_SUFFIX + LOAN_NUMBER` | concatenated available parts |
| `loanTenureMonths` | `RC_CUSTOMER_ACCOUNT.TENOR -> RC_CUSTOMER_ACCOUNT.APPLIED_TENOR -> CPV_DETAIL.TENDOR` | numeric |
| `financeExpectation` | if financed: `RC_CUSTOMER_ACCOUNT.LOAN_AMOUNT -> RC_CUSTOMER_ACCOUNT.APPLIED_LOAN_AMOUNT -> CPV_DETAIL.LOAN_EXPECTED` | numeric |
| `hypothecationBank` | `RC_CUSTOMER_ACCOUNT.HP_TO -> CPV_DETAIL.FINANCER` | normalized bank name |
| `bankName` | `CUSTOMER_BANK.BANK_NAME -> approval bank` | normalized bank name |
| `accountNumber` | `CUSTOMER_BANK.CA_ACCOUNT_NO -> CUSTOMER_BANK.SB_ACCOUNT_NO` | clean |
| `branch` | `CUSTOMER_BANK.BANK_ADDRESS` | clean |
| `accountType` | from bank row (`CA`/`SB`) | `inferAccountType(bank)` |
| `totalIncome` | `CPV_DETAIL.ANNUAL_INCOME` | numeric |
| `totalIncomeITR` | `CPV_DETAIL.ANNUAL_INCOME` | numeric |

## 6) Personal / Profile (Individual)
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `dob` | `CPV_DETAIL.DATE_OF_BIRTH` | ISO date |
| `gender` | `CPV_DETAIL.SEX` | normalized |
| `motherName` | `CPV_DETAIL.MOTHERS_MAIDEN_NAME` | clean |
| `sdwOf` | `merge(CPV_DETAIL.FATHERS_NAME_FIRST, FATHERS_NAME_MIDDLE, FATHERS_NAME_LAST)` | clean |
| `maritalStatus` | `CPV_DETAIL.MARITAL_STATUS` | normalized |
| `dependents` | `CPV_DETAIL.NO_OF_DEPENDANTS` | numeric |
| `education` | `CPV_DETAIL.EDUCATION` | normalized |
| `houseType` | `CPV_DETAIL.RESIDENCE_TYPE` | normalized (e.g., your own->Owned) |
| `yearsInCurrentCity` | `CPV_DETAIL.YEARS_AT_RESIDENCE` | numeric |
| `yearsInCurrentHouse` | `CPV_DETAIL.YEARS_AT_RESIDENCE` | numeric |
| `identityProofType` | inferred from CPV doc fields | Aadhaar/Passport/DL inference |
| `identityProofNumber` | `CPV_DETAIL.AADHAAR_NUMBER -> DRIVING_LICENSE -> PASSPORT_NUMBER` | clean |
| `addressProofType` | constant | `"AADHAAR"` |
| `addressProofNumber` | `CPV_DETAIL.AADHAAR_NUMBER` | clean |

## 7) Occupation / Company Snapshot
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `occupationType` | Company fixed `Self Employed`; Individual: `CPV_DETAIL.PROFESSION_TYPE` | normalized |
| `professionalType` | derived | currently mostly undefined except co/company helper path |
| `companyType` | Company: inferred from PAN/company-name (`inferCompanyType`); Individual: `CPV_DETAIL.CATEGORY -> CPV_DETAIL.ORGANISATION_TYPE` | normalized |
| `businessNature` | `buildCombinedBusinessNature(cpv)` using `CPV_DETAIL.ORGANISATION_TYPE + INDUSTRY_DETAIL` | multi-value combined |
| `designation` | Company: `AUTH_SIGNATORY.DESIGNATION_1 -> DESIGNATION`; Individual: `CPV_DETAIL.INDUSTRY_DETAIL` | clean |
| `experienceCurrent` | `CPV_DETAIL.YEAR_AT_PROFESSION` | numeric |
| `totalExperience` | `CPV_DETAIL.YEAR_AT_PROFESSION` | numeric |
| `employmentAddress` | `merge(CPV_DETAIL.OFF_ADD1,OFF_ADD2)` | clean |
| `employmentPincode` | `CPV_DETAIL.OFF_PIN` | clean |
| `employmentCity` | `CPV_DETAIL.OFF_CITY` | clean |
| `employmentPhone` | office phone picker | with fallbacks incl OFF_PHONE2/3 |
| `officialEmail` | email | from profile email |

## 8) References
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `reference1_*` | `CPV_DETAIL.REF1_NAME / REF1_PHONE / REF1_ADD / REF1_RELATION` | `pincode` extracted from address (2-digit Delhi suffix -> `1100xx` rule in helper); city guessed. |
| `reference2_*` | `CPV_DETAIL.REF2_NAME / REF2_PHONE / REF2_ADD / REF2_RELATION` | same as above |
| `referenceName` (record details) | `RC_SOURCE_REFERENCE.REFERENCE_BY` | pre-file record section |
| `referenceNumber` (record details) | `RC_SOURCE_REFERENCE.PHONE_NUMBER` | pre-file record section |

## 9) Source / Dealer / Record Intake
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `recordSource` | `RC_CUSTOMER_ACCOUNT.SOURCE` | default `Direct` |
| `sourceName` | If indirect: `CPV_DETAIL.SOURCE_BY -> RC_SOURCE_REFERENCE.SOURCE_NAME -> REFERENCE_BY -> RC_CUSTOMER_ACCOUNT.CASE_ORIGIN`; else `RC_SOURCE_REFERENCE.SOURCE_NAME -> REFERENCE_BY -> CPV_DETAIL.SOURCE_BY -> RC_CUSTOMER_ACCOUNT.CASE_ORIGIN` | normalized |
| `sourceDetails` | same as `sourceName` | alias in payload |
| `docsPreparedBy` | `RC_DOC_DESPATCH_MASTER.DOCS_PREPARED_BY -> RC_CUSTOMER_ACCOUNT.PRE_DOCS_PREPARED_BY -> POST_DOCS_PREPARED_BY -> CLOSED_BY -> DEALT_BY` | clean |
| `dsaCode` | `RC_CUSTOMER_ACCOUNT.DSA_CODE` | clean |
| `dealerName` | `RC_CUSTOMER_ACCOUNT.PAYMENT_FAVOURING_AT_DESPATCH` | ignored if literal `customer name` |
| `dealerAddress` | none | blank by rule |
| `dealerMobile` | none | blank by rule |
| `dealerContactPerson` | none | blank by rule |
| `dealerContactNumber` | none | blank by rule |
| `receivingDate` | `RC_CUSTOMER_ACCOUNT.DATE_WHEN_FILE_RECEIVED -> RC_DOC_DESPATCH_MASTER.DATE_OF_DESP -> CPV_DETAIL.CPV_DATE` | date |
| `receivingTime` | `RC_CUSTOMER_ACCOUNT.TIME_WHEN_FILE_RECEIVED -> RC_DOC_DESPATCH_MASTER.TIME_OF_DESP -> DEFAULT_TIME` | time normalize |

## 10) Approval / Post-file / Dispatch / Disbursement
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `approval_bankName` / `postfile_bankName` | `RC_CUSTOMER_ACCOUNT.HP_TO -> CPV_DETAIL.FINANCER` | bank normalization |
| `approval_loanAmountApproved` / `postfile_loanAmountApproved` | `RC_CUSTOMER_ACCOUNT.LOAN_AMOUNT -> APPLIED_LOAN_AMOUNT -> CPV_DETAIL.LOAN_EXPECTED` | numeric |
| `approval_loanAmountDisbursed` / `postfile_loanAmountDisbursed` | same as above | numeric |
| `approval_roi` / `postfile_roi` | `RC_CUSTOMER_ACCOUNT.ROI -> APPLIED_ROI` | numeric |
| `approval_tenureMonths` / `postfile_tenureMonths` | `RC_CUSTOMER_ACCOUNT.TENOR -> APPLIED_TENOR -> CPV_DETAIL.TENDOR` | numeric |
| `approval_approvalDate` | `RC_CUSTOMER_ACCOUNT.DATE_OF_DISBURSE -> RC_RC_INV_STATUS.DATE_OF_DISBURSE -> RC_CUSTOMER_ACCOUNT.DATE_OF_FILE_DESPATCH -> CPV_DETAIL.CPV_DATE` | ISO |
| `approval_disbursedDate` / `disbursement_date` | `RC_CUSTOMER_ACCOUNT.DATE_OF_DISBURSE -> RC_RC_INV_STATUS.DATE_OF_DISBURSE` | date |
| `postfile_firstEmiDate` | `RC_CUSTOMER_ACCOUNT.EMI_DUE_DATE -> APPLIED_EMI_DUE_DATE` | date |
| `postfile_emiAmount` | `RC_CUSTOMER_ACCOUNT.EMI -> APPLIED_EMI` | numeric |
| `postfile_emiPlan` + `emiPlan` | `RC_CUSTOMER_ACCOUNT.EMI_PLAN` | normalized (`1+1`, etc.) |
| `postfile_emiMode` | `RC_CUSTOMER_ACCOUNT.EMI_TYPE_ARREAR_ADVANCE` | default `Arrear` |
| `postfile_disbursedCreditAssured` | `RC_CUSTOMER_ACCOUNT.ICICI_CREDIT_ASSURED` | numeric |
| `postfile_disbursedInsurance` | `RC_CUSTOMER_ACCOUNT.INSURANCE_FINANCED` | numeric |
| `dispatch_date` | `RC_DOC_DESPATCH_MASTER.DATE_OF_DESP -> RC_CUSTOMER_ACCOUNT.DATE_OF_FILE_DESPATCH -> DATE_WHEN_FILE_DESPATCH` | date |
| `dispatch_time` | `RC_DOC_DESPATCH_MASTER.TIME_OF_DESP -> RC_CUSTOMER_ACCOUNT.TIME_OF_FILE_DESPATCH` | time |
| `dispatch_through` | `RC_DOC_DESPATCH_MASTER.DESP_THROUGH -> RC_CUSTOMER_ACCOUNT.DESPATCH_FOR_APPROVAL_THROUGH -> FILE_DESPATCH_BY` | clean |
| `docs_prepared_by` | same as docsPreparedBy chain | copied |

## 11) Delivery / Invoice / RC (New Car path in payload)
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `delivery_date` | `RC_CUSTOMER_ACCOUNT.DATE_OF_DELIVERY -> RC_RC_INV_STATUS.DATE_OF_DELIVERY` | only when `typeOfLoan=New Car` in payload currently |
| `invoice_number` | `RC_RC_INV_RECEIVING_DETAIL.INVOICE_NUMBER -> RC_RC_INV_STATUS.INVOICE_NUMBER` | invoice-row priority logic |
| `invoice_date` | `RC_RC_INV_RECEIVING_DETAIL.INVOICE_DATE -> RC_RC_INV_STATUS.INVOICE_DATE` | date |
| `invoice_received_as` | `RC_RC_INV_RECEIVING_DETAIL.INV_RECEIVED_ON_DATE_2 -> INV_RECEIVED_ON_DATE_1 -> INV_RECEIVED_AS` | normalized enum |
| `invoice_received_from` | `RC_RC_INV_RECEIVING_DETAIL.INV_RECEIVED_FROM` | clean |
| `invoice_received_date` | `RC_RC_INV_RECEIVING_DETAIL.INV_RECEIVED_ON_DATE -> ON_DATE` | date |
| `rc_redg_no` | `RC_RC_INV_RECEIVING_DETAIL.REGD_NUMBER -> RC_CUSTOMER_ACCOUNT.REGISTRATION_NUMBER -> RC_RC_INV_STATUS.REGD_NUMBER` | clean |
| `rc_chassis_no` | `RC_RC_INV_RECEIVING_DETAIL.CHASIS_NUMBER -> RC_RC_INV_STATUS.CHASIS_NUMBER` | clean |
| `rc_engine_no` | `RC_RC_INV_RECEIVING_DETAIL.ENGINE_NUMBER -> RC_RC_INV_STATUS.ENGINE_NUMBER` | clean |
| `rc_redg_date` | `RC_RC_INV_RECEIVING_DETAIL.DATE_OF_REGISTRATION -> RC_RC_INV_STATUS.DATE_OF_REGISTRATION` | date |
| `rc_received_as` | `RC_RC_INV_RECEIVING_DETAIL.RC_RECEIVED_AS_1 -> RC_RECEIVED_AS` | normalized enum |
| `rc_received_from` | `RC_RC_INV_RECEIVING_DETAIL.RC_RECEIVED_FROM` | clean |
| `rc_received_date` | `RC_RC_INV_RECEIVING_DETAIL.RC_RECEIVED_ON_DATE -> ON_DATE` | date |

## 12) Payout (Car Cash-in)
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `payoutApplicable` | derived from loan type | `Yes` for `Car Cash-in` |
| `prefile_sourcePayoutPercentage` | `RC_CUSTOMER_ACCOUNT.PAYOUT_RATE` | numeric |
| `payoutPercentage` | `RC_CUSTOMER_ACCOUNT.PAYOUT_RATE` | numeric |

## 13) Co-applicant / Signatory (Company flow)
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `co_*` block | built by `buildCompanyCoApplicant(...)` from `AUTH_SIGNATORY.*`, `GURANTOR.*`, `CPV_DETAIL.*` | co-applicant synthesized for company flow. |
| `co_customerName` | `AUTH_SIGNATORY.NAME_1 -> AUTH_SIGNATORY.NAME -> GURANTOR.NAME` | clean |
| `co_primaryMobile` | `AUTH_SIGNATORY.PHONE_1 -> PHONE -> MOBILE -> GURANTOR.RESI_PHONE -> GURANTOR.OFF_PHONE -> CPV_DETAIL.RESI_PHONE1 -> CPV_DETAIL.MOBILE` | clean |
| `co_address` | `merge(AUTH_SIGNATORY.ADD1_1/ADD1, ADD2_1/ADD2) -> merge(GURANTOR.RESI_ADD1,RESI_ADD2) -> merge(GURANTOR.OFF_ADD1,OFF_ADD2) -> merge(CPV_DETAIL.RESI_ADD1,RESI_ADD2)` | clean |
| `co_pincode` | `AUTH_SIGNATORY.PIN_1/PIN -> GURANTOR.RESI_PIN/OFF_PIN -> CPV_DETAIL.RESI_PIN` | clean |
| `co_city` | `AUTH_SIGNATORY.CITY_1/CITY -> GURANTOR.RESI_CITY/OFF_CITY -> CPV_DETAIL.RESI_CITY` | clean |
| `co_dob` | `AUTH_SIGNATORY.DATE_OF_BIRTH_1 -> DATE_OF_BIRTH -> CPV_DETAIL.DATE_OF_BIRTH` | ISO |
| `co_aadhaar` | `AUTH_SIGNATORY.AUTH_AADHAAR_NUMBER -> AADHAAR_NUMBER_1 -> GURANTOR.G_AADHAAR_NUMBER -> CPV_DETAIL.AADHAAR_NUMBER` | clean |
| `co_dependents` | `CPV_DETAIL.NO_OF_DEPENDANTS -> GURANTOR.NO_OF_DEPEND` | numeric |
| `co_houseType` | `CPV_DETAIL.RESIDENCE_TYPE -> GURANTOR.RESIDENCE_TYPE` | normalized |
| `co_designation` | `AUTH_SIGNATORY.DESIGNATION_1 -> DESIGNATION` | clean |
| `co_currentExperience` / `co_totalExperience` | `CPV_DETAIL.YEAR_AT_PROFESSION` | numeric |
| `signatorySameAsCoApplicant` | derived | company => `true` |
| `signatory_customerName` | `AUTH_SIGNATORY.NAME_1 -> NAME -> co_customerName` | clean |
| `signatory_primaryMobile` | `AUTH_SIGNATORY.PHONE_1 -> PHONE -> MOBILE -> co_primaryMobile -> primaryMobile` | clean |
| `signatory_address` | `merge(AUTH_SIGNATORY.ADD1_1/ADD1,ADD2_1/ADD2) -> co_address -> residenceAddress` | clean |
| `signatory_pincode` | `AUTH_SIGNATORY.PIN_1 -> PIN -> co_pincode -> pincode` | clean |
| `signatory_city` | `AUTH_SIGNATORY.CITY_1 -> CITY -> co_city -> city` | clean |
| `signatory_dob` | `AUTH_SIGNATORY.DATE_OF_BIRTH_1 -> DATE_OF_BIRTH -> co_dob` | ISO |
| `signatory_designation` | `AUTH_SIGNATORY.DESIGNATION_1 -> DESIGNATION -> co_designation` | clean |
| `signatory_aadhaar` | `AUTH_SIGNATORY.AADHAAR_NUMBER_1 -> AUTH_AADHAAR_NUMBER -> co_aadhaar` | clean |

## 14) Instrument Details
| New field | Legacy source(s) | Transform / rule |
|---|---|---|
| `instrumentType` | `RC_INSTRUMENT_DETAIL.INSTRMNT_TYPE` rows | Priority: `SI` > `ECS` > `Cheque`. |
| `si_accountNumber` | `RC_INSTRUMENT_DETAIL.ACCOUNT_NUMBER` (SI row) | clean |
| `si_signedBy` | `RC_INSTRUMENT_DETAIL.INSTRMNT_BY_BORWR_GRNTR` | normalized party |
| `ecs_micrCode` | ECS row `MICR_CODE` | clean |
| `ecs_bankName` | ECS row `DRAWN_ON` | normalized bank |
| `ecs_accountNumber` | ECS row `ACCOUNT_NUMBER` | clean |
| `ecs_date` | ECS row `INSTRMNT_DATE` | date |
| `ecs_amount` | ECS row `INSTRMNT_AMOUNT` | numeric |
| `ecs_tag` | ECS row `INSTRMNT_FAVOURING` | clean |
| `ecs_favouring` | approval bank | auto-fill hypothecation bank |
| `ecs_signedBy` | ECS row `INSTRMNT_BY_BORWR_GRNTR` | normalized |
| `cheque_{n}_number` | Cheque rows `INSTRMNT_NO -> INSTRMNT_RECPT_ID_NO` | indexed list |
| `cheque_{n}_bankName` | Cheque rows `DRAWN_ON` | normalized bank |
| `cheque_{n}_accountNumber` | Cheque rows `ACCOUNT_NUMBER` | clean |
| `cheque_{n}_date` | Cheque rows `INSTRMNT_DATE -> ENTERED_ON_DATE` | date |
| `cheque_{n}_amount` | Cheque rows `INSTRMNT_AMOUNT` | numeric |
| `cheque_{n}_tag` | Cheque rows `INSTRMNT_FAVOURING` | clean |
| `cheque_{n}_favouring` | approval bank | auto-fill |
| `cheque_{n}_signedBy` | Cheque rows `INSTRMNT_BY_BORWR_GRNTR` | normalized |

## 15) Explicit Multi-Field Combined Rules
- `businessNature` = combined normalized values from `CPV_DETAIL.ORGANISATION_TYPE` + `CPV_DETAIL.INDUSTRY_DETAIL`.
- `loan_number` = concatenation of prefix/middle/suffix/full when available.
- `references` include address parsing + pincode inference + city guess.
- `registrationCity` resolved by ordered strategy:
  1. registration prefix map (DL/UP/HR etc),
  2. address equality (resi/permanent),
  3. `ADDRESS_FOR_REGISTER` semantic rule,
  4. fallback city hints (`RC_RECEIVED_FROM` / guessed address city).
- Vehicle mapping is conservative in raw mode: if uncertain, keeps legacy text instead of forcing possibly wrong normalized make/model/variant.

## 16) Known Conditional Behavior (Important)
- Delivery/Invoice/RC fields in payload are currently guarded by `typeOfLoan === "New Car"` in script.
- Payout fields are guarded by `typeOfLoan === "Car Cash-in"`.
- Company signatory fields are generated only when applicant type is `Company`.

## 17) Pending Audit Suggestion
Before full import run, export this mapping into a checklist and mark each row as:
- `Verified correct`
- `Needs normalization tweak`
- `Needs fallback addition`
- `Should be blank by business rule`

