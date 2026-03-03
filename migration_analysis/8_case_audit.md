# 8-Case Migration Audit

## Coverage by case
- Gourav Luminaries Pvt Ltd. (3000004231 / 3419, new_car_finance): matched 8/10 files; missing: GURANTOR.json, RC_SOURCE_REFERENCE.json
- Jyoti Arora (3000004277 / 3462, new_car_finance): matched 7/10 files; missing: AUTH_SIGNATORY.json, GURANTOR.json, RC_SOURCE_REFERENCE.json
- Agarhan Engineers Pvt Ltd (3000004033 / 3226, new_car_cash): matched 6/10 files; missing: GURANTOR.json, RC_DOC_DESPATCH_MASTER.json, RC_INSTRUMENT_DETAIL.json, RC_SOURCE_REFERENCE.json
- Dilip Kumar Khumbat (3000004065 / 3250, new_car_cash): matched 5/10 files; missing: AUTH_SIGNATORY.json, GURANTOR.json, RC_DOC_DESPATCH_MASTER.json, RC_INSTRUMENT_DETAIL.json, RC_SOURCE_REFERENCE.json
- Sheik Manzoor Ahmed (3000004250 / 3436, used_car): matched 7/10 files; missing: AUTH_SIGNATORY.json, RC_INSTRUMENT_DETAIL.json, RC_SOURCE_REFERENCE.json
- Mora Sales Pvt Ltd (3000003718 / 2911, used_car): matched 8/10 files; missing: GURANTOR.json, RC_SOURCE_REFERENCE.json
- Sanjay Sukhija (3000004237 / 3425, cash_in): matched 6/10 files; missing: AUTH_SIGNATORY.json, GURANTOR.json, RC_RC_INV_RECEIVING_DETAIL.json, RC_SOURCE_REFERENCE.json
- Ukar Healthcare Pvt Ltd (3000003417 / 2614, cash_in): matched 7/10 files; missing: GURANTOR.json, RC_RC_INV_RECEIVING_DETAIL.json, RC_SOURCE_REFERENCE.json

## Potential data hiccups detected
- Gourav Luminaries Pvt Ltd.: duplicate/multi rows in RC_RC_INV_RECEIVING_DETAIL.json(2)
- Gourav Luminaries Pvt Ltd.: workflow snapshot CASE_TYPE_CODE=01 OVERALL_STATUS=R INV_STATUS=R RC_STATUS=R DATE_OF_DISBURSE=2025-01-04T00:00:00
- Gourav Luminaries Pvt Ltd.: LOAN_TYPE=['Auto Loan'], FINANCER=['HDFC'], HIRE_TYPE=['Company']
- Jyoti Arora: duplicate/multi rows in CPV_DETAIL.json(2), RC_RC_INV_RECEIVING_DETAIL.json(2)
- Jyoti Arora: multiple CUSTOMER_NAME variants in CPV_DETAIL -> ['JYOTI ARORA', 'JYOTI ARORA (HT CARS)']
- Jyoti Arora: workflow snapshot CASE_TYPE_CODE=01 OVERALL_STATUS=R INV_STATUS=R RC_STATUS=R DATE_OF_DISBURSE=2025-03-24T00:00:00
- Jyoti Arora: LOAN_TYPE=['Auto Loan'], FINANCER=['ICICI'], HIRE_TYPE=['Individual']
- Agarhan Engineers Pvt Ltd: duplicate/multi rows in RC_RC_INV_RECEIVING_DETAIL.json(2)
- Agarhan Engineers Pvt Ltd: workflow snapshot CASE_TYPE_CODE=01 OVERALL_STATUS=R INV_STATUS=R RC_STATUS=R DATE_OF_DISBURSE=None
- Agarhan Engineers Pvt Ltd: LOAN_TYPE=['Auto Loan'], FINANCER=['CASH SALE'], HIRE_TYPE=['Company']
- Dilip Kumar Khumbat: duplicate/multi rows in CPV_DETAIL.json(2), RC_CUSTOMER_ACCOUNT.json(2), RC_RC_INV_RECEIVING_DETAIL.json(2)
- Dilip Kumar Khumbat: multiple CUSTOMER_NAME variants in CPV_DETAIL -> ['BHAWANA VATS', 'DILIP KUMAR KHUMBAT']
- Dilip Kumar Khumbat: workflow snapshot CASE_TYPE_CODE=01 OVERALL_STATUS=R INV_STATUS=R RC_STATUS=R DATE_OF_DISBURSE=None
- Dilip Kumar Khumbat: LOAN_TYPE=['Auto Loan'], FINANCER=['CASH SALE', 'OTHERS'], HIRE_TYPE=['Individual']
- Sheik Manzoor Ahmed: workflow snapshot CASE_TYPE_CODE=02 OVERALL_STATUS=R INV_STATUS=NA RC_STATUS=R DATE_OF_DISBURSE=2025-01-30T00:00:00
- Sheik Manzoor Ahmed: LOAN_TYPE=['Auto Loan'], FINANCER=['OTHERS'], HIRE_TYPE=['Individual']
- Mora Sales Pvt Ltd: duplicate/multi rows in RC_INSTRUMENT_DETAIL.json(4)
- Mora Sales Pvt Ltd: workflow snapshot CASE_TYPE_CODE=02 OVERALL_STATUS=R INV_STATUS=NA RC_STATUS=R DATE_OF_DISBURSE=2023-03-31T00:00:00
- Mora Sales Pvt Ltd: LOAN_TYPE=['Auto Loan'], FINANCER=['ICICI'], HIRE_TYPE=['Company']
- Sanjay Sukhija: duplicate/multi rows in CPV_DETAIL.json(2), RC_INSTRUMENT_DETAIL.json(2)
- Sanjay Sukhija: workflow snapshot CASE_TYPE_CODE=03 OVERALL_STATUS=P INV_STATUS=NA RC_STATUS=P DATE_OF_DISBURSE=2025-01-17T00:00:00
- Sanjay Sukhija: LOAN_TYPE=['Auto Loan'], FINANCER=['HDFC'], HIRE_TYPE=['Individual']
- Ukar Healthcare Pvt Ltd: duplicate/multi rows in CPV_DETAIL.json(2), RC_INSTRUMENT_DETAIL.json(2)
- Ukar Healthcare Pvt Ltd: workflow snapshot CASE_TYPE_CODE=03 OVERALL_STATUS=P INV_STATUS=NA RC_STATUS=P DATE_OF_DISBURSE=2022-03-29T00:00:00
- Ukar Healthcare Pvt Ltd: LOAN_TYPE=['Auto Loan'], FINANCER=['OTHERS'], HIRE_TYPE=['Company']

## Cross-case systemic risks
- Missing in 8/8 cases: RC_SOURCE_REFERENCE.json
- Missing in 7/8 cases: GURANTOR.json
- Missing in 4/8 cases: AUTH_SIGNATORY.json
- Missing in 3/8 cases: RC_INSTRUMENT_DETAIL.json
- Missing in 2/8 cases: RC_DOC_DESPATCH_MASTER.json
- Missing in 2/8 cases: RC_RC_INV_RECEIVING_DETAIL.json
- RC_SOURCE_REFERENCE is absent in all 8 test cases -> must be optional in migration rules.
- GURANTOR missing in most cases -> treat guarantor as conditional, not mandatory.
- Several files have >1 row per case -> need deterministic row selection/aggregation rules by latest date/status.
- CPV fields mix date+time in one timestamp string and separate fields elsewhere -> transformation rules required.
- Legacy code values (CASE_TYPE_CODE, OVERALL_STATUS, INV_STATUS, RC_STATUS) require lookup dictionaries to new workflow states.
- Vehicle info appears both as free text (MAKE_MODEL/CAR_MODEL) and coded fields (MANUFACTURER_CODE/MODEL_CODE/VARIANT_CODE) -> require master mapping table with confidence + manual review queue.