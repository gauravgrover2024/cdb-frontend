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

      /* Shared vehicle answer language: price, colour, comparisons and shortlists. */
      .aci-compound-card,
      .aci-comparison-card,
      .aci-recommendation-card {
        width: 100%;
        padding: 0;
        overflow: hidden;
        border: 1px solid rgba(213, 223, 239, .9);
        border-radius: 8px;
        color: #071142;
        background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
        box-shadow: 0 24px 58px -44px rgba(18, 38, 76, .52);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .aci-compound-card *,
      .aci-comparison-card *,
      .aci-recommendation-card *,
      .aci-price-feature-card *,
      .aci-color-inline-card *,
      .aci-feature-inline-card-v4 * {
        letter-spacing: 0 !important;
      }

      .aci-vehicle-card-header {
        min-height: 66px;
        padding: 13px 15px 11px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid #e8edf4;
        background: rgba(255, 255, 255, .86);
      }
      .aci-vehicle-card-header > div:first-child { min-width: 0; }
      .aci-vehicle-card-header span,
      .aci-vehicle-card-header h3,
      .aci-vehicle-card-header p { display: block; margin: 0; }
      .aci-vehicle-card-header > div:first-child > span {
        color: #0758f8;
        font-size: 9px;
        line-height: 1;
        font-weight: 800;
        text-transform: uppercase;
      }
      .aci-vehicle-card-header h3 {
        margin-top: 4px;
        color: #101c34;
        font-size: 17px;
        line-height: 1.18;
        font-weight: 790;
        overflow-wrap: anywhere;
      }
      .aci-vehicle-card-header p {
        margin-top: 4px;
        color: #6b778b;
        font-size: 10.5px;
        line-height: 1.35;
        font-weight: 540;
      }

      .aci-carousel-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }
      .aci-carousel-controls small { margin-right: 3px; color: #6d798d; font-size: 9.5px; font-weight: 650; }
      .aci-carousel-controls button {
        width: 29px;
        height: 29px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid #d9e2ee;
        border-radius: 50%;
        color: #24334d;
        background: #fff;
        cursor: pointer;
      }
      .aci-carousel-controls button:disabled { opacity: .35; cursor: default; }
      .aci-carousel-controls button:not(:disabled):hover,
      .aci-carousel-controls button:not(:disabled):focus-visible { color: #0758f8; border-color: #a9c2ef; outline: none; }

      .aci-compound-grid,
      .aci-comparison-grid {
        padding: 10px 15px 14px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
      .aci-vehicle-choice-card {
        min-width: 0;
        min-height: 268px;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        border: 0;
        background: transparent;
      }
      .aci-vehicle-choice-card + .aci-vehicle-choice-card { border-left: 1px solid #e7ecf3; padding-left: 18px; }
      .aci-compound-model,
      .aci-comparison-model { grid-template-columns: none; gap: 0; }
      .aci-compound-model-visual,
      .aci-comparison-model-visual {
        width: 100%;
        height: 146px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 7px;
        background: linear-gradient(180deg, #fbfdff 0%, #f4f8fd 100%);
      }
      .aci-compound-model-visual img,
      .aci-comparison-model-visual img {
        width: 96%;
        height: 96%;
        object-fit: contain;
        filter: drop-shadow(0 14px 12px rgba(15, 23, 42, .12));
      }
      .aci-vehicle-choice-rank,
      .aci-recommendation-rank {
        display: block;
        margin-top: 8px;
        color: #0758f8;
        font-size: 8.5px;
        line-height: 1;
        font-weight: 800;
        text-transform: uppercase;
      }
      .aci-compound-model h4,
      .aci-comparison-model h4,
      .aci-recommendation-model h4 {
        margin: 5px 0 0;
        min-height: 33px;
        color: #111d34;
        font-size: 13px;
        line-height: 1.25;
        font-weight: 780;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .aci-comparison-variant { margin: 1px 0 0; color: #647086; font-size: 10px; line-height: 1.25; }
      .aci-comparison-facts { margin-top: 7px; min-height: 38px; }
      .aci-comparison-facts strong,
      .aci-comparison-facts span { display: block; }
      .aci-comparison-facts strong { color: #17243b; font-size: 11.5px; line-height: 1.2; }
      .aci-comparison-facts strong small { color: #7b8799; font-size: 9px; font-weight: 560; }
      .aci-comparison-facts span { margin-top: 4px; color: #6d798e; font-size: 9.5px; line-height: 1.2; }
      .aci-comparison-model > button,
      .aci-recommendation-model > button {
        min-height: 30px;
        margin-top: auto;
        display: inline-flex;
        align-items: center;
        align-self: flex-start;
        gap: 6px;
        padding: 5px 0;
        border: 0;
        color: #0758f8;
        background: transparent;
        font: inherit;
        font-size: 10.5px;
        line-height: 1.2;
        font-weight: 700;
        cursor: pointer;
      }
      .aci-comparison-model > button svg,
      .aci-recommendation-model > button svg {
        width: 18px;
        height: 18px;
        padding: 3px;
        border: 1px solid #d9e1ec;
        border-radius: 50%;
        color: #5f6d83;
      }
      .aci-comparison-open {
        width: calc(100% - 30px);
        min-height: 36px;
        margin: 0 15px 10px;
        padding: 7px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 0;
        border-top: 1px solid #e6ebf2;
        color: #0758f8;
        background: transparent;
        font: inherit;
        font-size: 10.5px;
        font-weight: 700;
        cursor: pointer;
      }

      .aci-recommendation-grid {
        padding: 10px 0 14px 15px;
        display: flex;
        align-items: stretch;
        gap: 16px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        overscroll-behavior-inline: contain;
      }
      .aci-recommendation-grid::-webkit-scrollbar { display: none; }
      .aci-recommendation-model {
        flex: 0 0 calc((100% - 32px) / 3);
        width: calc((100% - 32px) / 3);
        min-height: 276px;
        scroll-snap-align: start;
      }
      .aci-recommendation-model + .aci-recommendation-model { padding-left: 0; border-left: 0; }
      .aci-recommendation-visual {
        width: 100%;
        height: 138px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 7px;
        background: linear-gradient(180deg, #fbfdff 0%, #f4f8fd 100%);
      }
      .aci-recommendation-visual img { width: 98%; height: 98%; object-fit: contain; filter: drop-shadow(0 14px 12px rgba(15, 23, 42, .12)); }
      .aci-recommendation-model > strong { min-height: 18px; margin-top: 4px; font-size: 11.5px; }
      .aci-recommendation-model > p {
        min-height: 32px;
        margin: 5px 0 7px;
        color: #68758a;
        font-size: 9.5px;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .aci-journey-actions.is-compact {
        width: min(100%, 760px);
        margin-top: 6px;
        padding-top: 0;
        border-top: 0;
      }
      .aci-journey-actions.is-compact .aci-journey-actions-list { margin-top: 0; }

      @media (max-width: 720px) {
        .aci-vehicle-card-header { min-height: 62px; padding: 11px 12px 10px; align-items: flex-end; }
        .aci-vehicle-card-header h3 { font-size: 15px; }
        .aci-vehicle-card-header p { font-size: 9.5px; }
        .aci-carousel-controls small { display: none; }
        .aci-carousel-controls button { width: 28px; height: 28px; }

        .aci-recommendation-grid { gap: 12px; padding: 10px 0 12px 12px; }
        .aci-recommendation-model {
          flex: 0 0 100%;
          width: 100%;
          min-height: 330px;
          display: flex;
          padding: 0;
          border-bottom: 0;
        }
        .aci-recommendation-visual { height: 182px; grid-row: auto; }
        .aci-recommendation-model h4 { min-height: 0; font-size: 14px; }
        .aci-recommendation-model > p { min-height: 27px; }

        .aci-compound-grid,
        .aci-comparison-grid {
          padding: 10px 12px 12px;
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }
        .aci-compound-grid::-webkit-scrollbar,
        .aci-comparison-grid::-webkit-scrollbar { display: none; }
        .aci-compound-model,
        .aci-comparison-model {
          flex: 0 0 88%;
          width: 88%;
          min-height: 292px;
          padding: 0;
          border: 0;
          scroll-snap-align: start;
        }
        .aci-compound-model + .aci-compound-model,
        .aci-comparison-model + .aci-comparison-model { padding-left: 0; border-left: 0; }
        .aci-compound-model-visual,
        .aci-comparison-model-visual { height: 170px; }
        .aci-journey-actions.is-compact .aci-journey-actions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0 18px;
        }
        .aci-journey-actions.is-compact .aci-journey-actions-list button + button { border-top: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .aci-answer-lead *,
        .aci-journey-actions *,
        .aci-v2-inline-card * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
      }
    `}</style>
  );
}
