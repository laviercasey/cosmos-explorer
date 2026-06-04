import type { SceneManagerLike } from './types';

type Listener = (scene: SceneManagerLike | null) => void;

const listeners = new Set<Listener>();
let current: SceneManagerLike | null = null;

export function publishScene(scene: SceneManagerLike | null): void {
  current = scene;
  for (const fn of listeners) fn(scene);
}

export function subscribeScene(handler: Listener): () => void {
  listeners.add(handler);
  if (current) handler(current);
  return () => {
    listeners.delete(handler);
  };
}

export function peekScene(): SceneManagerLike | null {
  return current;
}
