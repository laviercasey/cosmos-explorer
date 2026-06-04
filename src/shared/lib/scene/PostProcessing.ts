import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export interface PostProcessingChain {
  composer: EffectComposer;
  render: () => void;
  onResize: (w: number, h: number) => void;
  dispose: () => void;
}

export default function setupPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostProcessingChain {
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
    0.25,
    0.5,
    0.9,
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  function render(): void {
    composer.render();
  }

  function onResize(width: number, height: number): void {
    composer.setSize(width, height);
    bloomPass.resolution.set(width, height);
  }

  function dispose(): void {
    composer.dispose();
  }

  return { composer, render, onResize, dispose };
}
