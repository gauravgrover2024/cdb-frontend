# 8-Case Pilot Review

This is the pre-import review sheet for the 8 pilot cases.
No posting is assumed. Each case shows the proposed canonical flow and the exact places where manual review is required.

## Ukar Healthcare Pvt Ltd (3000003417 / 2614)
- Pilot bucket: cash_in
- Proposed target: typeOfLoan=Car Cash-in, isFinanced=Yes, currentStage=payout
- Proposed customerName: UKAR HEALTHCARE PVT LTD
- Proposed primaryMobile: 9971448428
- Proposed vehicle: Hyundai / Verna / CRDI 1.6
- Vehicle basis: VERNA CRDI 1.6
- Approval seed: bank=YES BANK, loanAmount=1212466, tenure=36, roi=14.01
- Delivery evidence: delivered=NA, deliveryDate=NA, regdNo=NA
- Instrument summary: count=2, types=ECS, Cheque
- Manual review needed: vehicle conflict: VERNA CRDI 1.6 | INNOVA CRYSTA 2.8 Z 2018; multiple CPV rows: 2; missing RC/invoice receiving rows

## Mora Sales Pvt Ltd (3000003718 / 2911)
- Pilot bucket: used_car
- Proposed target: typeOfLoan=Used Car, isFinanced=Yes, currentStage=postfile
- Proposed customerName: MORA SALES INDIA PVT LTD
- Proposed primaryMobile: 9911334422
- Proposed vehicle: Mini / Cooper Convertible / Base/unknown
- Vehicle basis: MINI COOPER
- Approval seed: bank=HDFC, loanAmount=1615120, tenure=39, roi=13.26
- Delivery evidence: delivered=NA, deliveryDate=NA, regdNo=HR26CX8008
- Instrument summary: count=4, types=Cheque, ECS
- Manual review needed: vehicle conflict: MINI COOPER | MINI COOPER CONVERTIBLE 2016

## Agarhan Engineers Pvt Ltd (3000004033 / 3226)
- Pilot bucket: new_car_cash
- Proposed target: typeOfLoan=New Car, isFinanced=No, currentStage=delivery
- Proposed customerName: AGARHAN ENGINEERS PVT LTD
- Proposed primaryMobile: 9810499067
- Proposed vehicle: Maruti Suzuki / Baleno / ZETA AGS
- Vehicle basis: BALENO ZETA AGS
- Approval seed: bank=CASH SALE, loanAmount=0, tenure=MISSING, roi=MISSING
- Delivery evidence: delivered=Y, deliveryDate=2024-03-16T00:00:00, regdNo=UP16EE5479
- Instrument summary: count=0, types=NA
- Manual review needed: none visible from pilot snapshot

## Dilip Kumar Khumbat (3000004065 / 3250)
- Pilot bucket: new_car_cash
- Proposed target: typeOfLoan=New Car, isFinanced=No, currentStage=delivery
- Proposed customerName: DILIP KUMAR KHUMBAT
- Proposed primaryMobile: 9899994433
- Proposed vehicle: Kia / Seltos / GTX PLUS
- Vehicle basis: SELTOS GTX PLUS
- Approval seed: bank=BANK OF INDIA, loanAmount=900000, tenure=60, roi=8.95
- Delivery evidence: delivered=N, deliveryDate=2024-05-04T00:00:00, regdNo=NA
- Instrument summary: count=0, types=NA
- Manual review needed: customer-name conflict: DILIP KUMAR KHUMBAT | BHAWANA VATS; vehicle conflict: SELTOS GTX PLUS | MARUTI FRONX DELTA PLUS AGS | SELTOS GTX PLUS 7 DTC  PTL; multiple CPV rows: 2; multiple RC_CUSTOMER_ACCOUNT rows: 2

## Gourav Luminaries Pvt Ltd. (3000004231 / 3419)
- Pilot bucket: new_car_finance
- Proposed target: typeOfLoan=New Car, isFinanced=Yes, currentStage=postfile
- Proposed customerName: GOURAV LUMINARIES PVT LTD 2
- Proposed primaryMobile: 9811542232
- Proposed vehicle: Maruti Suzuki / S Presso / LXI CNG
- Vehicle basis: S PRESSO LXI CNG
- Approval seed: bank=HDFC, loanAmount=525000, tenure=39, roi=9.65
- Delivery evidence: delivered=Y, deliveryDate=2025-01-06T00:00:00, regdNo=DL5CW7194
- Instrument summary: count=1, types=SI
- Manual review needed: none visible from pilot snapshot

## Sanjay Sukhija (3000004237 / 3425)
- Pilot bucket: cash_in
- Proposed target: typeOfLoan=Car Cash-in, isFinanced=Yes, currentStage=payout
- Proposed customerName: SANJAY SUKHIJA
- Proposed primaryMobile: 9268543728
- Proposed vehicle: Mahindra / TUV300 / T8
- Vehicle basis: TUV 300 T8
- Approval seed: bank=HDFC, loanAmount=565000, tenure=36, roi=14.2
- Delivery evidence: delivered=NA, deliveryDate=NA, regdNo=NA
- Instrument summary: count=2, types=Cheque
- Manual review needed: vehicle conflict: TUV 300 T8 | TUV 300 PLUS P8 2018; multiple CPV rows: 2; missing RC/invoice receiving rows

## Sheik Manzoor Ahmed (3000004250 / 3436)
- Pilot bucket: used_car
- Proposed target: typeOfLoan=Used Car, isFinanced=Yes, currentStage=postfile
- Proposed customerName: SHEIKH MANZOOR AHMED (CAR DEKHO)
- Proposed primaryMobile: 7006434266
- Proposed vehicle: Mercedes-Benz / E-Class / 200 D
- Vehicle basis: MERC E 200 D
- Approval seed: bank=BAJAJ FINANCE, loanAmount=1615360, tenure=36, roi=15.2
- Delivery evidence: delivered=NA, deliveryDate=NA, regdNo=UP16BV5588
- Instrument summary: count=0, types=NA
- Manual review needed: vehicle conflict: MERC E 200 D | MERC E 220 D 2018

## Jyoti Arora (3000004277 / 3462)
- Pilot bucket: new_car_finance
- Proposed target: typeOfLoan=New Car, isFinanced=Yes, currentStage=postfile
- Proposed customerName: JYOTI ARORA
- Proposed primaryMobile: 9910229930
- Proposed vehicle: Mahindra / Scorpio / CLASSIC
- Vehicle basis: SCORPIO  CLASSIC
- Approval seed: bank=ICICI, loanAmount=1100000, tenure=48, roi=10.1
- Delivery evidence: delivered=Y, deliveryDate=2025-03-26T00:00:00, regdNo=DL12CZ1975
- Instrument summary: count=1, types=SI
- Manual review needed: customer-name conflict: JYOTI ARORA | JYOTI ARORA (HT CARS); vehicle conflict: SCORPIO  CLASSIC | NEXON CREATIVE + S CNG; multiple CPV rows: 2
