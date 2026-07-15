import React from "react";

export default function AciV2ChatExperienceStyles() {
  return (
    <style>{`
      .aci-answer-lead {
        width: min(100%, 650px);
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-items: start;
        gap: 11px;
        padding: 4px 2px 2px;
        color: #0b1730;
      }

      .aci-answer-lead-icon {
        width: 32px;
        height: 32px;
        display: none;
        place-items: center;
        border: 1px solid #d8e5f6;
        border-radius: 8px;
        color: #0758f8;
        background: #f7faff;
      }

      .aci-answer-lead.is-color .aci-answer-lead-icon { color: #0f766e; background: #f0fdfa; border-color: #ccebe6; }
      .aci-answer-lead.is-compare .aci-answer-lead-icon { color: #7c3aed; background: #faf7ff; border-color: #e4d9fa; }
      .aci-answer-lead.is-feature .aci-answer-lead-icon { color: #b45309; background: #fffbeb; border-color: #f4e3b4; }
      .aci-answer-lead.is-score .aci-answer-lead-icon { color: #8a5a00; background: #fffaf0; border-color: #ecdcb7; }
      .aci-answer-lead.is-recommendation .aci-answer-lead-icon { color: #0758f8; background: #eef5ff; border-color: #d5e3f8; }
      .aci-answer-lead.is-error .aci-answer-lead-icon { color: #b42318; background: #fff7f6; border-color: #f1d1ce; }

      .aci-answer-lead-copy { min-width: 0; }

      .aci-answer-lead-eyebrow {
        display: block;
        margin: 1px 0 5px;
        color: #0758f8;
        font-size: 9.5px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .aci-answer-lead h3 {
        margin: 0;
        color: #0b1730;
        font-size: 20px;
        line-height: 1.2;
        font-weight: 760;
        letter-spacing: 0;
        overflow-wrap: anywhere;
      }

      .aci-answer-lead-metrics {
        margin-top: 10px;
        display: flex;
        align-items: stretch;
        flex-wrap: wrap;
        gap: 0;
      }

      .aci-answer-lead-metrics > span {
        min-width: 105px;
        padding: 0 14px;
        border-left: 1px solid #e1e8f2;
      }

      .aci-answer-lead-metrics > span:first-child { padding-left: 0; border-left: 0; }
      .aci-answer-lead-metrics strong,
      .aci-answer-lead-metrics small { display: block; letter-spacing: 0; }
      .aci-answer-lead-metrics strong { color: #13213b; font-size: 13px; line-height: 1.15; font-weight: 780; }
      .aci-answer-lead-metrics small { margin-top: 3px; color: #69758a; font-size: 10px; line-height: 1.2; font-weight: 600; }

      .aci-answer-lead-note,
      .aci-answer-lead-details p {
        margin: 9px 0 0;
        max-width: 620px;
        color: #56647a;
        font-size: 12.5px;
        line-height: 1.5;
        font-weight: 520;
        letter-spacing: 0;
      }

      .aci-answer-lead-details { display: grid; gap: 6px; }
      .aci-answer-lead-details p + p { margin-top: 0; }

      .aci-journey-actions {
        width: min(100%, 650px);
        margin-top: 3px;
        padding-top: 14px;
        border-top: 1px solid #e4eaf3;
      }

      .aci-journey-actions-intro {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        color: #647087;
      }

      .aci-journey-actions-intro > svg { margin-top: 2px; color: #0758f8; flex: 0 0 auto; }
      .aci-journey-actions-intro span,
      .aci-journey-actions-intro strong,
      .aci-journey-actions-intro small { display: block; letter-spacing: 0; }
      .aci-journey-actions-intro strong { color: #25334a; font-size: 11px; line-height: 1.2; font-weight: 760; }
      .aci-journey-actions-intro small { margin-top: 2px; color: #778398; font-size: 10.5px; line-height: 1.3; font-weight: 520; }

      .aci-journey-actions-list {
        margin-top: 7px;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0 20px;
      }

      .aci-journey-actions-list button {
        min-width: 0;
        min-height: 34px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 7px;
        padding: 5px 0;
        border: 0;
        border-radius: 0;
        color: #26344c;
        background: transparent;
        font: inherit;
        font-size: 11.5px;
        line-height: 1.25;
        font-weight: 680;
        letter-spacing: 0;
        text-align: left;
        cursor: pointer;
        transition: color 160ms ease;
      }

      .aci-journey-actions-list button span { min-width: 0; overflow-wrap: anywhere; }
      .aci-journey-actions-list button svg {
        width: 18px;
        height: 18px;
        padding: 3px;
        flex: 0 0 auto;
        color: #5f6d83;
        border: 1px solid #d9e1ec;
        border-radius: 50%;
      }
      .aci-journey-actions-list button:hover,
      .aci-journey-actions-list button:focus-visible { color: #064fdc; outline: none; }
      .aci-journey-actions-list button.is-primary { color: #064fdc; }
      .aci-journey-actions-list button.is-lead { color: #11675d; }

      .aci-chat-message.is-assistant:has(.aci-chat-result-card) .aci-answer-lead,
      .aci-chat-message.is-assistant:has(.aci-feature-inline-card-v4) .aci-answer-lead,
      .aci-chat-message.is-assistant:has(.aci-compound-card) .aci-answer-lead,
      .aci-chat-message.is-assistant:has(.aci-score-inline-card) .aci-answer-lead,
      .aci-chat-message.is-assistant:has(.aci-recommendation-card) .aci-answer-lead {
        width: calc(100% - 46px);
        margin-left: 46px;
      }

      .aci-compound-card,
      .aci-score-inline-card,
      .aci-recommendation-card {
        width: 100%;
        overflow: hidden;
        border: 1px solid #dce4ef;
        border-radius: 8px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        box-shadow: 0 24px 58px -44px rgba(18, 38, 76, .52);
      }

      .aci-compound-card { padding: 15px; }
      .aci-compound-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
      .aci-compound-model { min-width: 0; padding: 0; display: grid; grid-template-columns: 138px minmax(0, 1fr); gap: 13px; }
      .aci-compound-model + .aci-compound-model { border-left: 0; }
      .aci-compound-model-visual { height: 116px; display: grid; place-items: center; overflow: hidden; border-radius: 7px; background: transparent; }
      .aci-compound-model-visual img { width: 100%; height: 100%; object-fit: contain; }
      .aci-compound-car-fallback { width: 52px; height: 52px; display: grid; place-items: center; border: 1px solid #d9e2ee; border-radius: 50%; color: #6c7890; background: #fff; font-size: 18px; font-weight: 760; }
      .aci-compound-model-copy { min-width: 0; }
      .aci-compound-model h4 { margin: 1px 0 10px; color: #111d34; font-size: 14px; line-height: 1.25; font-weight: 780; letter-spacing: 0; }
      .aci-compound-facts { display: grid; gap: 7px; }
      .aci-compound-facts > span { min-width: 0; display: grid; grid-template-columns: 16px auto minmax(0, 1fr); align-items: center; gap: 5px; }
      .aci-compound-facts svg { color: #0758f8; }
      .aci-compound-facts b { color: #24324a; font-size: 11px; line-height: 1.15; white-space: nowrap; }
      .aci-compound-facts small { min-width: 0; color: #788399; font-size: 9.5px; line-height: 1.15; overflow-wrap: anywhere; }
      .aci-compound-model-actions { margin-top: 11px; display: flex; flex-wrap: wrap; gap: 6px; }
      .aci-compound-model-actions button { min-height: 31px; display: flex; align-items: center; gap: 5px; padding: 5px 0; border: 0; border-radius: 0; color: #0758f8; background: transparent; font: inherit; font-size: 10.5px; font-weight: 700; cursor: pointer; }
      .aci-compound-model-actions button svg:first-child { color: #0758f8; }
      .aci-compound-model-actions button svg:last-child { color: #7b8799; }
      .aci-compound-model-actions button:hover,
      .aci-compound-model-actions button:focus-visible { border-color: #9abaf2; color: #064fdc; outline: none; }
      .aci-compound-feature-action { width: 100%; min-height: 38px; margin-top: 10px; padding: 7px 0 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 0; border-top: 1px solid #e5eaf1; color: #23334c; background: transparent; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
      .aci-compound-feature-action span { display: flex; align-items: center; gap: 7px; }
      .aci-compound-feature-action span svg { color: #0758f8; }
      .aci-compound-feature-examples { padding: 11px 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; border-top: 1px solid #e5eaf1; background: #fff; }
      .aci-compound-feature-examples strong,
      .aci-compound-feature-examples span { display: block; letter-spacing: 0; }
      .aci-compound-feature-examples strong { color: #25334a; font-size: 10.5px; line-height: 1.2; }
      .aci-compound-feature-examples span { margin-top: 4px; color: #6f7b90; font-size: 9.5px; line-height: 1.4; }

      .aci-score-inline-card > header { padding: 13px 14px 11px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #e7ebf2; background: #fbfcfe; }
      .aci-score-inline-card > header > span { width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid #e8d9b8; border-radius: 7px; color: #9a6500; background: #fffaf0; }
      .aci-score-inline-card header small { display: block; color: #8b6a2b; font-size: 9px; line-height: 1; font-weight: 760; text-transform: uppercase; letter-spacing: .08em; }
      .aci-score-inline-card h4 { margin: 3px 0 0; color: #18253d; font-size: 13px; line-height: 1.25; font-weight: 760; letter-spacing: 0; }
      .aci-score-inline-list { padding: 4px 14px; }
      .aci-score-inline-list article { min-height: 58px; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 10px; border-bottom: 1px solid #edf0f5; }
      .aci-score-inline-list article:last-child { border-bottom: 0; }
      .aci-score-inline-list article > b { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; color: #0758f8; background: #eef4ff; font-size: 10px; }
      .aci-score-inline-list article > span { min-width: 0; }
      .aci-score-inline-list strong,
      .aci-score-inline-list small { display: block; letter-spacing: 0; }
      .aci-score-inline-list strong { color: #25324a; font-size: 11.5px; line-height: 1.2; font-weight: 720; }
      .aci-score-inline-list span small { margin-top: 3px; color: #788399; font-size: 9.5px; line-height: 1.25; }
      .aci-score-inline-list em { color: #1e2d46; font-size: 11px; line-height: 1.15; font-style: normal; font-weight: 760; text-align: right; }
      .aci-score-inline-list em small { margin-top: 3px; color: #8a7449; font-size: 8.5px; }
      .aci-score-inline-open { width: 100%; min-height: 40px; padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; border: 0; border-top: 1px solid #e7ebf2; color: #0758f8; background: #fafcff; font: inherit; font-size: 10.5px; font-weight: 700; cursor: pointer; }

      .aci-recommendation-card { padding: 15px; }
      .aci-recommendation-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
      .aci-recommendation-model { min-width: 0; }
      .aci-recommendation-visual { height: 116px; display: grid; place-items: center; color: #91a0b5; background: transparent; }
      .aci-recommendation-visual img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 13px 12px rgba(15, 23, 42, .12)); }
      .aci-recommendation-rank { display: block; margin-top: 3px; color: #0758f8; font-size: 9px; line-height: 1; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .aci-recommendation-model h4 { margin: 6px 0 0; color: #111d34; font-size: 13px; line-height: 1.25; font-weight: 780; letter-spacing: 0; }
      .aci-recommendation-model > strong { display: block; margin-top: 7px; color: #17243b; font-size: 12px; line-height: 1.2; font-weight: 780; letter-spacing: 0; }
      .aci-recommendation-model > strong small { color: #7b8799; font-size: 9px; font-weight: 560; }
      .aci-recommendation-model > p { min-height: 30px; margin: 6px 0 0; color: #68758a; font-size: 10px; line-height: 1.35; font-weight: 540; letter-spacing: 0; }
      .aci-recommendation-model > button { min-height: 31px; margin-top: 4px; display: inline-flex; align-items: center; gap: 6px; padding: 5px 0; border: 0; color: #0758f8; background: transparent; font: inherit; font-size: 10.5px; line-height: 1.2; font-weight: 700; cursor: pointer; }
      .aci-recommendation-model > button svg { width: 18px; height: 18px; padding: 3px; border: 1px solid #d9e1ec; border-radius: 50%; color: #5f6d83; }

      .aci-chat-shell .aci-price-feature-leads,
      .aci-chat-shell .aci-feature-inline-leads {
        margin-top: 9px !important;
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 0 20px !important;
      }
      .aci-chat-shell .aci-price-feature-lead,
      .aci-chat-shell .aci-feature-inline-lead {
        min-height: 34px !important;
        padding: 5px 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        color: #0758f8 !important;
        font-size: 11.5px !important;
        line-height: 1.25 !important;
        font-weight: 680 !important;
      }
      .aci-chat-shell .aci-price-feature-lead-icon,
      .aci-chat-shell .aci-feature-inline-lead-icon { display: none !important; }
      .aci-chat-shell .aci-price-feature-lead-arrow,
      .aci-chat-shell .aci-feature-inline-lead-arrow {
        width: 18px !important;
        height: 18px !important;
        margin-left: 0 !important;
        display: grid !important;
        place-items: center !important;
        border: 1px solid #d9e1ec !important;
        border-radius: 50% !important;
        color: #5f6d83 !important;
        font-size: 14px !important;
      }
      .aci-chat-shell .aci-color-inline-view-all {
        width: auto !important;
        min-height: 34px !important;
        margin-top: 7px !important;
        padding: 5px 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        color: #0758f8 !important;
        font-size: 11.5px !important;
        line-height: 1.25 !important;
        font-weight: 680 !important;
      }
      .aci-chat-shell .aci-color-inline-view-all > span {
        width: 18px !important;
        height: 18px !important;
        display: grid !important;
        place-items: center !important;
        border: 1px solid #d9e1ec !important;
        border-radius: 50% !important;
        color: #5f6d83 !important;
      }

      .aci-v2-inline-card {
        width: min(100%, 650px);
        overflow: hidden;
        border: 1px solid #dbe4f0;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 18px 46px -40px rgba(19, 39, 78, .38);
      }

      .aci-v2-inline-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 13px 14px 11px;
        border-bottom: 1px solid #e8edf4;
        background: #f9fbfe;
      }

      .aci-v2-inline-card-header > span {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border: 1px solid #d7e4f6;
        border-radius: 7px;
        color: #0758f8;
        background: #fff;
      }

      .aci-v2-inline-card-header div { min-width: 0; }
      .aci-v2-inline-card-header small { display: block; margin-bottom: 3px; color: #738096; font-size: 9px; line-height: 1; font-weight: 760; letter-spacing: .08em; text-transform: uppercase; }
      .aci-v2-inline-card h4 { margin: 0; color: #14213a; font-size: 14px; line-height: 1.25; font-weight: 760; letter-spacing: 0; }
      .aci-v2-inline-card-body { padding: 13px 14px 14px; }
      .aci-v2-inline-card-body > p { margin: 0; color: #556277; font-size: 12.5px; line-height: 1.5; letter-spacing: 0; }
      .aci-v2-inline-rows { display: grid; gap: 7px; }
      .aci-v2-inline-row { min-height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border: 1px solid #e2e8f1; border-radius: 7px; color: #2c3950; background: #fff; font-size: 11.5px; line-height: 1.3; font-weight: 650; letter-spacing: 0; }
      button.aci-v2-inline-row { width: 100%; font: inherit; cursor: pointer; text-align: left; }
      button.aci-v2-inline-row:hover,
      button.aci-v2-inline-row:focus-visible { border-color: #9dbcf4; background: #f7faff; outline: none; }
      .aci-v2-inline-row svg { flex: 0 0 auto; color: #0758f8; }
      .aci-v2-inline-note {
        margin-top: 9px !important;
        display: flex;
        align-items: flex-start;
        gap: 7px;
        color: #6e7889 !important;
        font-size: 11px !important;
      }
      .aci-v2-inline-note svg { flex: 0 0 auto; margin-top: 1px; }

      .aci-chat-jump-latest {
        position: fixed;
        left: 50%;
        bottom: calc(88px + env(safe-area-inset-bottom));
        z-index: 219;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 1px solid #d5e0ee;
        border-radius: 999px;
        color: #0758f8;
        background: #fff;
        box-shadow: 0 12px 30px -18px rgba(15, 35, 75, .45);
        cursor: pointer;
      }

      @media (max-width: 720px) {
        .aci-answer-lead { grid-template-columns: minmax(0, 1fr); gap: 0; }
        .aci-answer-lead-icon { width: 29px; height: 29px; }
        .aci-answer-lead h3 { font-size: 17px; }
        .aci-answer-lead-metrics > span { min-width: 88px; padding: 0 9px; }
        .aci-answer-lead-metrics strong { font-size: 11.5px; }
        .aci-answer-lead-metrics small { font-size: 9.5px; }
        .aci-journey-actions-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0; }
        .aci-journey-actions-list button + button { border-top: 1px solid #edf0f5; }
        .aci-compound-grid { grid-template-columns: minmax(0, 1fr); }
        .aci-compound-model { grid-template-columns: 112px minmax(0, 1fr); padding: 12px; }
        .aci-compound-model + .aci-compound-model { border-left: 0; border-top: 1px solid #e5eaf1; }
        .aci-compound-model-visual { height: 102px; }
        .aci-compound-feature-examples { grid-template-columns: minmax(0, 1fr); }
        .aci-recommendation-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }
        .aci-recommendation-model { display: grid; grid-template-columns: 106px minmax(0, 1fr); grid-template-rows: auto auto auto auto; column-gap: 12px; padding: 8px 0; border-bottom: 1px solid #e8edf4; }
        .aci-recommendation-model:last-child { border-bottom: 0; }
        .aci-recommendation-visual { height: 92px; grid-row: 1 / 5; }
        .aci-recommendation-rank { margin-top: 2px; }
        .aci-recommendation-model h4 { margin-top: 4px; }
        .aci-recommendation-model > p { min-height: 0; }
        .aci-chat-message.is-assistant:has(.aci-compound-card) .aci-answer-lead,
        .aci-chat-message.is-assistant:has(.aci-score-inline-card) .aci-answer-lead,
        .aci-chat-message.is-assistant:has(.aci-recommendation-card) .aci-answer-lead { width: calc(100% - 38px); margin-left: 38px; }
      }

      /*
       * CARO vehicle answer system.
       * Designed for the actual chat answer width (up to 650px).
       * The card ends after the comparison content; no duplicated key-highlights section.
       */
      .aci-compound-card,
      .aci-comparison-card,
      .aci-recommendation-card,
      .aci-score-inline-card {
        --aci-vehicle-blue: #0758f8;
        --aci-vehicle-blue-deep: #064bd6;
        --aci-vehicle-navy: #071a4a;
        --aci-vehicle-copy: #516078;
        --aci-vehicle-muted: #7a879b;
        --aci-vehicle-line: #d7e3f4;
        --aci-vehicle-line-strong: #bcd1f4;
        --aci-vehicle-wash: #f5f9ff;
        --aci-vehicle-wash-strong: #eef5ff;
        position: relative;
        width: 100%;
        padding: 0;
        overflow: hidden;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 16px;
        color: var(--aci-vehicle-navy);
        background:
          radial-gradient(circle at 92% 2%, rgba(7, 88, 248, .045), transparent 27%),
          #fff;
        box-shadow: 0 22px 52px -38px rgba(23, 53, 101, .42);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        container-type: inline-size;
        animation: aci-vehicle-answer-enter .38s cubic-bezier(.22, .8, .25, 1) both;
      }

      .aci-compound-card *,
      .aci-comparison-card *,
      .aci-recommendation-card *,
      .aci-score-inline-card * {
        box-sizing: border-box;
        letter-spacing: 0 !important;
      }

      /* Explicitly suppress the old duplicated summary section, if it is still mounted upstream. */
      .aci-key-highlights,
      .aci-comparison-key-highlights,
      .aci-compound-key-highlights,
      [data-aci-section="key-highlights"] {
        display: none !important;
      }

      .aci-vehicle-card-header {
        min-height: 0;
        padding: 18px 19px 13px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 0;
        background: transparent;
      }

      .aci-vehicle-card-header > div:first-child { min-width: 0; }
      .aci-vehicle-card-header span,
      .aci-vehicle-card-header h3,
      .aci-vehicle-card-header p { display: block; margin: 0; }

      .aci-vehicle-card-header > div:first-child > span {
        color: var(--aci-vehicle-blue);
        font-size: 8.5px;
        line-height: 1.2;
        font-weight: 820;
        text-transform: uppercase;
      }

      .aci-vehicle-card-header h3 {
        margin-top: 4px;
        color: var(--aci-vehicle-navy);
        font-size: clamp(18px, 3.1cqw, 21px);
        line-height: 1.12;
        font-weight: 770;
        overflow-wrap: anywhere;
      }

      .aci-vehicle-card-header p {
        max-width: 470px;
        margin-top: 5px;
        color: var(--aci-vehicle-muted);
        font-size: 10.5px;
        line-height: 1.42;
        font-weight: 540;
      }

      .aci-carousel-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }

      .aci-carousel-controls small {
        margin-right: 2px;
        color: var(--aci-vehicle-muted);
        font-size: 9px;
        font-weight: 650;
      }

      .aci-carousel-controls button {
        width: 29px;
        height: 29px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 50%;
        color: #3e4f69;
        background: #fff;
        cursor: pointer;
        transition: color 160ms ease, border-color 160ms ease, background 160ms ease, transform 160ms ease;
      }

      .aci-carousel-controls button:disabled { opacity: .34; cursor: default; }
      .aci-carousel-controls button:not(:disabled):hover,
      .aci-carousel-controls button:not(:disabled):focus-visible {
        color: var(--aci-vehicle-blue);
        border-color: #9fbcf1;
        background: var(--aci-vehicle-wash);
        outline: none;
        transform: translateY(-1px);
      }

      /* Compound and like-for-like comparison */
      .aci-compound-grid,
      .aci-comparison-grid {
        position: relative;
        padding: 0 14px 14px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 13px;
      }

      .aci-compound-grid::before,
      .aci-comparison-grid::before {
        position: absolute;
        top: 18px;
        bottom: 18px;
        left: 50%;
        width: 1px;
        background: linear-gradient(to bottom, transparent, #e1e9f5 18%, #e1e9f5 82%, transparent);
        content: "";
        transform: translateX(-50%);
        pointer-events: none;
      }

      .aci-compound-grid::after,
      .aci-comparison-grid::after {
        position: absolute;
        top: 50%;
        left: 50%;
        z-index: 3;
        width: 29px;
        height: 29px;
        display: grid;
        place-items: center;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 50%;
        color: var(--aci-vehicle-blue);
        background: #fff;
        box-shadow: 0 5px 15px rgba(31, 67, 121, .08);
        content: "VS";
        font-size: 7.5px;
        line-height: 1;
        font-weight: 850;
        transform: translate(-50%, -50%);
        pointer-events: none;
      }

      .aci-vehicle-choice-card {
        min-width: 0;
        min-height: 337px;
        padding: 11px;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        border: 1px solid #e1e9f5;
        border-radius: 13px;
        background: linear-gradient(180deg, #fff 0%, #fff 67%, #fbfdff 100%);
        box-shadow: 0 10px 24px -22px rgba(21, 51, 98, .38);
        animation: aci-vehicle-option-enter .42s cubic-bezier(.22, .8, .25, 1) both;
        animation-delay: calc(var(--aci-item-index, 0) * 70ms + 55ms);
        transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
      }

      .aci-vehicle-choice-card:hover {
        border-color: var(--aci-vehicle-line-strong);
        box-shadow: 0 17px 31px -25px rgba(23, 64, 132, .42);
        transform: translateY(-2px);
      }

      .aci-vehicle-choice-card + .aci-vehicle-choice-card { border-left: 1px solid #e1e9f5; padding-left: 11px; }

      .aci-compound-model-visual,
      .aci-comparison-model-visual {
        position: relative;
        width: 100%;
        height: 134px;
        order: -1;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 10px;
        background:
          radial-gradient(ellipse at 50% 73%, rgba(7, 88, 248, .09), transparent 57%),
          linear-gradient(180deg, #fbfdff, #f5f9ff);
      }

      .aci-compound-model-visual::after,
      .aci-comparison-model-visual::after,
      .aci-recommendation-visual::after {
        position: absolute;
        left: 21%;
        right: 21%;
        bottom: 13px;
        height: 9px;
        border-radius: 50%;
        background: rgba(18, 35, 62, .14);
        filter: blur(7px);
        content: "";
        pointer-events: none;
      }

      .aci-compound-model-visual img,
      .aci-comparison-model-visual img {
        position: relative;
        z-index: 1;
        width: 96%;
        height: 94%;
        object-fit: contain;
        filter: drop-shadow(0 12px 11px rgba(23, 42, 70, .12));
        transform: translateZ(0);
        transition: transform 220ms cubic-bezier(.22, .8, .25, 1), filter 220ms ease;
      }

      .aci-compound-car-fallback {
        position: relative;
        z-index: 1;
        width: 88px;
        height: 58px;
        display: grid;
        place-items: center;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 10px;
        color: var(--aci-vehicle-blue);
        background: #fff;
        font-size: 20px;
        font-weight: 800;
      }

      .aci-compound-model:hover img,
      .aci-comparison-model:hover img,
      .aci-recommendation-model:hover img {
        transform: translateY(-3px) scale(1.018);
        filter: drop-shadow(0 16px 13px rgba(15, 23, 42, .15));
      }

      .aci-compound-model-copy,
      .aci-comparison-model-copy {
        min-width: 0;
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        align-items: stretch;
        padding-top: 11px;
      }

      .aci-vehicle-choice-rank,
      .aci-recommendation-rank {
        display: block;
        min-height: 0;
        padding: 0;
        margin: 0;
        color: var(--aci-vehicle-blue);
        background: transparent;
        font-size: 8.5px;
        line-height: 1.2;
        font-weight: 820;
        text-transform: uppercase;
      }

      .aci-compound-model h4,
      .aci-comparison-model h4,
      .aci-recommendation-model h4 {
        margin: 4px 0 0;
        min-height: 0;
        color: var(--aci-vehicle-navy);
        font-size: 16px;
        line-height: 1.16;
        font-weight: 770;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .aci-compound-facts {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
        margin-top: 11px;
      }

      .aci-compound-facts > span {
        min-width: 0;
        min-height: 53px;
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        grid-template-rows: auto auto;
        column-gap: 5px;
        align-content: center;
        padding: 7px;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 9px;
        background: #fff;
      }

      .aci-compound-facts > span:nth-child(2) {
        border-color: var(--aci-vehicle-line-strong);
        background: var(--aci-vehicle-wash);
      }

      .aci-compound-facts > span:nth-child(3) {
        grid-column: 1 / -1;
        min-height: 40px;
        grid-template-columns: 18px auto minmax(0, 1fr);
        grid-template-rows: auto;
        align-items: center;
      }

      .aci-compound-facts svg {
        grid-column: 1;
        grid-row: 1 / span 2;
        align-self: center;
        color: var(--aci-vehicle-blue);
      }

      .aci-compound-facts > span:nth-child(3) svg { grid-row: 1; }

      .aci-compound-facts b,
      .aci-compound-facts small {
        display: block;
        min-width: 0;
        grid-column: 2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .aci-compound-facts b {
        color: var(--aci-vehicle-blue);
        font-size: 11.5px;
        line-height: 1.12;
        font-weight: 780;
      }

      .aci-compound-facts small {
        margin-top: 2px;
        color: var(--aci-vehicle-muted);
        font-size: 8px;
        line-height: 1.18;
      }

      .aci-compound-facts > span:nth-child(3) small {
        grid-column: 3;
        margin: 0 0 0 2px;
      }

      .aci-compound-model-actions {
        margin-top: auto;
        padding-top: 11px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px 14px;
      }

      .aci-compound-model-actions button,
      .aci-comparison-model-copy > button,
      .aci-recommendation-model > button {
        min-height: 28px;
        display: inline-flex;
        align-items: center;
        align-self: flex-start;
        gap: 6px;
        padding: 0;
        border: 0;
        color: var(--aci-vehicle-blue);
        background: transparent;
        font: inherit;
        font-size: 9.8px;
        line-height: 1.2;
        font-weight: 740;
        cursor: pointer;
        transition: color 160ms ease;
      }

      .aci-compound-model-actions button:hover,
      .aci-compound-model-actions button:focus-visible,
      .aci-comparison-model-copy > button:hover,
      .aci-comparison-model-copy > button:focus-visible,
      .aci-recommendation-model > button:hover,
      .aci-recommendation-model > button:focus-visible {
        color: var(--aci-vehicle-blue-deep);
        outline: none;
      }

      .aci-compound-model-actions button svg:first-child { display: none; }

      .aci-compound-model-actions button svg:last-child,
      .aci-comparison-model-copy > button svg,
      .aci-recommendation-model > button svg,
      .aci-compound-feature-action > svg,
      .aci-comparison-open > svg,
      .aci-score-inline-open > svg {
        width: 18px;
        height: 18px;
        padding: 3px;
        flex: 0 0 auto;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 50%;
        color: var(--aci-vehicle-blue);
        background: #fff;
        transition: border-color 160ms ease, transform 160ms ease;
      }

      .aci-compound-model-actions button:hover svg:last-child,
      .aci-comparison-model-copy > button:hover svg,
      .aci-recommendation-model > button:hover svg,
      .aci-compound-feature-action:hover > svg,
      .aci-comparison-open:hover > svg,
      .aci-score-inline-open:hover > svg {
        border-color: #9fbcf1;
        transform: translateX(2px);
      }

      .aci-compound-feature-examples {
        margin: 0 14px 8px;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        border-top: 0;
        background: transparent;
        animation: aci-feature-drawer-enter .25s ease-out both;
      }

      .aci-compound-feature-examples > div {
        min-width: 0;
        padding: 9px 10px;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 9px;
        background: var(--aci-vehicle-wash);
      }

      .aci-compound-feature-examples strong,
      .aci-compound-feature-examples span { display: block; }
      .aci-compound-feature-examples strong { color: var(--aci-vehicle-navy); font-size: 9.5px; line-height: 1.2; }
      .aci-compound-feature-examples span { margin-top: 3px; color: var(--aci-vehicle-copy); font-size: 8.8px; line-height: 1.35; }

      .aci-compound-feature-action {
        width: calc(100% - 28px);
        min-height: 42px;
        margin: 0 14px 14px;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 10px;
        color: var(--aci-vehicle-blue);
        background: linear-gradient(90deg, #f9fbff, #f4f8ff);
        font: inherit;
        font-size: 9.8px;
        font-weight: 740;
        text-align: left;
        cursor: pointer;
        transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
      }

      .aci-compound-feature-action:hover,
      .aci-compound-feature-action:focus-visible {
        border-color: var(--aci-vehicle-line-strong);
        background: var(--aci-vehicle-wash-strong);
        outline: none;
        transform: translateY(-1px);
      }

      .aci-compound-feature-action span {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .aci-compound-feature-action span svg { color: var(--aci-vehicle-blue); flex: 0 0 auto; }

      /* Variant comparison-specific content */
      .aci-comparison-variant {
        min-height: 14px;
        margin: 4px 0 0;
        color: var(--aci-vehicle-muted);
        font-size: 9px;
        line-height: 1.35;
      }

      .aci-comparison-facts {
        min-height: 60px;
        margin-top: 11px;
        padding: 9px 10px;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 9px;
        background: var(--aci-vehicle-wash);
      }

      .aci-comparison-facts strong,
      .aci-comparison-facts span { display: block; }
      .aci-comparison-facts strong { color: var(--aci-vehicle-blue); font-size: 15px; line-height: 1.12; }
      .aci-comparison-facts strong small { display: block; margin-top: 3px; color: var(--aci-vehicle-muted); font-size: 8.5px; font-weight: 600; }
      .aci-comparison-facts span { margin-top: 6px; color: var(--aci-vehicle-copy); font-size: 9px; line-height: 1.25; }
      .aci-comparison-model-copy > button { margin-top: auto; padding-top: 11px; }

      .aci-comparison-open {
        width: calc(100% - 28px);
        min-height: 37px;
        margin: -2px 14px 12px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 7px;
        border: 0;
        border-top: 1px solid #e6edf6;
        color: var(--aci-vehicle-blue);
        background: transparent;
        font: inherit;
        font-size: 9.8px;
        font-weight: 740;
        cursor: pointer;
      }

      /* Recommendation carousel: two strong cards at laptop width, one at mobile width. */
      .aci-recommendation-grid {
        padding: 3px 0 16px 14px;
        display: flex;
        align-items: stretch;
        gap: 11px;
        overflow-x: auto;
        scroll-padding-inline-start: 14px;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        overscroll-behavior-inline: contain;
        -webkit-overflow-scrolling: touch;
      }

      .aci-recommendation-grid::-webkit-scrollbar { display: none; }

      .aci-recommendation-model {
        flex: 0 0 calc((100% - 25px) / 2.15);
        width: calc((100% - 25px) / 2.15);
        min-height: 292px;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        padding: 10px;
        border: 1px solid #e1e9f5;
        border-radius: 13px;
        background: #fff;
        scroll-snap-align: start;
        animation: aci-vehicle-option-enter .42s cubic-bezier(.22, .8, .25, 1) both;
        animation-delay: calc(var(--aci-item-index, 0) * 55ms + 45ms);
        transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
      }

      .aci-recommendation-model + .aci-recommendation-model { padding-left: 10px; border-left: 1px solid #e1e9f5; }

      .aci-recommendation-model:hover {
        border-color: var(--aci-vehicle-line-strong);
        box-shadow: 0 17px 30px -26px rgba(23, 64, 132, .42);
        transform: translateY(-2px);
      }

      .aci-recommendation-visual {
        position: relative;
        width: 100%;
        height: 127px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 10px;
        color: #91a0b5;
        background:
          radial-gradient(ellipse at 50% 74%, rgba(7, 88, 248, .08), transparent 57%),
          linear-gradient(180deg, #fbfdff, #f5f9ff);
      }

      .aci-recommendation-model.is-leading .aci-recommendation-visual {
        background:
          radial-gradient(ellipse at 50% 74%, rgba(7, 88, 248, .12), transparent 57%),
          linear-gradient(180deg, #f9fcff, #eff5ff);
        box-shadow: inset 0 0 0 1px var(--aci-vehicle-line-strong);
      }

      .aci-recommendation-visual img {
        position: relative;
        z-index: 1;
        width: 97%;
        height: 94%;
        object-fit: contain;
        filter: drop-shadow(0 12px 10px rgba(15, 23, 42, .12));
        transition: transform 220ms cubic-bezier(.22, .8, .25, 1), filter 220ms ease;
      }

      .aci-recommendation-rank { margin-top: 10px; }
      .aci-recommendation-model h4 { font-size: 14.5px; }
      .aci-recommendation-model > strong { min-height: 31px; margin-top: 9px; color: var(--aci-vehicle-blue); font-size: 13.5px; line-height: 1.12; }
      .aci-recommendation-model > strong small { display: block; margin-top: 3px; color: var(--aci-vehicle-muted); font-size: 8px; font-weight: 600; }
      .aci-recommendation-model > p {
        min-height: 29px;
        margin: 5px 0 7px;
        color: var(--aci-vehicle-copy);
        font-size: 9px;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .aci-recommendation-model > button { margin-top: auto; }

      /* Value shortlist remains a separate compact answer type, not a duplicated key-highlights block. */
      .aci-score-inline-card {
        color: var(--aci-vehicle-navy);
        background: #fff;
      }

      .aci-score-inline-card > header {
        padding: 16px 18px 8px;
        display: flex;
        align-items: center;
        gap: 9px;
        border-bottom: 0;
        background: transparent;
      }

      .aci-score-inline-card > header > span {
        width: 31px;
        height: 31px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 50%;
        color: var(--aci-vehicle-blue);
        background: var(--aci-vehicle-wash);
      }

      .aci-score-inline-card header small { display: block; color: var(--aci-vehicle-blue); font-size: 8.5px; line-height: 1; font-weight: 780; }
      .aci-score-inline-card h4 { margin: 4px 0 0; color: var(--aci-vehicle-navy); font-size: 15px; line-height: 1.15; font-weight: 760; }
      .aci-score-inline-list { display: grid; gap: 6px; padding: 8px 14px 10px; }

      .aci-score-inline-list article {
        min-height: 54px;
        padding: 7px 9px;
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr) auto;
        align-items: center;
        gap: 9px;
        border: 1px solid var(--aci-vehicle-line);
        border-radius: 10px;
        background: #fff;
        animation: aci-vehicle-option-enter .36s ease-out both;
        animation-delay: calc(var(--aci-item-index, 0) * 45ms + 40ms);
      }

      .aci-score-inline-list article:first-child { border-color: var(--aci-vehicle-line-strong); background: var(--aci-vehicle-wash); }
      .aci-score-inline-list article > b { width: 22px; height: 22px; display: grid; place-items: center; border: 1px solid var(--aci-vehicle-line); border-radius: 50%; color: var(--aci-vehicle-blue); background: #fff; font-size: 9px; }
      .aci-score-inline-list article:first-child > b { color: #fff; border-color: var(--aci-vehicle-blue); background: var(--aci-vehicle-blue); }
      .aci-score-inline-list article > span { min-width: 0; }
      .aci-score-inline-list strong,
      .aci-score-inline-list small { display: block; }
      .aci-score-inline-list strong { color: #26354e; font-size: 10.8px; line-height: 1.2; font-weight: 720; }
      .aci-score-inline-list span small { margin-top: 3px; color: var(--aci-vehicle-muted); font-size: 8.8px; line-height: 1.25; }
      .aci-score-inline-list em { color: var(--aci-vehicle-blue); font-size: 10.5px; line-height: 1.15; font-style: normal; font-weight: 760; text-align: right; }
      .aci-score-inline-list em small { margin-top: 3px; color: var(--aci-vehicle-muted); font-size: 8px; }

      .aci-score-inline-open {
        width: auto;
        min-height: 31px;
        margin: 0 14px 12px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 7px;
        border: 0;
        color: var(--aci-vehicle-blue);
        background: transparent;
        font: inherit;
        font-size: 9.8px;
        font-weight: 740;
        cursor: pointer;
      }

      .aci-journey-actions.is-compact {
        width: min(100%, 760px);
        margin-top: 6px;
        padding-top: 0;
        border-top: 0;
      }
      .aci-journey-actions.is-compact .aci-journey-actions-list { margin-top: 0; }

      @keyframes aci-vehicle-answer-enter {
        from { opacity: 0; transform: translateY(7px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes aci-vehicle-option-enter {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes aci-feature-drawer-enter {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Container-aware mobile treatment: works in the narrow chat column as well as on phones. */
      @container (max-width: 520px) {
        .aci-vehicle-card-header { padding: 15px 14px 10px; }
        .aci-vehicle-card-header h3 { font-size: 18px; }
        .aci-vehicle-card-header p { font-size: 9.5px; }
        .aci-carousel-controls small { display: none; }

        .aci-compound-grid,
        .aci-comparison-grid {
          padding: 0 10px 11px;
          grid-template-columns: minmax(0, 1fr);
          gap: 35px;
        }

        .aci-compound-grid::before,
        .aci-comparison-grid::before {
          top: 50%;
          bottom: auto;
          left: 20px;
          right: 20px;
          width: auto;
          height: 1px;
          background: linear-gradient(to right, transparent, #e1e9f5 16%, #e1e9f5 84%, transparent);
          transform: translateY(-50%);
        }

        .aci-vehicle-choice-card {
          min-height: 0;
          padding: 11px;
        }

        .aci-vehicle-choice-card + .aci-vehicle-choice-card { padding-left: 11px; border-left: 1px solid #e1e9f5; }
        .aci-compound-model-visual,
        .aci-comparison-model-visual { height: 164px; }
        .aci-compound-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .aci-compound-feature-examples { grid-template-columns: minmax(0, 1fr); margin-inline: 10px; }
        .aci-compound-feature-action { width: calc(100% - 20px); margin-inline: 10px; }
        .aci-comparison-open { width: calc(100% - 20px); margin-inline: 10px; }

        .aci-recommendation-grid { gap: 10px; padding: 3px 0 13px 10px; scroll-padding-inline-start: 10px; }
        .aci-recommendation-model {
          flex-basis: calc(100% - 28px);
          width: calc(100% - 28px);
          min-height: 294px;
        }
        .aci-recommendation-model + .aci-recommendation-model { padding-left: 10px; }
        .aci-recommendation-visual { height: 150px; }
        .aci-score-inline-list { padding-inline: 10px; }
        .aci-score-inline-open { margin-inline: 10px; }
      }

      @media (max-width: 720px) {
        .aci-vehicle-card-header { padding: 15px 14px 10px; }
        .aci-journey-actions.is-compact .aci-journey-actions-list { display: flex; flex-wrap: wrap; gap: 0 18px; }
        .aci-journey-actions.is-compact .aci-journey-actions-list button + button { border-top: 0; }
      }

      @media (hover: none) {
        .aci-vehicle-choice-card:hover,
        .aci-recommendation-model:hover,
        .aci-compound-feature-action:hover { transform: none; box-shadow: none; }
        .aci-compound-model:hover img,
        .aci-comparison-model:hover img,
        .aci-recommendation-model:hover img { transform: none; }
      }



      /*
       * CARO comparison — selected blue concept.
       * Both vehicles intentionally use the same blue visual language.
       */
      .aci-comparison-card {
        --aci-compare-blue: #0758f8;
        --aci-compare-blue-deep: #0348d8;
        --aci-compare-navy: #071a4a;
        --aci-compare-copy: #53627c;
        --aci-compare-muted: #8591a6;
        --aci-compare-line: #d5e2f5;
        --aci-compare-line-strong: #b7cef4;
        position: relative;
        width: 100%;
        overflow: visible;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        isolation: isolate;
      }

      .aci-comparison-card::before {
        position: absolute;
        top: 45px;
        right: -34px;
        bottom: -28px;
        left: -34px;
        z-index: -2;
        border-radius: 44px;
        background:
          radial-gradient(circle at 17% 37%, rgba(7, 88, 248, .085), transparent 29%),
          radial-gradient(circle at 83% 37%, rgba(7, 88, 248, .07), transparent 30%),
          linear-gradient(180deg, rgba(248, 251, 255, .92), rgba(255, 255, 255, 0));
        content: "";
        pointer-events: none;
      }

      .aci-comparison-header {
        min-height: 0;
        padding: 0 0 15px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
        border: 0;
        background: transparent;
      }

      .aci-comparison-header > div:first-child {
        min-width: 0;
      }

      .aci-comparison-header > div:first-child > span {
        display: block;
        margin: 0 0 6px;
        color: var(--aci-compare-blue);
        font-size: 9px;
        line-height: 1;
        font-weight: 840;
        letter-spacing: .09em !important;
        text-transform: uppercase;
      }

      .aci-comparison-header h3 {
        margin: 0;
        color: var(--aci-compare-navy);
        font-size: clamp(21px, 3.55cqw, 25px);
        line-height: 1.08;
        font-weight: 790;
        letter-spacing: -.028em !important;
        overflow-wrap: anywhere;
      }

      .aci-comparison-header p {
        max-width: 450px;
        margin: 6px 0 0;
        color: var(--aci-compare-copy);
        font-size: 10.5px;
        line-height: 1.42;
        font-weight: 540;
      }

      .aci-comparison-header .aci-comparison-open {
        width: auto;
        min-height: 36px;
        margin: 0;
        padding: 0 4px 0 13px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        flex: 0 0 auto;
        border: 1px solid var(--aci-compare-line);
        border-radius: 999px;
        color: var(--aci-compare-blue);
        background: rgba(255, 255, 255, .96);
        box-shadow:
          0 12px 26px -21px rgba(21, 55, 112, .55),
          inset 0 1px 0 rgba(255, 255, 255, .96);
        font: inherit;
        font-size: 9.8px;
        line-height: 1;
        font-weight: 770;
        cursor: pointer;
        transition:
          border-color 170ms ease,
          color 170ms ease,
          background 170ms ease,
          box-shadow 170ms ease,
          transform 170ms ease;
      }

      .aci-comparison-header .aci-comparison-open > svg {
        width: 27px;
        height: 27px;
        padding: 6px;
        border: 0;
        border-radius: 50%;
        color: #fff;
        background: linear-gradient(135deg, var(--aci-compare-blue-deep), var(--aci-compare-blue));
        box-shadow: 0 8px 17px -9px rgba(7, 88, 248, .78);
        transition: transform 170ms ease;
      }

      .aci-comparison-header .aci-comparison-open:hover,
      .aci-comparison-header .aci-comparison-open:focus-visible {
        color: var(--aci-compare-blue-deep);
        border-color: var(--aci-compare-line-strong);
        background: #f8fbff;
        box-shadow: 0 15px 28px -21px rgba(7, 88, 248, .5);
        outline: none;
        transform: translateY(-1px);
      }

      .aci-comparison-header .aci-comparison-open:hover > svg {
        transform: translateX(2px);
      }

      .aci-comparison-stage {
        position: relative;
        isolation: isolate;
      }

      .aci-comparison-stage::before {
        position: absolute;
        top: 17%;
        right: 8%;
        bottom: 5%;
        left: 8%;
        z-index: -1;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(46, 94, 211, .08), transparent 67%);
        filter: blur(17px);
        content: "";
        pointer-events: none;
      }

      .aci-comparison-grid {
        position: relative;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 58px;
      }

      .aci-comparison-grid::before,
      .aci-comparison-grid::after {
        display: none !important;
        content: none !important;
      }

      .aci-comparison-model.aci-vehicle-choice-card,
      .aci-comparison-model.aci-vehicle-choice-card + .aci-vehicle-choice-card {
        position: relative;
        min-width: 0;
        min-height: 0;
        padding: 12px;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        overflow: hidden;
        border: 1px solid rgba(151, 182, 233, .6);
        border-radius: 22px;
        background:
          radial-gradient(circle at 88% 2%, rgba(7, 88, 248, .08), transparent 31%),
          linear-gradient(180deg, rgba(255, 255, 255, .995), rgba(250, 252, 255, .985));
        box-shadow:
          0 25px 51px -39px rgba(18, 47, 96, .52),
          inset 0 1px 0 rgba(255, 255, 255, .99);
        animation: aci-blue-comparison-enter .48s cubic-bezier(.2, .82, .25, 1) both;
        animation-delay: calc(var(--aci-item-index, 0) * 90ms + 40ms);
        transition:
          border-color 190ms ease,
          box-shadow 190ms ease,
          transform 190ms ease;
      }

      .aci-comparison-model.aci-vehicle-choice-card::before {
        position: absolute;
        inset: 0;
        z-index: 0;
        border-radius: inherit;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, .52), transparent 34%),
          linear-gradient(315deg, rgba(7, 88, 248, .052), transparent 37%);
        content: "";
        pointer-events: none;
      }

      .aci-comparison-model.aci-vehicle-choice-card > * {
        position: relative;
        z-index: 1;
      }

      .aci-comparison-model.aci-vehicle-choice-card:hover {
        border-color: rgba(7, 88, 248, .34);
        box-shadow:
          0 31px 59px -38px rgba(7, 88, 248, .29),
          inset 0 1px 0 rgba(255, 255, 255, 1);
        transform: translateY(-4px);
      }

      .aci-comparison-number {
        position: absolute !important;
        top: 16px;
        left: 16px;
        z-index: 5 !important;
        width: 35px;
        height: 35px;
        display: grid;
        place-items: center;
        border: 3px solid rgba(255, 255, 255, .96);
        border-radius: 50%;
        color: #fff;
        background: linear-gradient(135deg, var(--aci-compare-blue-deep), var(--aci-compare-blue));
        box-shadow:
          0 8px 20px -8px rgba(7, 88, 248, .78),
          0 0 0 1px rgba(7, 88, 248, .12);
        font-size: 13px;
        line-height: 1;
        font-weight: 860;
        animation: aci-blue-number-enter .42s cubic-bezier(.2, .82, .25, 1) both;
        animation-delay: calc(var(--aci-item-index, 0) * 90ms + 180ms);
      }

      .aci-comparison-model-visual {
        position: relative;
        width: 100%;
        height: 213px;
        order: -1;
        display: grid;
        align-items: end;
        justify-items: center;
        overflow: hidden;
        padding: 19px 12px 5px;
        border-radius: 16px;
        background:
          radial-gradient(ellipse at 50% 78%, rgba(7, 88, 248, .105), transparent 58%),
          linear-gradient(180deg, rgba(252, 254, 255, .94), rgba(243, 248, 255, .97));
        isolation: isolate;
      }

      .aci-comparison-model-visual::before {
        position: absolute;
        inset: 0;
        z-index: 0;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, .72), transparent 35%),
          linear-gradient(90deg, transparent, rgba(255, 255, 255, .38), transparent);
        content: "";
        pointer-events: none;
      }

      .aci-comparison-model-visual::after {
        position: absolute;
        left: 18%;
        right: 18%;
        bottom: 12px;
        height: 11px;
        border-radius: 50%;
        background: rgba(16, 35, 65, .15);
        filter: blur(8px);
        content: "";
        pointer-events: none;
      }

      .aci-comparison-floor {
        position: absolute !important;
        right: 13%;
        bottom: 8px;
        left: 13%;
        z-index: 0 !important;
        height: 49px;
        border: 1px solid rgba(7, 88, 248, .16);
        border-radius: 50%;
        background: radial-gradient(ellipse, rgba(7, 88, 248, .105), transparent 67%);
        transform: perspective(130px) rotateX(65deg);
        pointer-events: none;
      }

      .aci-comparison-model-visual img {
        position: relative;
        z-index: 2;
        display: block;
        width: 94% !important;
        height: 94% !important;
        max-width: 94% !important;
        max-height: 94% !important;
        object-fit: contain !important;
        object-position: center bottom !important;
        transform: none !important;
        filter: drop-shadow(0 17px 15px rgba(18, 37, 67, .16));
        user-select: none;
        will-change: transform, filter;
        transition:
          transform 225ms cubic-bezier(.2, .82, .25, 1),
          filter 225ms ease;
      }

      .aci-comparison-model:hover .aci-comparison-model-visual img {
        transform: translateY(-3px) !important;
        filter: drop-shadow(0 21px 18px rgba(18, 37, 67, .19));
      }

      .aci-comparison-model-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        padding: 14px 3px 2px;
      }

      .aci-comparison-identity-row {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: 12px;
      }

      .aci-comparison-identity {
        min-width: 0;
      }

      .aci-comparison-identity small {
        display: block;
        margin: 0 0 2px;
        color: var(--aci-compare-muted);
        font-size: 9.5px;
        line-height: 1.1;
        font-weight: 680;
      }

      .aci-comparison-model .aci-comparison-identity h4 {
        margin: 0;
        min-height: 0;
        display: block;
        overflow: hidden;
        color: var(--aci-compare-navy);
        font-size: 22px;
        line-height: 1.02;
        font-weight: 800;
        letter-spacing: -.035em !important;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .aci-comparison-price {
        min-width: 90px;
        text-align: right;
      }

      .aci-comparison-price strong,
      .aci-comparison-price small {
        display: block;
      }

      .aci-comparison-price strong {
        color: var(--aci-compare-blue);
        font-size: 18px;
        line-height: 1;
        font-weight: 840;
        letter-spacing: -.025em !important;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .aci-comparison-price small {
        margin-top: 4px;
        color: var(--aci-compare-muted);
        font-size: 8.5px;
        line-height: 1;
        font-weight: 620;
        text-transform: lowercase;
        white-space: nowrap;
      }

      .aci-comparison-specs {
        min-width: 0;
        margin-top: 14px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 7px;
      }

      .aci-comparison-specs > span {
        min-width: 0;
        min-height: 35px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 8px;
        border: 1px solid rgba(7, 88, 248, .15);
        border-radius: 999px;
        color: #243451;
        background: rgba(255, 255, 255, .8);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .94);
      }

      .aci-comparison-specs svg {
        flex: 0 0 auto;
        color: var(--aci-compare-blue);
      }

      .aci-comparison-specs b {
        min-width: 0;
        overflow: hidden;
        color: #273652;
        font-size: 9px;
        line-height: 1.1;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .aci-comparison-model-copy > button {
        width: 100%;
        min-height: 43px;
        margin-top: 13px;
        padding: 0 7px 0 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border: 1px solid rgba(7, 88, 248, .15);
        border-radius: 13px;
        color: var(--aci-compare-blue);
        background: linear-gradient(90deg, rgba(7, 88, 248, .065), rgba(255, 255, 255, .95));
        font: inherit;
        font-size: 10.5px;
        line-height: 1;
        font-weight: 770;
        cursor: pointer;
        transition:
          border-color 170ms ease,
          box-shadow 170ms ease,
          transform 170ms ease;
      }

      .aci-comparison-model-copy > button svg {
        width: 29px;
        height: 29px;
        padding: 7px;
        flex: 0 0 auto;
        border: 0;
        border-radius: 50%;
        color: #fff;
        background: linear-gradient(135deg, var(--aci-compare-blue-deep), var(--aci-compare-blue));
        box-shadow: 0 8px 17px -9px rgba(7, 88, 248, .76);
        transition: transform 170ms ease;
      }

      .aci-comparison-model-copy > button:hover,
      .aci-comparison-model-copy > button:focus-visible {
        border-color: rgba(7, 88, 248, .32);
        box-shadow: 0 11px 24px -20px rgba(7, 88, 248, .48);
        outline: none;
        transform: translateY(-1px);
      }

      .aci-comparison-model-copy > button:hover svg {
        transform: translateX(2px);
      }

      .aci-comparison-vs {
        position: absolute;
        top: 43%;
        left: 50%;
        z-index: 8;
        width: 66px;
        height: 66px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(104, 145, 220, .3);
        border-radius: 50%;
        background: #fff;
        box-shadow:
          0 0 0 11px rgba(255, 255, 255, .7),
          0 16px 36px -18px rgba(7, 88, 248, .48);
        transform: translate(-50%, -50%);
        animation: aci-blue-vs-enter .46s cubic-bezier(.2, .82, .25, 1) .18s both;
        pointer-events: none;
      }

      .aci-comparison-vs::before {
        position: absolute;
        inset: 7px;
        border: 1px solid var(--aci-compare-blue);
        border-radius: 50%;
        background: linear-gradient(180deg, #fff, #f7faff);
        box-shadow:
          inset 0 0 0 4px rgba(7, 88, 248, .045),
          0 0 18px rgba(7, 88, 248, .1);
        content: "";
      }

      .aci-comparison-vs span {
        position: relative;
        z-index: 1;
        color: var(--aci-compare-navy);
        font-size: 13px;
        line-height: 1;
        font-weight: 870;
        letter-spacing: -.02em !important;
      }

      @keyframes aci-blue-comparison-enter {
        from {
          opacity: 0;
          transform: translateY(13px) scale(.985);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes aci-blue-number-enter {
        from {
          opacity: 0;
          transform: translateY(-8px) scale(.75);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes aci-blue-vs-enter {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(.7);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      @container (max-width: 560px) {
        .aci-comparison-card {
          overflow: hidden;
        }

        .aci-comparison-card::before {
          right: -70px;
          left: -70px;
        }

        .aci-comparison-header {
          padding: 0 2px 13px;
          align-items: flex-start;
        }

        .aci-comparison-header h3 {
          font-size: 20px;
        }

        .aci-comparison-header p {
          max-width: 310px;
          font-size: 9.6px;
        }

        .aci-comparison-header .aci-comparison-open {
          min-height: 33px;
          padding-left: 10px;
          font-size: 9px;
        }

        .aci-comparison-header .aci-comparison-open > svg {
          width: 25px;
          height: 25px;
        }

        .aci-comparison-grid {
          display: flex;
          grid-template-columns: none;
          gap: 12px;
          overflow-x: auto;
          padding: 0 0 10px 1px;
          scroll-padding-inline-start: 1px;
          scroll-snap-type: x mandatory;
          overscroll-behavior-inline: contain;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .aci-comparison-grid::-webkit-scrollbar {
          display: none;
        }

        .aci-comparison-model.aci-vehicle-choice-card,
        .aci-comparison-model.aci-vehicle-choice-card + .aci-vehicle-choice-card {
          flex: 0 0 calc(100% - 34px);
          width: calc(100% - 34px);
          padding: 11px;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .aci-comparison-model-visual {
          height: 201px;
        }

        .aci-comparison-vs {
          display: none;
        }
      }

      @container (max-width: 390px) {
        .aci-comparison-header {
          gap: 8px;
        }

        .aci-comparison-header .aci-comparison-open span {
          display: none;
        }

        .aci-comparison-header .aci-comparison-open {
          width: 33px;
          padding: 3px;
        }

        .aci-comparison-model.aci-vehicle-choice-card,
        .aci-comparison-model.aci-vehicle-choice-card + .aci-vehicle-choice-card {
          flex-basis: calc(100% - 23px);
          width: calc(100% - 23px);
          border-radius: 19px;
        }

        .aci-comparison-model-visual {
          height: 179px;
        }

        .aci-comparison-model .aci-comparison-identity h4 {
          font-size: 20px;
          min-height: 40.8px;
          display: -webkit-box;
          white-space: normal;
          overflow: hidden;
          overflow-wrap: anywhere;
          text-overflow: clip;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .aci-comparison-price strong {
          font-size: 16.5px;
        }

        .aci-comparison-specs {
          gap: 5px;
        }

        .aci-comparison-specs > span {
          padding-inline: 6px;
        }

        .aci-comparison-specs b {
          font-size: 8.4px;
        }
      }

      @media (hover: none) {
        .aci-comparison-model.aci-vehicle-choice-card:hover {
          border-color: rgba(151, 182, 233, .6);
          box-shadow:
            0 25px 51px -39px rgba(18, 47, 96, .52),
            inset 0 1px 0 rgba(255, 255, 255, .99);
          transform: none;
        }

        .aci-comparison-model:hover .aci-comparison-model-visual img {
          transform: none !important;
          filter: drop-shadow(0 17px 15px rgba(18, 37, 67, .16));
        }

        .aci-comparison-header .aci-comparison-open:hover,
        .aci-comparison-model-copy > button:hover {
          transform: none;
        }
      }

      /* Reference comparison layout */
      .aci-reference-comparison-card {
        --aci-reference-blue: #075cf5;
        --aci-reference-blue-deep: #034bd8;
        --aci-reference-navy: #07194b;
        --aci-reference-copy: #536486;
        --aci-reference-muted: #7787a5;
        --aci-reference-line: #c9dcfb;
        position: relative;
        left: 0;
        width: 100%;
        margin-left: 0;
        overflow: visible;
        color: var(--aci-reference-navy);
        translate: none;
      }

      .aci-reference-comparison-card::before {
        display: none;
      }

      .aci-reference-comparison-header {
        padding: 2px 0 16px;
        display: block;
      }

      .aci-reference-comparison-header > div {
        min-width: 0;
      }

      .aci-reference-comparison-header > div > span {
        margin-bottom: 9px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--aci-reference-blue);
        font-size: 11px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: 0 !important;
        text-transform: uppercase;
      }

      .aci-reference-comparison-header h3 {
        margin: 0;
        color: var(--aci-reference-navy);
        font-size: 27px;
        line-height: 1.08;
        font-weight: 800;
        letter-spacing: 0 !important;
        overflow-wrap: anywhere;
      }

      .aci-reference-comparison-header p {
        margin: 7px 0 0;
        color: var(--aci-reference-copy);
        font-size: 13px;
        line-height: 1.4;
        font-weight: 500;
        letter-spacing: 0 !important;
      }

      .aci-reference-comparison-open {
        min-height: 48px;
        padding: 4px 5px 4px 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        flex: 0 0 auto;
        border: 1px solid var(--aci-reference-line);
        border-radius: 999px;
        color: var(--aci-reference-blue);
        background: rgba(255, 255, 255, .94);
        box-shadow: 0 13px 28px -24px rgba(7, 65, 171, .55);
        font: inherit;
        font-size: 13px;
        line-height: 1;
        font-weight: 750;
        cursor: pointer;
        transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
      }

      .aci-reference-comparison-open svg {
        width: 37px;
        height: 37px;
        padding: 10px;
        border-radius: 50%;
        color: #fff;
        background: linear-gradient(135deg, var(--aci-reference-blue-deep), var(--aci-reference-blue));
        box-shadow: 0 10px 20px -12px rgba(7, 92, 245, .9);
      }

      .aci-reference-comparison-open:hover,
      .aci-reference-comparison-open:focus-visible {
        border-color: #9fc0f7;
        background: #f8fbff;
        box-shadow: 0 16px 30px -23px rgba(7, 65, 171, .65);
        outline: 2px solid transparent;
      }

      .aci-reference-comparison-stage {
        position: relative;
      }

      .aci-reference-comparison-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .aci-reference-comparison-model {
        position: relative;
        min-width: 0;
        min-height: 406px;
        padding: 17px 14px 13px;
        display: grid;
        grid-template-rows: auto minmax(188px, 1fr) auto;
        overflow: hidden;
        border: 1px solid var(--aci-reference-line);
        border-radius: 15px;
        background:
          radial-gradient(circle at 88% 4%, rgba(7, 92, 245, .055), transparent 30%),
          linear-gradient(180deg, rgba(255, 255, 255, .99), rgba(248, 251, 255, .99));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1);
        animation: aci-blue-comparison-enter .46s cubic-bezier(.2, .82, .25, 1) both;
        animation-delay: calc(var(--aci-item-index, 0) * 90ms + 30ms);
        transition: border-color 180ms ease, box-shadow 180ms ease;
      }

      .aci-reference-comparison-model:hover {
        border-color: #a8c7f8;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1);
      }

      .aci-reference-comparison-rank {
        position: absolute;
        top: 14px;
        right: 14px;
        z-index: 5;
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        border: 1px solid #b9d1f7;
        border-radius: 50%;
        color: var(--aci-reference-blue);
        background: #f4f8ff;
        font-size: 11px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: 0 !important;
      }

      .aci-reference-model-heading {
        min-width: 0;
        padding-left: 0;
      }

      .aci-reference-model-identity small {
        display: flex;
        align-items: center;
        color: var(--aci-reference-blue);
        font-size: 10px;
        line-height: 1.2;
        font-weight: 800;
        letter-spacing: 0 !important;
        text-transform: uppercase;
      }

      .aci-reference-model-identity small svg {
        color: #17264a;
      }

      .aci-reference-model-identity h4 {
        margin: 3px 0 0;
        color: var(--aci-reference-navy);
        font-size: 29px;
        line-height: 1;
        font-weight: 820;
        letter-spacing: 0 !important;
        overflow-wrap: anywhere;
      }

      .aci-reference-model-specs {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .aci-reference-model-specs > span {
        max-width: 100%;
        min-height: 31px;
        padding: 4px 8px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 1px solid #cbdcf6;
        border-radius: 7px;
        color: #34425e;
        background: linear-gradient(180deg, #fff, #f7faff);
      }

      .aci-reference-model-specs small {
        color: #7887a1;
        font-size: 8px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0 !important;
        text-transform: uppercase;
      }

      .aci-reference-model-specs svg {
        flex: 0 0 auto;
        color: var(--aci-reference-blue);
      }

      .aci-reference-model-specs b {
        min-width: 0;
        overflow: hidden;
        color: #10285d;
        font-size: 10px;
        line-height: 1.1;
        font-weight: 750;
        letter-spacing: 0 !important;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .aci-reference-model-visual {
        position: relative;
        min-width: 0;
        height: 205px;
        display: grid;
        place-items: center;
        isolation: isolate;
      }

      .aci-reference-model-visual img {
        position: relative;
        z-index: 2;
        width: auto !important;
        height: 84% !important;
        max-width: 96% !important;
        max-height: 84% !important;
        object-fit: contain !important;
        object-position: center center !important;
        filter: drop-shadow(0 20px 15px rgba(17, 39, 77, .18));
        transition: filter 200ms ease;
      }

      .aci-reference-comparison-model:hover .aci-reference-model-visual img {
        filter: drop-shadow(0 23px 18px rgba(17, 39, 77, .21));
      }

      .aci-reference-model-floor {
        position: absolute;
        right: 4%;
        bottom: 15px;
        left: 4%;
        z-index: 0;
        height: 30px;
        border: 1px solid rgba(123, 165, 231, .22);
        border-radius: 50%;
        background: radial-gradient(ellipse, rgba(99, 150, 230, .13), transparent 68%);
        transform: perspective(130px) rotateX(66deg);
      }

      .aci-reference-model-footer {
        min-width: 0;
        min-height: 70px;
        padding: 9px 8px 9px 10px;
        display: grid;
        grid-template-columns: 92px minmax(0, 1fr) auto;
        align-items: stretch;
        gap: 8px;
        border: 1px solid #d7e4f8;
        border-radius: 14px;
        background: linear-gradient(90deg, rgba(241, 247, 255, .96), rgba(250, 252, 255, .96));
      }

      .aci-reference-starting-price,
      .aci-reference-top-variant {
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .aci-reference-starting-price {
        padding-right: 8px;
        border-right: 1px solid #d8e4f6;
      }

      .aci-reference-model-footer small,
      .aci-reference-model-footer span,
      .aci-reference-model-footer strong {
        display: block;
        min-width: 0;
        letter-spacing: 0 !important;
      }

      .aci-reference-model-footer small {
        color: #55709c;
        font-size: 10px;
        line-height: 1.1;
        font-weight: 600;
      }

      .aci-reference-starting-price strong {
        margin-top: 4px;
        color: var(--aci-reference-blue);
        font-size: 18px;
        line-height: 1;
        font-weight: 840;
        white-space: nowrap;
      }

      .aci-reference-model-footer span {
        margin-top: 4px;
        overflow: hidden;
        color: #5d6f90;
        font-size: 9.5px;
        line-height: 1.15;
        font-weight: 540;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .aci-reference-top-variant strong {
        margin-top: 5px;
        overflow: hidden;
        color: #0c2054;
        font-size: 11px;
        line-height: 1.15;
        font-weight: 760;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .aci-reference-model-footer > button {
        min-width: 38px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        align-self: stretch;
        border: 0;
        border-left: 0;
        color: var(--aci-reference-blue);
        background: transparent;
        font: inherit;
        font-size: 11px;
        line-height: 1;
        font-weight: 750;
        cursor: pointer;
      }

      .aci-reference-model-footer > button svg {
        width: 35px;
        height: 35px;
        padding: 9px;
        flex: 0 0 auto;
        border: 1px solid #c9dcfb;
        border-radius: 50%;
        color: var(--aci-reference-blue);
        background: #fff;
        transition: color 180ms ease, background 180ms ease;
      }

      .aci-reference-model-footer > button span {
        display: none;
      }

      .aci-reference-model-footer > button:hover svg,
      .aci-reference-model-footer > button:focus-visible svg {
        color: #fff;
        background: var(--aci-reference-blue);
      }

      .aci-reference-model-footer > button:focus-visible {
        outline: 2px solid #99bdf7;
        outline-offset: 2px;
      }

      .aci-reference-comparison-vs {
        position: absolute;
        top: 50%;
        left: 50%;
        z-index: 8;
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        border: 1px solid #c8d9f3;
        border-radius: 50%;
        color: #31527f;
        background: #fff;
        box-shadow: 0 0 0 4px rgba(255, 255, 255, .9);
        transform: translate(-50%, -50%);
        pointer-events: none;
      }

      .aci-reference-comparison-vs::before {
        display: none;
      }

      .aci-reference-comparison-vs span {
        position: relative;
        z-index: 1;
        font-size: 9px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: 0 !important;
      }

      .aci-reference-comparison-card + .aci-journey-actions.is-compact {
        width: 100%;
        margin: 15px 0 0;
        padding: 0;
        border: 0;
        background: transparent;
        transform: none;
      }

      .aci-reference-comparison-card + .aci-journey-actions.is-compact .aci-journey-actions-list {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 9px;
      }

      .aci-reference-comparison-card + .aci-journey-actions.is-compact .aci-journey-actions-list button,
      .aci-reference-comparison-card + .aci-journey-actions.is-compact .aci-journey-actions-list button + button {
        width: auto;
        min-height: 43px;
        padding: 4px 8px 4px 5px;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 13px;
        border: 1px solid #d0e0fa;
        border-radius: 999px;
        color: #102555;
        background: rgba(255, 255, 255, .92);
        box-shadow: none;
        font-size: 11px;
        line-height: 1;
        font-weight: 720;
      }

      .aci-reference-comparison-card + .aci-journey-actions.is-compact .aci-journey-action-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }

      .aci-reference-comparison-card + .aci-journey-actions.is-compact .aci-journey-action-label > svg {
        width: 31px;
        height: 31px;
        padding: 8px;
        border: 0;
        border-radius: 50%;
        color: var(--aci-reference-blue);
        background: #f2f7ff;
      }

      .aci-reference-comparison-card + .aci-journey-actions.is-compact .aci-journey-action-arrow {
        width: 21px;
        height: 21px;
        padding: 4px;
        border: 0;
        color: var(--aci-reference-blue);
        background: transparent;
      }

      @media (max-width: 900px) {
        .aci-reference-comparison-grid {
          gap: 52px;
        }

        .aci-reference-comparison-model {
          padding-inline: 15px;
        }

        .aci-reference-model-footer {
          grid-template-columns: 108px minmax(0, 1fr) auto;
          gap: 9px;
        }

        .aci-reference-model-footer > button {
          min-width: 44px;
          padding-left: 7px;
        }

        .aci-reference-model-footer > button span {
          display: none;
        }
      }

      @media (max-width: 1100px) {
        .aci-reference-comparison-card {
          left: 0;
          width: 100%;
          margin-left: 0;
          translate: none;
        }

        .aci-reference-comparison-card::before {
          right: -16px;
          left: -16px;
        }

        .aci-reference-comparison-header {
          padding: 0 0 17px;
          align-items: flex-start;
          gap: 10px;
        }

        .aci-reference-comparison-header > div > span {
          margin-bottom: 8px;
          font-size: 9px;
        }

        .aci-reference-comparison-header h3 {
          font-size: 23px;
        }

        .aci-reference-comparison-header p {
          margin-top: 6px;
          font-size: 11px;
        }

        .aci-reference-comparison-open {
          width: 39px;
          min-height: 39px;
          padding: 2px;
        }

        .aci-reference-comparison-open span {
          display: none;
        }

        .aci-reference-comparison-open svg {
          width: 33px;
          height: 33px;
          padding: 9px;
        }

        .aci-reference-comparison-grid {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 0 0 10px;
          scroll-snap-type: x mandatory;
          overscroll-behavior-inline: contain;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .aci-reference-comparison-grid::-webkit-scrollbar {
          display: none;
        }

        .aci-reference-comparison-model {
          min-height: 0;
          flex: 0 0 min(calc(100% - 25px), 420px);
          width: min(calc(100% - 25px), 420px);
          padding: 17px 13px 13px;
          grid-template-rows: auto 210px auto;
          border-radius: 18px;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .aci-reference-comparison-rank {
          top: 13px;
          right: 13px;
          left: auto;
          width: 27px;
          height: 27px;
          padding: 0;
          font-size: 10px;
        }

        .aci-reference-model-heading {
          padding-left: 0;
        }

        .aci-reference-model-identity small {
          font-size: 11px;
        }

        .aci-reference-model-identity h4 {
          font-size: 28px;
        }

        .aci-reference-model-specs {
          margin-top: 9px;
          gap: 5px;
        }

        .aci-reference-model-specs > span {
          min-height: 30px;
          padding: 4px 7px;
        }

        .aci-reference-model-specs b {
          font-size: 10px;
        }

        .aci-reference-model-visual {
          height: 210px;
        }

        .aci-reference-model-footer {
          min-height: 0;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          padding: 10px;
        }

        .aci-reference-starting-price {
          padding-right: 10px;
        }

        .aci-reference-starting-price strong {
          font-size: 19px;
        }

        .aci-reference-top-variant {
          grid-column: 1 / -1;
          padding-top: 9px;
          border-top: 1px solid #d8e4f6;
        }

        .aci-reference-model-footer > button {
          grid-column: 2;
          grid-row: 1;
          min-width: 40px;
          padding: 0;
          border-left: 0;
        }

        .aci-reference-model-footer > button span {
          display: none;
        }

        .aci-reference-comparison-vs {
          display: none;
        }

        .aci-reference-comparison-card + .aci-journey-actions.is-compact {
          width: 100%;
          margin-top: 12px;
        }

        .aci-reference-comparison-card + .aci-journey-actions.is-compact .aci-journey-actions-list {
          justify-content: flex-start;
          flex-wrap: nowrap;
          overflow-x: auto;
          padding-bottom: 3px;
          scrollbar-width: none;
        }

        .aci-reference-comparison-card + .aci-journey-actions.is-compact .aci-journey-actions-list::-webkit-scrollbar {
          display: none;
        }

        .aci-reference-comparison-card + .aci-journey-actions.is-compact .aci-journey-actions-list button {
          flex: 0 0 auto;
          min-height: 39px;
          padding-left: 4px;
        }
      }

      /* Recommendation shortlist reference layout */
      .aci-reference-shortlist-card {
        --aci-shortlist-blue: #075cf5;
        --aci-shortlist-navy: #07194b;
        --aci-shortlist-copy: #536486;
        --aci-shortlist-muted: #74839d;
        --aci-shortlist-line: #cadcf8;
        width: 100%;
        padding: 0 !important;
        overflow: visible;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .aci-reference-shortlist-header {
        min-height: 44px;
        padding: 0 0 6px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
      }

      .aci-reference-shortlist-header > div:first-child {
        min-width: 0;
      }

      .aci-reference-shortlist-header > div:first-child > span {
        display: block;
        color: var(--aci-shortlist-blue);
        font-size: 10px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: 0 !important;
        text-transform: uppercase;
      }

      .aci-reference-shortlist-header h3 {
        margin: 5px 0 0;
        color: var(--aci-shortlist-navy);
        font-size: 24px;
        line-height: 1.08;
        font-weight: 820;
        letter-spacing: 0 !important;
      }

      .aci-reference-shortlist-header p {
        display: none;
      }

      .aci-reference-shortlist-header .aci-carousel-controls {
        margin: 0 0 2px;
        display: flex;
        align-items: center;
        gap: 7px;
        flex: 0 0 auto;
      }

      .aci-reference-shortlist-header .aci-carousel-controls small {
        margin-right: 4px;
        color: #607394;
        font-size: 9px;
        font-weight: 720;
        letter-spacing: 0 !important;
      }

      .aci-reference-shortlist-header .aci-carousel-controls button {
        width: 32px;
        height: 32px;
        padding: 0;
        display: grid;
        place-items: center;
        border: 1px solid #d4e2f8;
        border-radius: 50%;
        color: #284a81;
        background: #fff;
        box-shadow: none;
        cursor: pointer;
        transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
      }

      .aci-reference-shortlist-header .aci-carousel-controls button:not(:disabled):hover,
      .aci-reference-shortlist-header .aci-carousel-controls button:not(:disabled):focus-visible {
        border-color: #abc8f7;
        color: var(--aci-shortlist-blue);
        background: #f4f8ff;
        outline: none;
      }

      .aci-reference-shortlist-header .aci-carousel-controls button:disabled {
        color: #a6b4ca;
        background: #f8faff;
        cursor: default;
      }

      .aci-reference-shortlist-card .aci-recommendation-grid {
        width: 100%;
        padding: 2px 0 9px;
        display: flex;
        align-items: stretch;
        gap: 14px;
        overflow-x: auto;
        scroll-padding-inline-start: 0;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        scrollbar-width: none;
        overscroll-behavior-inline: contain;
        -webkit-overflow-scrolling: touch;
      }

      .aci-reference-shortlist-card .aci-recommendation-grid::-webkit-scrollbar {
        display: none;
      }

      .aci-reference-shortlist-model,
      .aci-reference-shortlist-model + .aci-reference-shortlist-model {
        position: relative;
        flex: 0 0 calc((100% - 14px) / 2);
        width: calc((100% - 14px) / 2);
        min-width: 0;
        min-height: 302px;
        padding: 0 14px 12px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--aci-shortlist-line);
        border-radius: 15px;
        background:
          radial-gradient(circle at 88% 4%, rgba(7, 92, 245, .055), transparent 30%),
          linear-gradient(180deg, rgba(255, 255, 255, .99), rgba(248, 251, 255, .99));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1);
        scroll-snap-align: start;
        scroll-snap-stop: always;
        animation: none;
        transition: border-color 180ms ease, background 180ms ease;
      }

      .aci-reference-shortlist-model:hover {
        border-color: #a8c7f8;
        background:
          radial-gradient(circle at 88% 4%, rgba(7, 92, 245, .065), transparent 30%),
          linear-gradient(180deg, #fff, #f8fbff);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1);
        transform: none;
      }

      .aci-reference-shortlist-model .aci-recommendation-visual {
        width: calc(100% + 28px);
        height: 168px;
        margin-left: -14px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 0;
        color: #91a0b5;
        background: radial-gradient(ellipse at 50% 78%, rgba(99, 150, 230, .1), transparent 62%);
        box-shadow: none !important;
      }

      .aci-reference-shortlist-model.is-leading .aci-recommendation-visual {
        background: radial-gradient(ellipse at 50% 78%, rgba(99, 150, 230, .13), transparent 62%);
        box-shadow: none;
      }

      .aci-reference-shortlist-model .aci-recommendation-visual img {
        position: absolute !important;
        inset: 8% 2% 4% !important;
        z-index: 1;
        width: 96% !important;
        height: 88% !important;
        max-width: none !important;
        max-height: none !important;
        object-fit: contain !important;
        object-position: center center !important;
        filter: drop-shadow(0 20px 15px rgba(17, 39, 77, .18));
        transform: none;
        animation: aci-shortlist-image-reveal .34s cubic-bezier(.22, .8, .25, 1) both;
        animation-delay: calc(var(--aci-item-index, 0) * 32ms + 35ms);
      }

      .aci-reference-shortlist-rank {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 4;
        width: 29px;
        height: 29px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: #fff;
        background: var(--aci-shortlist-blue);
        font-size: 11px;
        line-height: 1;
        font-weight: 820;
        letter-spacing: 0 !important;
      }

      .aci-reference-shortlist-safety-label {
        position: absolute;
        right: 10px;
        bottom: 8px;
        left: 10px;
        z-index: 4;
        min-width: 0;
        min-height: 22px;
        padding: 4px 7px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        overflow: hidden;
        border: 1px solid #b8ead9;
        border-radius: 999px;
        color: #15715e;
        background: rgba(231, 252, 246, .96);
        font-size: 8px;
        line-height: 1;
        font-weight: 680;
        letter-spacing: 0 !important;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .aci-reference-shortlist-facts {
        min-height: 31px;
        margin: 9px 0;
        display: flex;
        align-items: stretch;
        gap: 5px;
      }

      .aci-reference-shortlist-facts > span {
        min-width: 0;
        min-height: 29px;
        padding: 4px 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        flex: 1 1 0;
        overflow: hidden;
        border: 1px solid #cbdcf6;
        border-radius: 7px;
        color: var(--aci-shortlist-blue);
        background: linear-gradient(180deg, #fff, #f7faff);
      }

      .aci-reference-shortlist-facts > span svg {
        flex: 0 0 auto;
      }

      .aci-reference-shortlist-facts b {
        min-width: 0;
        overflow: hidden;
        color: #263b60;
        font-size: 10px;
        line-height: 1;
        font-weight: 750;
        letter-spacing: 0 !important;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .aci-reference-shortlist-model > .aci-reference-shortlist-summary {
        width: 100%;
        min-width: 0;
        min-height: 72px;
        margin-top: 0;
        padding: 10px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto 18px;
        align-items: center;
        gap: 10px;
        border: 1px solid #d7e4f8;
        border-radius: 14px;
        color: inherit;
        background: linear-gradient(90deg, rgba(241, 247, 255, .96), rgba(250, 252, 255, .96));
        font: inherit;
        text-align: left;
        align-self: stretch;
        flex: 0 0 auto;
        appearance: none;
        cursor: pointer;
        transition: border-color 160ms ease, background 160ms ease;
      }

      .aci-reference-shortlist-summary small {
        display: block;
        overflow: hidden;
        color: #55709c;
        font-size: 9px;
        line-height: 1;
        font-weight: 620;
        letter-spacing: 0 !important;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .aci-reference-shortlist-summary-identity,
      .aci-reference-shortlist-summary-model {
        min-width: 0;
      }

      .aci-reference-shortlist-summary-model {
        margin-top: 3px;
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 3px 7px;
      }

      .aci-reference-shortlist-summary-model strong {
        color: var(--aci-shortlist-navy);
        font-size: 20px;
        line-height: 1.12;
        font-weight: 820;
        letter-spacing: 0 !important;
      }

      .aci-reference-shortlist-summary-model em {
        min-width: 0;
        color: #5d6f90;
        font-size: 10.5px;
        line-height: 1.25;
        font-style: normal;
        font-weight: 680;
        letter-spacing: 0 !important;
        overflow-wrap: anywhere;
      }

      .aci-reference-shortlist-summary-price {
        min-width: 74px;
        text-align: right;
      }

      .aci-reference-shortlist-summary-price strong {
        margin-top: 3px;
        display: block;
        color: var(--aci-shortlist-blue);
        font-size: 18px;
        line-height: 1;
        font-weight: 840;
        letter-spacing: 0 !important;
        white-space: nowrap;
      }

      .aci-reference-shortlist-model > .aci-reference-shortlist-summary .aci-reference-shortlist-summary-arrow {
        width: 18px;
        height: 18px;
        padding: 0;
        justify-self: end;
        border: 0;
        border-radius: 0;
        color: var(--aci-shortlist-blue);
        background: transparent;
      }

      .aci-reference-shortlist-model > .aci-reference-shortlist-summary:hover,
      .aci-reference-shortlist-model > .aci-reference-shortlist-summary:focus-visible {
        border-color: #a8c6f7;
        background: #f4f8ff;
        box-shadow: none;
        transform: none;
        outline: none;
      }

      .aci-reference-shortlist-actions {
        padding-top: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 9px;
      }

      .aci-reference-shortlist-actions button {
        min-height: 43px;
        padding: 4px 8px 4px 5px;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 13px;
        flex: 0 0 auto;
        border: 1px solid #d0e0fa;
        border-radius: 999px;
        color: #102555;
        background: rgba(255, 255, 255, .92);
        font: inherit;
        font-size: 11px;
        line-height: 1;
        font-weight: 720;
        letter-spacing: 0 !important;
        box-shadow: none;
        cursor: pointer;
        transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
      }

      .aci-reference-shortlist-actions button:hover,
      .aci-reference-shortlist-actions button:focus-visible {
        border-color: #abc8f7;
        color: var(--aci-shortlist-blue);
        background: #f6f9ff;
        outline: none;
      }

      @keyframes aci-shortlist-image-reveal {
        from { opacity: 0; transform: translateY(5px) scale(.992); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .aci-reference-shortlist-actions button > svg:first-child {
        width: 31px;
        height: 31px;
        padding: 8px;
        border-radius: 50%;
        color: var(--aci-shortlist-blue);
        background: #f2f7ff;
      }

      .aci-reference-shortlist-actions button > svg:last-child {
        width: 21px;
        height: 21px;
        padding: 4px;
        color: var(--aci-shortlist-blue);
        background: transparent;
      }

      @media (max-width: 1100px) {
        .aci-reference-shortlist-header {
          align-items: flex-start;
        }

        .aci-reference-shortlist-header h3 {
          font-size: 22px;
        }

        .aci-reference-shortlist-header p {
          max-width: 270px;
        }

        .aci-reference-shortlist-card .aci-recommendation-grid {
          gap: 12px;
        }

        .aci-reference-shortlist-model,
        .aci-reference-shortlist-model + .aci-reference-shortlist-model {
          flex-basis: min(calc(100% - 25px), 420px);
          width: min(calc(100% - 25px), 420px);
          min-height: 344px;
          border-radius: 18px;
          scroll-snap-stop: always;
        }

        .aci-reference-shortlist-model .aci-recommendation-visual {
          height: 210px;
        }

        .aci-reference-shortlist-facts b {
          font-size: 9px;
        }

        .aci-reference-shortlist-actions {
          justify-content: flex-start;
          flex-wrap: nowrap;
          overflow-x: auto;
          padding-bottom: 3px;
          scrollbar-width: none;
        }

        .aci-reference-shortlist-actions::-webkit-scrollbar {
          display: none;
        }
      }

      @media (max-width: 560px) {
        .aci-reference-shortlist-header {
          min-height: 0;
          padding-bottom: 11px;
          gap: 8px;
        }

        .aci-reference-shortlist-header h3 {
          font-size: 22px;
        }

        .aci-reference-shortlist-header p {
          max-width: 240px;
          font-size: 9.5px;
        }

        .aci-reference-shortlist-header .aci-carousel-controls small {
          display: none;
        }

        .aci-reference-shortlist-header .aci-carousel-controls button {
          width: 29px;
          height: 29px;
        }

        .aci-reference-shortlist-model,
        .aci-reference-shortlist-model + .aci-reference-shortlist-model {
          min-height: 344px;
        }

        .aci-reference-shortlist-model .aci-recommendation-visual {
          height: 210px;
        }

        .aci-reference-shortlist-actions {
          padding-bottom: 2px;
        }

        .aci-reference-shortlist-actions button {
          min-height: 43px;
        }
      }

      @media (hover: none) {
        .aci-reference-comparison-model:hover {
          border-color: var(--aci-reference-line);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1);
        }

        .aci-reference-comparison-model:hover .aci-reference-model-visual img {
          filter: drop-shadow(0 20px 15px rgba(17, 39, 77, .18));
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .aci-answer-lead *,
        .aci-journey-actions *,
        .aci-v2-inline-card *,
        .aci-compound-card,
        .aci-compound-card *,
        .aci-comparison-card,
        .aci-comparison-card *,
        .aci-recommendation-card,
        .aci-recommendation-card *,
        .aci-score-inline-card,
        .aci-score-inline-card * {
          animation: none !important;
          transition: none !important;
          scroll-behavior: auto !important;
        }
      }
    `}</style>
  );
}
