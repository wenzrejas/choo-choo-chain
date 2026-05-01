import type { JSX } from "react";
import type { WagonType } from "../../types";

export const WAGON_ICON_COLORS: Record<WagonType, string> = {
  copper: "#b87333",
  silver: "#aaaaaa",
  gold: "#f5a400",
};

export function WagonIcon({ type }: { type: WagonType }): JSX.Element {
  const color = WAGON_ICON_COLORS[type];
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polygon points="7,0 13,6 7,7 1,6" fill={color} />
      <polygon points="7,14 13,8 7,7 1,8" fill={color} opacity="0.6" />
      <polygon points="1,6 7,7 1,8" fill="rgba(0,0,0,0.08)" />
      <polygon points="13,6 7,7 13,8" fill="rgba(0,0,0,0.08)" />
    </svg>
  );
}
