import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { AudioEngine } from "./AudioEngine";
import { sfxTrainChug, sfxTrainWhistleLoop, type StopFn } from "./sfx";
import { startBgm, stopBgm } from "./bgm";

let activeChugStop: StopFn | null = null;
let activeWhistleStop: StopFn | null = null;

function stopChug(): void {
  activeChugStop?.();
  activeChugStop = null;
}

function stopWhistle(): void {
  activeWhistleStop?.();
  activeWhistleStop = null;
}

export function useAudio(): void {
  const phase = useGameStore((s) => s.phase);
  const isBoosting = useGameStore((s) => s.isBoosting);

  // Resume Web Audio context on first user gesture (browser autoplay policy)
  useEffect(() => {
    const resume = (): void => AudioEngine.resume();
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, []);

  // BGM: fade in when playing, fade out otherwise
  useEffect(() => {
    if (phase === "playing") startBgm();
    else stopBgm();
  }, [phase]);

  // Train chug + whistle: start/stop with the playing phase
  useEffect(() => {
    if (phase === "playing") {
      stopChug();
      stopWhistle();
      activeChugStop = sfxTrainChug(false);
      activeWhistleStop = sfxTrainWhistleLoop();
    } else {
      stopChug();
      stopWhistle();
    }
    return () => {
      stopChug();
      stopWhistle();
    };
  }, [phase]);

  // Restart chug at the boosted playback rate whenever boost toggles
  useEffect(() => {
    if (phase !== "playing") return;
    stopChug();
    activeChugStop = sfxTrainChug(isBoosting);
  }, [isBoosting, phase]);
}
