import React from "react";
import { Bell, ChevronLeft, Plus, User2 } from "lucide-react";

import CaroLogo from "../../brand/CaroLogo";

export default function AciV2PortalHeader({
  showBack = false,
  onBack,
  onLogoClick,
  onNewChat,
  onNotifications,
  onProfile,
  logoLabel,
  logoTitle,
  compact = false,
  className = "",
}) {
  const resolvedLogoLabel =
    logoLabel || (onLogoClick || onBack ? "Back to chat" : "CARO home");
  const resolvedLogoTitle = logoTitle || resolvedLogoLabel;

  return (
    <header
      className={`aci-v2-portal-header ${compact ? "is-compact" : ""} ${className}`.trim()}
      aria-label="CARO portal header"
    >
      <style>{`
        .aci-v2-portal-header {
          pointer-events: auto;
          width: min(calc(100% - 20px), 760px);
          height: 44px;
          margin: 0 auto;
          padding: 0 5px 0 12px;
          border: 1px solid rgba(207, 222, 248, 0.78);
          border-radius: 999px;
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,.98),
              rgba(255,255,255,.92)
            );
          box-shadow:
            0 10px 30px rgba(15,23,42,.055),
            0 2px 8px rgba(15,23,42,.025),
            inset 0 1px 0 rgba(255,255,255,.98);
          backdrop-filter:
            blur(16px)
            saturate(170%);
          -webkit-backdrop-filter:
            blur(16px)
            saturate(170%);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .aci-v2-portal-header.is-compact {
          width: min(calc(100% - 20px), 760px);
        }

        .aci-v2-portal-header__left,
        .aci-v2-portal-header__actions {
          display: inline-flex;
          align-items: center;
          min-width: 0;
        }

        .aci-v2-portal-header__actions {
          height: 34px;
          justify-content: flex-end;
          gap: 2px;
          padding: 1px;
          border-radius: 999px;
          background: rgba(255,255,255,.46);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.92);
        }

        .aci-v2-portal-header__logo,
        .aci-v2-portal-header__back,
        .aci-v2-portal-header__action {
          border: 0;
          background: transparent;
          display: inline-grid;
          place-items: center;
          cursor: pointer;
        }

        .aci-v2-portal-header__back {
          width: 31px;
          height: 31px;
          border-radius: 999px;
          color: #31415d;
          margin-right: 3px;
        }

        .aci-v2-portal-header__logo {
          height: 100%;
          min-width: 0;
          justify-content: start;
          padding: 0;
          margin: 0;
          transition: none;
        }

        .aci-v2-portal-header__logo > span {
          display: flex;
          place-items: center;
          transform:
            translateY(1px)
            scale(1.14);
          transform-origin: left center;
          filter:
            drop-shadow(0 0 16px rgba(4,87,255,.10));
        }

        .aci-v2-portal-header__action {
          width: 31px;
          height: 31px;
          border-radius: 999px;
          color: #1c2a44;
          position: relative;
          transition:
            transform .16s ease,
            background .16s ease,
            box-shadow .16s ease;
        }

        .aci-v2-portal-header__action.is-primary {
          color: #ffffff;
          background: #0457ff;
          box-shadow:
            0 8px 20px rgba(4,87,255,.30),
            inset 0 1px 0 rgba(255,255,255,.22);
        }

        .aci-v2-portal-header__action:hover,
        .aci-v2-portal-header__back:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,.86);
          box-shadow: 0 8px 18px rgba(15,23,42,.06);
        }

        .aci-v2-portal-header__logo:hover,
        .aci-v2-portal-header__logo:active,
        .aci-v2-portal-header__logo:focus-visible {
          transform: none;
          background: transparent;
          box-shadow: none;
          outline: none;
        }

        .aci-v2-portal-header__action.is-primary:hover {
          background: #0457ff;
          box-shadow:
            0 10px 24px rgba(4,87,255,.34),
            inset 0 1px 0 rgba(255,255,255,.24);
        }

        @media (max-width: 768px) {
          .aci-v2-portal-header,
          .aci-v2-portal-header.is-compact {
            width: min(calc(100% - 20px), 394px);
            height: 44px;
            padding: 0 4px 0 10px;
          }

          .aci-v2-portal-header__logo > span {
            transform:
              translateY(1px)
              scale(1.02);
          }
        }

        @media (max-width: 390px) {
          .aci-v2-portal-header,
          .aci-v2-portal-header.is-compact {
            width: calc(100% - 20px);
          }

          .aci-v2-portal-header__logo > span {
            transform:
              translateY(1px)
              scale(.96);
          }
        }
      `}</style>

      <div className="aci-v2-portal-header__left">
        {showBack ? (
          <button
            type="button"
            className="aci-v2-portal-header__back"
            onClick={onBack}
            aria-label="Back"
            title="Back"
          >
            <ChevronLeft size={21} strokeWidth={2.35} />
          </button>
        ) : null}

        <button
          type="button"
          className="aci-v2-portal-header__logo"
          onClick={onLogoClick || onBack}
          aria-label={resolvedLogoLabel}
          title={resolvedLogoTitle}
        >
          <span>
            <CaroLogo size={58} />
          </span>
        </button>
      </div>

      <span aria-hidden="true" />

      <div className="aci-v2-portal-header__actions">
        {onNewChat ? (
          <button
            type="button"
            className="aci-v2-portal-header__action is-primary"
            onClick={onNewChat}
            aria-label="New chat"
            title="New chat"
          >
            <Plus size={15} strokeWidth={2.7} />
          </button>
        ) : null}

        {onNotifications ? (
          <button
            type="button"
            className="aci-v2-portal-header__action"
            onClick={onNotifications}
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={16} strokeWidth={2.15} />
          </button>
        ) : null}

        {onProfile ? (
          <button
            type="button"
            className="aci-v2-portal-header__action"
            onClick={onProfile}
            aria-label="Profile"
            title="Profile"
          >
            <User2 size={16} strokeWidth={2.15} />
          </button>
        ) : null}
      </div>
    </header>
  );
}
