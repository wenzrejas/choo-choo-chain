import { useEffect, useRef, useState, type JSX } from "react";
import gsap from "gsap";
import { useGameStore } from "../../store/gameStore";
import { ENERGY_MAX, SHIELD_DURATION } from "../../utils/constants";
import { WagonIcon } from "./WagonIcon";
import "./HUD.scss";

// ─── Icons ────────────────────────────────────────────────────────────────────

function ClockIcon(): JSX.Element {
  return (
    <svg width="36" height="38" viewBox="0 0 36 38" fill="none">
      <circle cx="18" cy="22" r="15" fill="#6b21a8" />
      <circle cx="18" cy="18" r="15" fill="#ddd6fe" />
      <circle cx="18" cy="18" r="13" fill="white" />
      <path
        d="M8 11 A13 13 0 0 1 23 6"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <line
        x1="18"
        y1="18"
        x2="18"
        y2="8"
        stroke="#4c1d95"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="18"
        x2="26"
        y2="18"
        stroke="#4c1d95"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="18" cy="18" r="2.5" fill="#4c1d95" />
    </svg>
  );
}

function StarIcon(): JSX.Element {
  return (
    <svg width="32" height="34" viewBox="0 0 30 32" fill="none">
      <polygon
        points="15,2 18.3,10 27,11 21,17 22.5,26 15,21 7.5,26 9,17 3,11 11.7,10"
        fill="#b87200"
        transform="translate(0,3)"
      />
      <polygon
        points="15,2 18.3,10 27,11 21,17 22.5,26 15,21 7.5,26 9,17 3,11 11.7,10"
        fill="#f5a400"
      />
      <polygon
        points="15,2 18.3,10 27,11 21,17 15,13.5 9,17 3,11 11.7,10"
        fill="#ffe040"
      />
    </svg>
  );
}

function LightningIcon({ active }: { active: boolean }): JSX.Element {
  const front = active ? "#ff9500" : "#ffe040";
  const side = active ? "#cc5500" : "#d4880a";
  return (
    <svg width="22" height="30" viewBox="0 0 22 30" fill="none">
      <path d="M14 3 L5 17 H11 L10 30 L20 14 H14 Z" fill={side} />
      <path d="M11 1 L2 15 H8 L7 28 L17 12 H11 Z" fill={front} />
    </svg>
  );
}

function ShieldIcon(): JSX.Element {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
      <path
        d="M11 3 L20 7 L20 16 C20 22 11 26 11 26 C11 26 2 22 2 16 L2 7 Z"
        fill="#4a1080"
      />
      <path
        d="M11 2 L20 6 L20 15 C20 21 11 25 11 25 C11 25 2 21 2 15 L2 6 Z"
        fill="#7c3aed"
      />
      <path d="M11 2 L20 6 L16 9 L11 7 L6 9 L2 6 Z" fill="#a855f7" />
      <path
        d="M11 4 L18 8 L18 15 C18 20 11 23 11 23"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// ─── Shield card with circular progress ──────────────────────────────────────

function ShieldCard({ pct }: { pct: number }): JSX.Element {
  const R = 20;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct / 100);
  return (
    <div className="hud__card hud__shield-card">
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <circle
          cx="26"
          cy="26"
          r={R}
          stroke="rgba(124,58,237,0.18)"
          strokeWidth="5"
        />
        <circle
          cx="26"
          cy="26"
          r={R}
          stroke="#7c3aed"
          strokeWidth="5"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          className="hud__shield-arc"
        />
      </svg>
      <div className="hud__shield-icon">
        <ShieldIcon />
      </div>
    </div>
  );
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

export default function HUD(): JSX.Element {
  const score = useGameStore((s) => s.score);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const energy = useGameStore((s) => s.energy);
  const isBoosting = useGameStore((s) => s.isBoosting);
  const shieldActive = useGameStore((s) => s.shieldActive);
  const shieldTimeRemaining = useGameStore((s) => s.shieldTimeRemaining);
  const wagonsCollected = useGameStore((s) => s.wagonsCollected);

  const [bonusAmt, setBonusAmt] = useState(10);
  const prevTimeRef = useRef(timeRemaining);
  const bonusRef = useRef<HTMLDivElement>(null);

  const energyPct = (energy / ENERGY_MAX) * 100;
  const shieldPct = (shieldTimeRemaining / SHIELD_DURATION) * 100;
  const timeWarning = timeRemaining < 15;

  const mins = Math.floor(timeRemaining / 60);
  const secs = Math.floor(timeRemaining % 60);
  const timeDisplay = `${mins}:${String(secs).padStart(2, "0")}`;

  useEffect(() => {
    const prev = prevTimeRef.current;
    prevTimeRef.current = timeRemaining;
    if (timeRemaining - prev > 1 && bonusRef.current) {
      setBonusAmt(Math.round(timeRemaining - prev));
      gsap.killTweensOf(bonusRef.current);
      gsap.fromTo(
        bonusRef.current,
        { y: 0, opacity: 1 },
        { y: -36, opacity: 0, duration: 1.3, ease: "power2.out" },
      );
    }
  }, [timeRemaining]);

  return (
    <div className="hud">
      {/* ── Timer (top-left) ──────────────────────────────────────────────── */}
      <div className="hud__top-left">
        <div className="hud__timer-card">
          <ClockIcon />
          <span
            className={`hud__timer-value${timeWarning ? " hud__timer-value--warning" : ""}`}
          >
            {timeDisplay}
          </span>
        </div>
        <div ref={bonusRef} className="hud__bonus-popup">
          +{bonusAmt}
        </div>
      </div>

      {/* ── Score + wagon breakdown (top-right) ───────────────────────────── */}
      <div className="hud__score-area">
        <div className="hud__score-card">
          <StarIcon />
          <span className="hud__score-value">{score}</span>
        </div>
        <div className="hud__breakdown-row">
          {(["copper", "silver", "gold"] as const).map((type) => (
            <div key={type} className="hud__breakdown-item">
              <WagonIcon type={type} />
              <span className="hud__breakdown-num">
                {wagonsCollected[type]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Countdown overlay (center) ───────────────────────────────────── */}
      {timeRemaining > 0 && timeRemaining < 5 && (
        <div className="hud__countdown">{Math.ceil(timeRemaining)}</div>
      )}

      {/* ── Bottom-right: shield + boost ──────────────────────────────────── */}
      <div className="hud__bottom-right">
        {shieldActive && <ShieldCard pct={shieldPct} />}

        <div className="hud__card hud__boost-card">
          <div className="hud__boost-track">
            <div
              className={`hud__boost-fill${isBoosting ? " hud__boost-fill--boosting" : ""}`}
              style={{ "--fill-h": `${energyPct}%` } as React.CSSProperties}
            />
          </div>
          <LightningIcon active={isBoosting} />
        </div>
      </div>
    </div>
  );
}
