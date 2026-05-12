# ACI Assist V2 — Backend Follow-ups From Frontend Finalisation

Frontend rule: render live backend data only. No static vehicle matching, fake prices, fake colors, fake variants, fake offers, fallback cars, or demo vehicle data.

## 1. Backend-owned vehicle intelligence

Frontend should not own:
- brand candidate lists
- model lookup from query
- variant matching from text
- local shortcut routing for price/colors/features/EMI/quote/compare

Backend should own:
- brand detection
- model detection
- variant detection
- city detection/defaulting
- context-aware follow-up interpretation

Example:
- User selects Verna SX IVT
- Later says: check EMI
- Backend should resolve EMI for Verna SX IVT unless user changes context

## 2. Context patch contract

Every successful backend response should return stable context when relevant:
- selectedVehicle
- anchorMake
- anchorModel
- anchorVariant
- anchorCity
- selectedColor where relevant

Frontend will persist this session context.

## 3. Canvas contract

Backend should always return a reliable canvasType.

Required supported canvas types:
- car_overview_canvas
- pricelist_canvas
- price_breakup_canvas
- comparison_canvas
- recommendation_results_canvas
- color_gallery_canvas
- color_studio_canvas
- emi_calculator_canvas
- features_explorer_canvas
- feature_match_builder_canvas
- aci_quotation_canvas
- fuel_decision_canvas
- lead_capture_canvas
- brand_models_canvas
- offers_canvas

## 4. Explicit empty arrays

Backend should return explicit arrays even when empty:
- rows: []
- colors: []
- variants: []
- actions: []
- leadingQuestions: []

This prevents frontend from mistaking empty results for missing data.

## 5. Conversational suggestions

Backend should prefer intelligent leading questions over generic action spam.

Rules:
- Max 3 to 4 suggestions
- Suggestions must preserve selected vehicle context
- Suggestions should move the customer forward
- Avoid duplicate labels
- Avoid random compare targets

Example after Verna price list:
- Want the on-road breakup for SX IVT?
- Compare Verna with City?
- Check EMI for your preferred variant?

## 6. Source transparency

Backend should expose source metadata where possible:
- source collection/module
- city used
- updatedAt
- confidence/availability reason
- unavailable reason when no data exists

## 7. Live-safe unavailable states

When no data is available, backend should return a proper unavailable notice instead of letting frontend fallback.

Example:
- inlineType: unavailable_notice
- answer: I could not find live colors for this model in the current catalogue.
- rows: []
- colors: []

## 8. Follow-up examples backend must preserve

- Verna price list -> selected model Verna
- Show colors -> colors of Verna
- Does SX have sunroof? -> Verna SX feature answer
- Check EMI -> EMI for selected Verna variant if available
- Compare with City -> Verna vs City, not City vs random car
- Get quote -> quote for selected model/variant/city

## 9. Near-instant loading requirements

ACI Assist should feel near-instant.

Backend requirements:
- Add a bootstrap endpoint for the home screen.
- Return cached/precomputed popular cars, trending cars, popular asks, saved cars, and starter recommendations.
- Target response time: 100–300ms for cached home data.
- Use stale-while-revalidate behavior where possible.
- Precompute common questions such as:
  - popular cars right now
  - best SUV under 15 lakh
  - best automatic cars
  - latest prices by brand/model
- Ensure MongoDB indexes exist for model, brand, city, body type, price range, fuel, transmission, and variant names.
- Backend should support lightweight response mode for home cards.
- Frontend should show skeletons instantly and hydrate with live data as soon as backend responds.
