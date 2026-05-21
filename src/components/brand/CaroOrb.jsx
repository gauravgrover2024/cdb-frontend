export default function CaroOrb() {
  return (
    <svg
      className="caroOrb"
      viewBox="0 0 1000 1000"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="glassFill" cx="43%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".68" />
          <stop offset="25%" stopColor="#f7fbff" stopOpacity=".42" />
          <stop offset="48%" stopColor="#dcecff" stopOpacity=".24" />
          <stop offset="68%" stopColor="#9ec8ff" stopOpacity=".13" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity=".035" />
        </radialGradient>

        <radialGradient id="coreFill" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#09205a" />
          <stop offset="28%" stopColor="#061844" />
          <stop offset="55%" stopColor="#031032" />
          <stop offset="78%" stopColor="#01091f" />
          <stop offset="100%" stopColor="#00030a" />
        </radialGradient>

        <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9ff6ff" />
          <stop offset="30%" stopColor="#54cfff" />
          <stop offset="68%" stopColor="#126dff" />
          <stop offset="100%" stopColor="#003fd6" />
        </linearGradient>
      </defs>

      {/* GLASS */}
      <circle cx="500" cy="500" r="430" fill="url(#glassFill)" />

      {/* CORE */}
      <circle cx="500" cy="500" r="300" fill="url(#coreFill)" />

      {/* EYES */}
      <path
        d="M338 580
        C365 500 455 500 482 580
        C455 520 365 520 338 580 Z"
        fill="url(#eyeGrad)"
      />

      <path
        d="M518 580
        C545 500 635 500 662 580
        C635 520 545 520 518 580 Z"
        fill="url(#eyeGrad)"
      />

      {/* STAR */}
      <path
        d="M500 590
        C502 602 504 606 509 610
        C514 614 520 616 532 619
        C520 622 514 624 509 628
        C504 632 502 636 500 648
        C498 636 496 632 491 628
        C486 624 480 622 468 619
        C480 616 486 614 491 610
        C496 606 498 602 500 590 Z"
        fill="#fffdf7"
      />
    </svg>
  );
}
