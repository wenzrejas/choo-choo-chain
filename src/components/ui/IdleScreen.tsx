import { useEffect, useRef, useState, type JSX } from "react";
import gsap from "gsap";
import { useGameStore } from "../../store/gameStore";
import { preloadAssets } from "../../utils/preload";
import { sfxClick } from "../../audio/sfx";
import "./IdleScreen.scss";

let assetsLoaded = false;

export default function IdleScreen(): JSX.Element {
  const startGame = useGameStore((s) => s.startGame);

  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(assetsLoaded);
  const [progress, setProgress] = useState(assetsLoaded ? 100 : 0);

  // Preload all assets on first mount only
  useEffect(() => {
    if (assetsLoaded) return;
    preloadAssets((pct) => setProgress(pct)).then(() => {
      assetsLoaded = true;
      setLoaded(true);
    });
  }, []);

  // Entrance animation once loading is done
  useEffect(() => {
    if (!loaded) return;
    const tl = gsap.timeline();
    tl.fromTo(
      logoRef.current,
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.65, ease: "power3.out" },
      0,
    );
    tl.fromTo(
      btnRef.current,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
        clearProps: "transform",
      },
      0.4,
    );
  }, [loaded]);

  const handleStart = (): void => {
    sfxClick();
    const tl = gsap.timeline({ onComplete: startGame });
    tl.to(
      logoRef.current,
      { y: -160, opacity: 0, duration: 0.3, ease: "power3.in" },
      0,
    );
    tl.to(
      btnRef.current,
      { scale: 0, opacity: 0, duration: 0.35, ease: "back.in(2)" },
      0,
    );
    tl.to(
      rootRef.current,
      { opacity: 0, duration: 0.3, ease: "power2.in" },
      0.28,
    );
  };

  return (
    <div ref={rootRef} className="idle-screen">
      {!loaded ? (
        <div className="idle-screen__loading">
          <div className="idle-screen__loading-label">LOADING</div>
          <div className="idle-screen__loading-pct">{progress}%</div>
          <div className="idle-screen__track">
            <div
              className="idle-screen__fill"
              style={{ "--fill-w": `${progress}%` } as React.CSSProperties}
            />
          </div>
        </div>
      ) : (
        <div className="idle-screen__content">
          <img
            ref={logoRef}
            src={`${import.meta.env.BASE_URL}logo.png`}
            className="idle-screen__logo opacity-0"
          />
          <button
            ref={btnRef}
            className="idle-screen__btn opacity-0"
            onClick={handleStart}
          >
            START GAME
          </button>
        </div>
      )}
      <a
        href="https://ko-fi.com/wenzrej"
        target="_blank"
        rel="noopener noreferrer"
        className="idle-screen__kofi"
      >
        <img
          src={`${import.meta.env.BASE_URL}ko-fi-logo.svg`}
          alt=""
          aria-hidden="true"
        />
        Support me on Ko-fi
      </a>
    </div>
  );
}
