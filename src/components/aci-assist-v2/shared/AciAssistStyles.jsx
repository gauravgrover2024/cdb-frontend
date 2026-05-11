import React from "react";

export default function AciAssistStyles() {
  return (
    <style>{`
      :root {
        --blue: #2563eb;
        --blue-dark: #1d4ed8;
        --ink: #0f172a;
        --text: #334155;
        --muted: #64748b;
        --line: #dbe3ef;
        --surface: rgba(255,255,255,.94);
        --shadow: 0 22px 66px -52px rgba(15,23,42,.48);
      }

      html,
      body,
      #root {
        margin: 0;
        min-height: 100%;
        overflow-x: hidden;
      }

      * {
        box-sizing: border-box;
      }

      button,
      input {
        font-family: inherit;
      }

      button {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .aci-home-root {
        min-height: 100vh;
        color: var(--ink);
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        background:
          radial-gradient(circle at 85% -8%, rgba(37,99,235,.08), transparent 30%),
          linear-gradient(180deg, #fff 0%, #f8fbff 100%);
        -webkit-font-smoothing: antialiased;
      }

      .aci-logo {
        border: 0;
        background: transparent;
        padding: 0;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: var(--ink);
      }

      .aci-mark {
        color: var(--blue);
        font-size: 34px;
        line-height: .9;
        font-weight: 900;
        letter-spacing: -4px;
        transform: skewX(-9deg);
      }

      .aci-logo-copy {
        display: flex;
        flex-direction: column;
        gap: 3px;
        align-items: flex-start;
      }

      .aci-logo-copy strong {
        font-size: 15px;
        line-height: 1;
        letter-spacing: 6px;
        font-weight: 760;
      }

      .aci-logo-copy em {
        color: #64748b;
        font-size: 8px;
        line-height: 1;
        letter-spacing: 1.6px;
        text-transform: uppercase;
        font-style: normal;
        font-weight: 520;
      }

      .aci-logo svg {
        color: #c68a2a;
        fill: currentColor;
      }

      .desktop-header,
      .desktop-home-page {
        width: min(100%, 1510px);
        margin-inline: auto;
      }

      .desktop-header {
        position: sticky;
        top: 0;
        z-index: 70;
        height: 82px;
        padding: 14px 40px 8px;
        display: grid;
        grid-template-columns: minmax(230px, 1fr) minmax(560px, 720px) minmax(220px, 1fr);
        align-items: center;
        background: linear-gradient(
          180deg,
          rgba(255,255,255,.96),
          rgba(255,255,255,.90)
        );
        backdrop-filter: blur(18px);
      }

      .desktop-header-left {
        display: flex;
        justify-content: flex-start;
      }

      .desktop-header-center {
        display: flex;
        justify-content: center;
      }

      .desktop-header-right {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 13px;
      }

      .desktop-search,
      .desktop-hero,
      .desktop-quick-grid button,
      .desktop-trending,
      .desktop-car-card,
      .rail-card,
      .mobile-hero,
      .mobile-shortcuts button,
      .mobile-car-card {
        border: 1px solid var(--line);
        background: var(--surface);
        box-shadow: var(--shadow), inset 0 1px 0 #fff;
        backdrop-filter: blur(18px);
      }

      .desktop-search {
        width: 100%;
        height: 56px;
        border-radius: 20px;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 14px;
        padding: 0 12px 0 20px;
      }

      .desktop-search input {
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: #1e293b;
        font-size: 14px;
        font-weight: 460;
      }

      .desktop-search input::placeholder {
        color: #7b8799;
      }

      .desktop-search button {
        height: 31px;
        min-width: 46px;
        border-radius: 11px;
        border: 1px solid #d8e0eb;
        background: #fbfcff;
        color: #6b7280;
        font-size: 12px;
        font-weight: 620;
      }

      .bell-button,
      .plain-button {
        position: relative;
        width: 38px;
        height: 38px;
        border: 0;
        background: transparent;
        display: grid;
        place-items: center;
        color: #475569;
      }

      .bell-button i,
      .mobile-bell i {
        position: absolute;
        top: 5px;
        right: 7px;
        width: 8px;
        height: 8px;
        border-radius: 99px;
        background: var(--blue);
        border: 2px solid #fff;
      }

      .avatar-button,
      .mobile-avatar {
        width: 48px;
        height: 48px;
        border: 0;
        border-radius: 999px;
        padding: 3px;
        background: #fff;
        box-shadow:
          0 0 0 1px #dbe5f2,
          0 10px 24px -14px rgba(37,99,235,.45);
      }

      .avatar-button img,
      .mobile-avatar img {
        width: 100%;
        height: 100%;
        border-radius: inherit;
        object-fit: cover;
        display: block;
      }

      .desktop-home-page {
        padding: 12px 40px 24px;
      }

      .desktop-home-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 22px;
        align-items: start;
      }

      .desktop-home-main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .desktop-hero {
        min-height: 330px;
        border-radius: 26px;
        overflow: hidden;
        padding: 34px;
        display: grid;
        grid-template-columns: 170px minmax(0, 1fr);
        gap: 24px;
        align-items: start;
        background:
          radial-gradient(circle at 100% 0%, rgba(37,99,235,.10), transparent 32%),
          linear-gradient(135deg, #ffffff 0%, #f5f9ff 100%);
      }

      .desktop-hero-orb {
        display: grid;
        place-items: center;
        padding-top: 6px;
      }

      .desktop-hero-copy h1 {
        margin: 0;
        color: var(--ink);
        font-size: 30px;
        line-height: 1.05;
        letter-spacing: -.04em;
        font-weight: 650;
      }

      .desktop-hero-copy h1 span {
        color: var(--blue);
      }

      .desktop-hero-copy > p {
        max-width: 620px;
        margin: 9px 0 12px;
        color: #475569;
        font-size: 15px;
        line-height: 1.55;
        font-weight: 450;
      }

      .desktop-hero-copy small {
        width: max-content;
        height: 29px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid #dbeafe;
        background: #f3f7ff;
        color: var(--blue);
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 11px;
        font-weight: 620;
      }

      .desktop-prompt-grid {
        margin-top: 22px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .desktop-prompt-grid button {
        min-height: 44px;
        border-radius: 13px;
        border: 1px solid #dfe7f2;
        background: rgba(255,255,255,.92);
        color: #334155;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        padding: 8px 10px;
        font-size: 12px;
        font-weight: 520;
        line-height: 1.2;
        white-space: normal;
        text-align: center;
        box-shadow: 0 16px 34px -34px rgba(15,23,42,.28);
      }

      .desktop-prompt-grid svg {
        color: var(--blue);
        flex: 0 0 auto;
      }

      .desktop-quick-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .desktop-quick-grid button {
        min-height: 82px;
        border-radius: 18px;
        padding: 14px;
        display: grid;
        grid-template-columns: 48px 1fr auto;
        gap: 12px;
        align-items: center;
        color: inherit;
        text-align: left;
      }

      .desktop-quick-grid button > span {
        width: 48px;
        height: 48px;
        border-radius: 18px;
        background: #f5f8ff;
        color: var(--blue);
        display: grid;
        place-items: center;
      }

      .desktop-quick-grid strong {
        display: block;
        color: #0f172a;
        font-size: 13px;
        font-weight: 650;
      }

      .desktop-quick-grid p {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 11px;
        line-height: 1.25;
        font-weight: 440;
      }

      .desktop-quick-grid button > svg {
        color: #94a3b8;
      }

      .desktop-trending {
        border-radius: 24px;
        padding: 20px;
      }

      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 16px;
      }

      .section-head h2 {
        margin: 0;
        color: var(--ink);
        font-size: 17px;
        line-height: 1;
        font-weight: 650;
      }

      .section-head button,
      .rail-link,
      .rail-head button,
      .tour-card button {
        border: 0;
        background: transparent;
        color: var(--blue);
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12.5px;
        font-weight: 620;
      }

      .desktop-trending-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }

      .desktop-car-card {
        position: relative;
        border-radius: 19px;
        padding: 14px;
        overflow: hidden;
      }

      .car-tag {
        position: absolute;
        left: 14px;
        top: 14px;
        z-index: 3;
        padding: 5px 8px;
        border-radius: 999px;
        background: #e8f7ef;
        color: #059669;
        font-size: 9px;
        font-weight: 750;
      }

      .desktop-car-card:nth-child(2) .car-tag {
        background: #e8f0ff;
        color: var(--blue);
      }

      .desktop-car-card:nth-child(3) .car-tag {
        background: #f1e8ff;
        color: #7c3aed;
      }

      .heart-button {
        position: absolute;
        right: 14px;
        top: 14px;
        z-index: 4;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        border: 1px solid #dfe7f2;
        background: rgba(255,255,255,.94);
        color: #64748b;
        display: grid;
        place-items: center;
      }

      .desktop-car-image {
        height: 140px;
        border-radius: 12px;
        display: grid;
        place-items: end center;
        overflow: hidden;
        background: transparent;
      }

      .desktop-car-image .aci-car-image-stage,
      .mobile-car-image .aci-car-image-stage {
        border: 0;
      }

      .desktop-car-card h3 {
        margin: 12px 0 5px;
        color: var(--ink);
        font-size: 15px;
        line-height: 1.18;
        font-weight: 650;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .desktop-car-card p {
        margin: 0;
        color: #0f172a;
        font-size: 13px;
        font-weight: 540;
      }

      .desktop-car-specs {
        margin-top: 12px;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .desktop-car-specs span {
        height: 24px;
        padding: 0 7px;
        border-radius: 999px;
        background: #f8fafc;
        border: 1px solid #e3eaf4;
        color: #64748b;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-weight: 500;
      }

      .desktop-right-rail {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .rail-card {
        border-radius: 22px;
        padding: 20px;
      }

      .rail-title h3,
      .rail-head h3,
      .tour-card h3 {
        margin: 0;
        color: var(--ink);
        font-size: 16px;
        line-height: 1;
        font-weight: 650;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .rail-title svg {
        color: var(--blue);
        fill: currentColor;
      }

      .popular-asks {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .popular-asks button {
        border: 0;
        background: transparent;
        color: #334155;
        display: grid;
        grid-template-columns: 26px 1fr;
        gap: 10px;
        align-items: center;
        padding: 0;
        text-align: left;
        font-size: 12.5px;
        font-weight: 480;
      }

      .popular-asks span {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: #f2f5fa;
        color: #64748b;
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 650;
      }

      .rail-link {
        margin-top: 18px;
        width: 100%;
        justify-content: center;
      }

      .rail-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .saved-list {
        margin-top: 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .saved-list > button {
        width: 100%;
        border: 0;
        background: transparent;
        display: grid;
        grid-template-columns: 56px 1fr auto;
        align-items: center;
        gap: 12px;
        padding: 6px 0;
        color: inherit;
        text-align: left;
      }

      .saved-list strong {
        display: block;
        color: #1f2937;
        font-size: 12.5px;
        font-weight: 650;
      }

      .saved-list em {
        display: block;
        margin-top: 3px;
        color: #64748b;
        font-size: 11px;
        font-style: normal;
      }

      .saved-list svg.liked {
        color: var(--blue);
      }

      .save-compare {
        width: 100%;
        height: 38px;
        margin-top: 12px;
        border: 0;
        border-radius: 12px;
        background: #f1f5ff;
        color: var(--blue);
        font-size: 12.5px;
        font-weight: 650;
      }

      .help-list {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 9px;
      }

      .help-list button {
        border: 0;
        background: transparent;
        color: #334155;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 0;
        text-align: left;
        font-size: 12.5px;
        font-weight: 480;
      }

      .help-list svg {
        color: #64748b;
      }

      .tour-card {
        display: grid;
        grid-template-columns: 1fr 76px;
        gap: 14px;
        align-items: center;
      }

      .tour-card p {
        margin: 8px 0 13px;
        color: #64748b;
        font-size: 12.5px;
        line-height: 1.45;
      }

      .tour-card > span {
        width: 74px;
        height: 74px;
        border-radius: 18px;
        background:
          radial-gradient(circle at 50% 50%, rgba(37,99,235,.13), transparent 48%),
          #f4f8ff;
        color: var(--blue);
        display: grid;
        place-items: center;
      }

      .aci-car-image-stage {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 72px;
        border-radius: 24px;
        overflow: hidden;
        isolation: isolate;
        border: 1px solid rgba(219, 228, 242, 0.95);
        background:
          radial-gradient(circle at 76% 18%, rgba(191,219,254,.62), transparent 40%),
          radial-gradient(circle at 20% 26%, rgba(255,255,255,.95), transparent 34%),
          linear-gradient(135deg, #f3f8ff 0%, #ffffff 52%, #edf4ff 100%);
      }

      .aci-car-image-stage.compact {
        border-radius: 20px;
      }

      .aci-car-image-stage.hero {
        border-radius: 28px;
      }

      .aci-car-stage-glow {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 50% 70%, rgba(37,99,235,.13), transparent 44%);
      }

      .aci-car-stage-ground {
        position: absolute;
        left: 50%;
        bottom: 9%;
        width: min(72%, 280px);
        height: 16px;
        transform: translateX(-50%);
        border-radius: 999px;
        background: radial-gradient(ellipse at center, rgba(15,23,42,.2), transparent 70%);
        pointer-events: none;
      }

      .aci-car-stage-image {
        position: relative;
        z-index: 2;
        width: 92%;
        height: 84%;
        margin: 0 auto;
        object-fit: contain;
        object-position: center bottom;
        mix-blend-mode: multiply;
        filter: drop-shadow(0 18px 18px rgba(15,23,42,.16));
        display: block;
      }

      .aci-car-stage-skeleton {
        position: absolute;
        inset: 12% 6% 11%;
        z-index: 1;
        border-radius: 16px;
        background: linear-gradient(90deg, rgba(226,236,249,.42) 0%, rgba(255,255,255,.86) 46%, rgba(226,236,249,.42) 100%);
        background-size: 220% 100%;
        animation: aciCarStageShimmer 1.1s linear infinite;
      }

      @keyframes aciCarStageShimmer {
        0% { background-position: 100% 0; }
        100% { background-position: -110% 0; }
      }

      .aci-car-image-stage.compact .aci-car-stage-image {
        width: 90%;
        height: 82%;
      }

      .aci-car-image-stage.hero .aci-car-stage-image {
        width: 94%;
        height: 86%;
      }

      .aci-car-stage-fallback {
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100%;
        min-height: inherit;
        display: grid;
        place-items: center;
        color: #475569;
      }

      .aci-car-stage-fallback span {
        position: absolute;
        bottom: 11%;
        color: #334155;
        font-size: 10px;
        letter-spacing: .12em;
        font-weight: 800;
      }

      .orb {
        position: relative;
        width: 188px;
        height: 188px;
        display: grid;
        place-items: center;
      }

      .orb.small {
        width: 42px;
        height: 42px;
        flex: 0 0 auto;
      }

      .orb-shell {
        position: relative;
        z-index: 3;
        width: 128px;
        height: 128px;
        border-radius: 999px;
        background:
          radial-gradient(circle at 28% 22%, rgba(255,255,255,.98) 0 16%, rgba(239,246,255,.94) 32%, rgba(148,178,235,.62) 58%, rgba(25,93,210,.2) 78%, rgba(255,255,255,.72) 100%);
        box-shadow:
          inset 10px 14px 18px rgba(255,255,255,.92),
          inset -12px -16px 24px rgba(24,84,185,.25),
          0 18px 28px rgba(37,99,235,.18);
      }

      .orb.small .orb-shell {
        width: 32px;
        height: 32px;
      }

      .orb-face {
        position: absolute;
        left: 29px;
        top: 30px;
        width: 70px;
        height: 70px;
        border-radius: 999px;
        background: radial-gradient(circle at 50% 35%, #142b60 0%, #050912 68%);
        box-shadow:
          inset 0 0 0 2px rgba(96,165,250,.38),
          0 0 24px rgba(37,99,235,.4);
      }

      .orb.small .orb-face {
        left: 7px;
        top: 7px;
        width: 18px;
        height: 18px;
      }

      .orb-eye {
        position: absolute;
        top: 30px;
        width: 16px;
        height: 10px;
        border-radius: 999px 999px 0 0;
        border-top: 5px solid #67c8ff;
        filter: drop-shadow(0 0 6px #3b82f6);
      }

      .orb-eye.left {
        left: 15px;
      }

      .orb-eye.right {
        right: 15px;
      }

      .orb.small .orb-eye {
        top: 7px;
        width: 5px;
        height: 3px;
        border-top-width: 2px;
      }

      .orb.small .orb-eye.left {
        left: 4px;
      }

      .orb.small .orb-eye.right {
        right: 4px;
      }

      .orb-star {
        position: absolute;
        left: 26px;
        top: 20px;
        color: #bfdbfe;
        font-size: 26px;
        font-weight: 400;
        text-shadow: 0 0 16px rgba(96,165,250,.9);
      }

      .orb-ring {
        position: absolute;
        left: 23px;
        top: 52px;
        width: 140px;
        height: 72px;
        border: 1.5px solid rgba(76,124,210,.22);
        border-radius: 50%;
        z-index: 1;
      }

      .ring-one {
        transform: rotate(-26deg);
      }

      .ring-two {
        transform: rotate(28deg);
        opacity: .48;
      }

      .ring-three {
        transform: rotate(82deg) scale(.9);
        opacity: .24;
      }

      .orb-base {
        position: absolute;
        z-index: 2;
        bottom: 10px;
        width: 144px;
        height: 25px;
        border-radius: 50%;
        background:
          radial-gradient(ellipse at center, rgba(37,99,235,.28), transparent 56%),
          linear-gradient(180deg, rgba(255,255,255,.95), rgba(214,223,238,.86));
        box-shadow:
          0 10px 14px rgba(15,23,42,.10),
          inset 0 2px 0 rgba(255,255,255,.8);
      }

      .creta-photo,
      .vehicle-photo {
        display: block;
        object-fit: contain;
        object-position: center;
        user-select: none;
        pointer-events: none;
      }

      .mobile-home-page {
        display: none;
      }

      @media (max-width: 1180px) and (min-width: 901px) {
        .desktop-header {
          grid-template-columns: minmax(190px, 1fr) minmax(420px, 560px) minmax(170px, 1fr);
          padding-inline: 24px;
        }

        .desktop-home-page {
          padding-inline: 24px;
        }

        .desktop-home-layout {
          grid-template-columns: 1fr;
        }

        .desktop-right-rail {
          display: none;
        }

        .desktop-prompt-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 1360px) and (min-width: 901px) {
        .desktop-quick-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .desktop-quick-grid strong {
          font-size: 12.5px;
          line-height: 1.2;
          word-break: break-word;
        }
      }

      @media (max-width: 900px) {
        .desktop-header,
        .desktop-home-page {
          display: none;
        }

        .aci-home-root {
          background:
            radial-gradient(circle at 50% 100%, rgba(37,99,235,.12), transparent 25%),
            linear-gradient(180deg, #fff 0%, #fbfcff 54%, #f8fbff 100%);
        }

        .mobile-home-page {
          width: 100%;
          max-width: 430px;
          min-height: 100vh;
          margin: 0 auto;
          padding: 18px 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px;
        }

        .aci-logo.mobile .aci-mark {
          font-size: 30px;
        }

        .aci-logo.mobile .aci-logo-copy strong {
          font-size: 15px;
          letter-spacing: 6px;
        }

        .aci-logo.mobile svg {
          color: var(--blue);
        }

        .mobile-header > div {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .mobile-bell {
          position: relative;
          width: 36px;
          height: 36px;
          border: 0;
          background: transparent;
          color: #596174;
          display: grid;
          place-items: center;
        }

        .mobile-avatar {
          width: 48px;
          height: 48px;
        }

        .mobile-hero {
          min-height: 260px;
          border-radius: 26px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 48% 52%;
          align-items: center;
          background:
            radial-gradient(circle at 14% 48%, rgba(37,99,235,.14), transparent 42%),
            linear-gradient(135deg, #edf4ff, #fff 58%, #fbfdff);
        }

        .mobile-hero-orb {
          display: grid;
          place-items: center;
          margin-left: -24px;
        }

        .mobile-hero-orb .orb {
          width: 184px;
          height: 184px;
        }

        .mobile-hero-copy {
          padding: 18px 18px 16px 0;
        }

        .mobile-hero-copy h1 {
          margin: 0;
          color: #07102b;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 40px;
          line-height: .96;
          letter-spacing: -.055em;
          font-weight: 680;
        }

        .mobile-hero-copy p {
          margin: 14px 0 16px;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 450;
        }

        .mobile-hero-copy button {
          width: fit-content;
          max-width: 100%;
          min-height: 50px;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--blue), var(--blue-dark));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          font-size: clamp(12.4px, 3.2vw, 13.6px);
          white-space: nowrap;
          font-weight: 650;
          box-shadow: 0 18px 38px -22px rgba(37,99,235,.62);
        }

        .mobile-hero-copy small {
          margin-top: 11px;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: 10.5px;
          line-height: 1;
          font-weight: 450;
          white-space: nowrap;
        }

        .mobile-hero-copy small svg {
          color: #c68a2a;
          fill: currentColor;
        }

        .mobile-shortcuts {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .mobile-shortcuts button {
          height: 82px;
          border-radius: 22px;
          display: grid;
          grid-template-columns: 30px 1fr;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          color: var(--ink);
          text-align: left;
        }

        .mobile-shortcuts svg {
          color: var(--blue);
          flex: 0 0 auto;
          width: 24px;
          height: 24px;
        }

        .mobile-shortcuts span {
          font-size: clamp(11.2px, 2.9vw, 12.6px);
          line-height: 1.12;
          font-weight: 700;
          text-align: left;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: normal;
          overflow-wrap: normal;
        }

        .mobile-assistant-chips {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .mobile-assistant-chips button {
          height: 34px;
          border-radius: 999px;
          border: 1px solid #dbe3ef;
          background: rgba(255,255,255,.94);
          color: #1d4ed8;
          font-size: clamp(8.3px, 2.15vw, 9.8px);
          font-weight: 620;
          padding: 0 3px;
          white-space: nowrap;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mobile-popular {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mobile-section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          padding: 0 6px;
        }

        .mobile-section-head h2 {
          margin: 0;
          color: #0b1028;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 25px;
          line-height: 1;
          letter-spacing: -.05em;
          font-weight: 620;
        }

        .mobile-section-head button {
          border: 0;
          background: transparent;
          color: var(--blue);
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 12px;
          font-weight: 620;
          white-space: nowrap;
        }

        .mobile-cars-window {
          overflow: hidden;
        }

        .mobile-cars-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          cursor: grab;
        }

        .mobile-car-card {
          min-height: 248px;
          border-radius: 22px;
          overflow: hidden;
          position: relative;
        }

        .mobile-heart {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid #dfe7f2;
          background: rgba(255,255,255,.94);
          color: #64748b;
          z-index: 5;
          display: grid;
          place-items: center;
        }

        .mobile-car-body {
          width: 100%;
          height: 100%;
          border: 0;
          background: transparent;
          text-align: left;
          padding: 8px 12px 14px;
        }

        .mobile-car-image {
          height: 124px;
          margin: 0 0 10px;
          border-radius: 12px;
          overflow: hidden;
          display: block;
          background: transparent;
        }

        .mobile-car-image img,
        .mobile-creta-card-photo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
        }

        .mobile-car-body h3 {
          margin: 0 0 8px;
          font-size: 17px;
          line-height: 1.18;
          font-weight: 700;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .mobile-car-meta {
          opacity: 0;
          transform: translateY(4px);
          transition: opacity .2s ease, transform .2s ease;
        }

        .mobile-car-meta.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .mobile-car-body b {
          width: 28px;
          height: 1px;
          display: block;
          background: #bcc5d3;
          margin: 0 0 8px;
        }

        .mobile-car-body strong {
          color: #0f172a;
          font-size: 13px;
          font-weight: 500;
        }

        .mobile-car-body em {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 10.5px;
          font-weight: 520;
          font-style: normal;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mobile-cars-dots {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          margin-top: 2px;
        }

        .mobile-cars-dots button {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          border: 0;
          background: #c7d3e7;
          transition: width .22s ease, background-color .22s ease;
        }

        .mobile-cars-dots button.is-active {
          width: 16px;
          background: #2563eb;
        }

        .mobile-hero-copy button,
        .mobile-shortcuts button,
        .mobile-assistant-chips button,
        .mobile-car-body,
        .mobile-section-head button {
          transition: transform .12s ease, box-shadow .12s ease;
        }

        .mobile-hero-copy button:active,
        .mobile-shortcuts button:active,
        .mobile-assistant-chips button:active,
        .mobile-car-body:active,
        .mobile-section-head button:active {
          transform: scale(0.985);
          box-shadow: 0 8px 20px -16px rgba(15,23,42,.22);
        }

        .mobile-home-page {
          padding-bottom: calc(112px + env(safe-area-inset-bottom));
        }
      }

      @media (max-width: 390px) {
        .mobile-home-page {
          padding-inline: 12px;
        }

        .mobile-hero {
          grid-template-columns: 46% 54%;
        }

        .mobile-hero-copy h1 {
          font-size: 31px;
        }

        .mobile-hero-copy p {
          font-size: 12.5px;
        }

        .mobile-shortcuts {
          gap: 9px;
        }

        .mobile-shortcuts button {
          padding-inline: 10px;
        }

        .mobile-shortcuts span {
          font-size: 10.9px;
          line-height: 1.12;
        }

        .mobile-assistant-chips button {
          font-size: 9.5px;
          padding: 0 3px;
        }
      }

`}</style>

  );
}
