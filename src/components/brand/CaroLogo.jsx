import "./CaroLogo.css";

export default function CaroLogo({ size = 58 }) {
  return (
    <div
      className="caroLogo"
      style={{
        "--logo-height": `${size}px`,
      }}
    >
      <img
        src="/media/brand/car-wordmark.png"
        alt="car"
        className="caroWord"
        draggable="false"
      />
    </div>
  );
}
