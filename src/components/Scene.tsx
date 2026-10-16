import { useState } from "react";
import { directions, type DirectionId } from "../lib/studio";
export function Scene({
  direction,
  small = false,
}: {
  direction: DirectionId;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!failed)
    return (
      <img
        src="/brand/doorway.webp"
        alt={`${direction} mood study — pre-made demo artwork, not a live Comfy result`}
        className={`scene-art scene-${direction}`}
        loading={small ? "lazy" : "eager"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  const d = directions.find((d) => d.id === direction)!;
  const id = `scene-${direction}-${small ? "s" : "l"}`;
  return (
    <svg
      viewBox="0 0 1600 900"
      role="img"
      aria-label={`${d.name}: illustrated desert doorway concept`}
      preserveAspectRatio="xMidYMid slice"
      className={`scene-art scene-${direction}`}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor="#253635" />
          <stop offset=".6" stopColor="#aaa082" />
          <stop offset="1" stopColor="#f7d8a0" />
        </linearGradient>
        <linearGradient id={`${id}-sand`} x2=".3" y2="1">
          <stop stopColor="#ddae70" />
          <stop offset="1" stopColor="#5e4131" />
        </linearGradient>
        <linearGradient id={`${id}-door`}>
          <stop stopColor="#392c24" />
          <stop offset=".7" stopColor="#9e704a" />
          <stop offset="1" stopColor="#e5b780" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#fff0b7" stopOpacity=".8" />
          <stop offset="1" stopColor="#f4bf68" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-grain`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".7"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".16" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="soft-light" />
        </filter>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      <ellipse cx="1150" cy="400" rx="550" ry="450" fill={`url(#${id}-glow)`} />
      <circle cx="1120" cy="322" r="62" fill="#ffe5af" opacity=".85" />
      <path d="M0 550 Q300 475 620 560 T1600 495 V900 H0Z" fill="#b39a74" />
      <path d="M0 610 Q450 420 940 670 T1600 540 V900 H0Z" fill="#9c7951" />
      <path
        d="M0 697 Q250 550 720 617 Q1150 530 1600 670 V900 H0Z"
        fill={`url(#${id}-sand)`}
      />
      <path
        d="M850 606 L1140 636 L1600 900 L1360 900Z"
        fill="#3c3028"
        opacity=".5"
      />
      <path
        d="M692 210 L956 192 L1000 645 L726 617Z"
        fill={`url(#${id}-door)`}
      />
      <path d="M692 210 L717 184 L977 172 L956 192Z" fill="#ebbd82" />
      <path d="M956 192 L977 172 L1021 626 L1000 645Z" fill="#cf9b60" />
      <path d="M755 273 L905 263 L936 619 L780 608Z" fill="#171e1d" />
      <path d="M769 287 L905 278 L935 617 L796 608Z" fill={`url(#${id}-sky)`} />
      <path d="M796 547 Q850 505 927 547 L935 617 L796 608Z" fill="#cfac78" />
      <path d="M755 273 L769 287 L796 608 L780 608Z" fill="#f3ce8d" />
      <g fill="#212726">
        <circle cx="698" cy="619" r="9" />
        <path d="M690 629 Q697 625 705 630 L716 672 L706 675 L703 658 L707 703 L699 704 L696 677 L691 704 L683 703 L688 654 L681 673 L676 669Z" />
      </g>
      <path
        d="M689 702 L701 701 L852 805 L831 803Z"
        fill="#332b25"
        opacity=".6"
      />
      <g fill="none" stroke="#e0b781" opacity=".16">
        {Array.from({ length: 20 }, (_, i) => (
          <path
            key={i}
            d={`M${-100 + i * 15} ${750 + i * 13} Q500 ${610 + i * 13} 1700 ${760 + i * 17}`}
          />
        ))}
      </g>
      <rect
        width="1600"
        height="900"
        filter={`url(#${id}-grain)`}
        opacity=".45"
      />
      <rect
        width="1600"
        height="900"
        fill={d.color}
        opacity={direction === "wonder" ? 0 : 0.13}
      />
    </svg>
  );
}
