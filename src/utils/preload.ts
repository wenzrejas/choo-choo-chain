const ASSETS = [
  `${import.meta.env.BASE_URL}logo.png`,
  `${import.meta.env.BASE_URL}sounds/bgm.mp3`,
  `${import.meta.env.BASE_URL}sounds/wagon-collect-sfx.mp3`,
  `${import.meta.env.BASE_URL}sounds/collide-sfx.mp3`,
  `${import.meta.env.BASE_URL}sounds/crash-sfx.mp3`,
  `${import.meta.env.BASE_URL}sounds/steam-engine-sfx.mp3`,
  `${import.meta.env.BASE_URL}sounds/train-whistle-sfx.mp3`,
  `${import.meta.env.BASE_URL}sounds/power-up-sfx.mp3`,
  `${import.meta.env.BASE_URL}sounds/shield-up-sfx.mp3`,
  `${import.meta.env.BASE_URL}models/obstacles/rock-a.glb`,
  `${import.meta.env.BASE_URL}models/obstacles/tree.glb`,
  `${import.meta.env.BASE_URL}models/obstacles/tree-log.glb`,
  `${import.meta.env.BASE_URL}models/obstacles/tree-log-small.glb`,
  `${import.meta.env.BASE_URL}models/train/train-locomotive-b.glb`,
  `${import.meta.env.BASE_URL}models/train/train-carriage-dirt.glb`,
];

export async function preloadAssets(
  onProgress: (pct: number) => void,
): Promise<void> {
  let done = 0;
  await Promise.all(
    ASSETS.map(async (url) => {
      try {
        const res = await fetch(url);
        await res.arrayBuffer();
      } catch {}
      done++;
      onProgress(Math.round((done / ASSETS.length) * 100));
    }),
  );
  onProgress(100);
}
