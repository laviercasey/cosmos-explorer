'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Trajectory, TrajectoryPhase } from '@entities/mission/model/types';
import type { Planet, PlanetIndex } from '@entities/planet/model/types';

import { useData } from '@shared/data';
import { publishScene, SceneManager } from '@shared/lib/scene';
import type { SceneMissionSimUpdate } from '@shared/lib/scene';

import { HUD } from '@widgets/hud';
import { MissionSimPanel } from '@widgets/mission-sim-panel';
import { MissionsPanel } from '@widgets/missions-panel';
import { PlanetPanel } from '@widgets/planet-panel';
import { Sidebar } from '@widgets/sidebar';
import { TimeControls } from '@widgets/time-controls';

export default function CosmosScene() {
  const { planets, trajectories } = useData();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const planetsRef = useRef<readonly Planet[]>(planets);
  const trajectoriesRef = useRef<Readonly<Record<string, Trajectory>>>(trajectories);

  planetsRef.current = planets;
  trajectoriesRef.current = trajectories;

  const [selectedIndex, setSelectedIndex] = useState<PlanetIndex | null>(null);
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [warpEffect, setWarpEffect] = useState<boolean>(false);
  const [timeScale, setTimeScaleState] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [missionsOpen, setMissionsOpen] = useState<boolean>(false);

  const [missionSimData, setMissionSimData] = useState<Trajectory | null>(null);
  const [missionSimPhase, setMissionSimPhase] = useState<TrajectoryPhase | null>(null);
  const [missionSimProgress, setMissionSimProgress] = useState<number>(0);
  const [missionSimSpeed, setMissionSimSpeed] = useState<number>(1);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const sm = new SceneManager();
    sceneRef.current = sm;

    sm.onPlanetClick = (index: PlanetIndex) => {
      setSelectedIndex(index);
      setShowIntro(false);
    };

    sm.onWarpStart = () => setWarpEffect(true);
    sm.onWarpEnd = () => setWarpEffect(false);
    sm.onMissionSimUpdate = ({ phase, progress }: SceneMissionSimUpdate) => {
      setMissionSimPhase(phase);
      setMissionSimProgress(progress);
    };

    sm.init(container, planetsRef.current)
      .then(() => {
        publishScene(sm);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to initialize 3D scene';
        setInitError(msg);
      });

    const onKey = (e: KeyboardEvent): void => {
      const scene = sceneRef.current;
      if (!scene) return;
      const planetList = planetsRef.current;
      if (planetList.length === 0) return;

      if (e.key === 'Escape' || e.key === 'Backspace') {
        scene.returnToSystem();
        setSelectedIndex(null);
      } else if (e.key === 'ArrowRight') {
        const cur = scene.getFocusedIndex();
        const next = cur !== null ? (cur + 1) % planetList.length : 0;
        scene.focusPlanet(next);
        setSelectedIndex(next);
        setShowIntro(false);
      } else if (e.key === 'ArrowLeft') {
        const cur = scene.getFocusedIndex();
        const prev =
          cur !== null ? (cur - 1 + planetList.length) % planetList.length : planetList.length - 1;
        scene.focusPlanet(prev);
        setSelectedIndex(prev);
        setShowIntro(false);
      }
    };

    const onResize = (): void => sm.onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      publishScene(null);
      sm.dispose();
      sceneRef.current = null;
    };
  }, []);

  const handleSelectPlanet = useCallback((index: PlanetIndex): void => {
    const sm = sceneRef.current;
    if (!sm) return;
    sm.focusPlanet(index);
    setSelectedIndex(index);
    setShowIntro(false);
  }, []);

  const handleBackToSystem = useCallback((): void => {
    const sm = sceneRef.current;
    if (!sm) return;
    sm.returnToSystem();
    setSelectedIndex(null);
  }, []);

  const handleTimeScaleChange = useCallback(
    (scale: number): void => {
      const sm = sceneRef.current;
      if (!sm) return;
      sm.setTimeScale(scale);
      setTimeScaleState(scale);
      if (scale > 0 && isPaused) setIsPaused(false);
    },
    [isPaused],
  );

  const handleTogglePause = useCallback((): void => {
    const sm = sceneRef.current;
    if (!sm) return;
    if (isPaused) {
      const resumeScale = timeScale > 0 ? timeScale : 1;
      sm.setTimeScale(resumeScale);
      setIsPaused(false);
    } else {
      sm.setTimeScale(0);
      setIsPaused(true);
    }
  }, [isPaused, timeScale]);

  const handleClosePlanet = useCallback((): void => {
    handleBackToSystem();
  }, [handleBackToSystem]);

  const handleToggleMissions = useCallback((): void => {
    setMissionsOpen((prev) => !prev);
  }, []);

  const handleStartMissionSim = useCallback((missionName: string): void => {
    const trajMap = trajectoriesRef.current;
    const data = trajMap[missionName];
    if (!data) return;
    const sm = sceneRef.current;
    if (!sm) return;
    sm.startMissionSim(data);
    setMissionSimData(data);
    setMissionSimPhase(data.phases[0] ?? null);
    setMissionSimProgress(0);
    setMissionSimSpeed(1);
    setMissionsOpen(false);
  }, []);

  const handleStopMissionSim = useCallback((): void => {
    const sm = sceneRef.current;
    if (!sm) return;
    sm.stopMissionSim();
    setMissionSimData(null);
    setMissionSimPhase(null);
    setMissionSimProgress(0);
  }, []);

  const handleMissionSimSpeed = useCallback((s: number): void => {
    const sm = sceneRef.current;
    if (!sm) return;
    sm.setMissionSimSpeed(s);
    setMissionSimSpeed(s);
  }, []);

  const planet: Planet | null =
    selectedIndex !== null && selectedIndex >= 0 && selectedIndex < planets.length
      ? (planets[selectedIndex] ?? null)
      : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'crosshair',
        userSelect: 'none',
      }}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {initError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Courier New', monospace",
            fontSize: 14,
            color: '#ff6644',
            textAlign: 'center',
            padding: 40,
          }}
        >
          {initError}
        </div>
      )}

      {warpEffect && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(circle at 50% 50%, rgba(100,180,255,0.3) 0%, transparent 70%)',
            animation: 'warpFlash 0.6s ease-out forwards',
          }}
        />
      )}

      <HUD
        planetName={planet ? planet.name : null}
        onBackToSystem={handleBackToSystem}
        showIntro={showIntro}
        onMissionsOpen={handleToggleMissions}
        missionsOpen={missionsOpen}
      />

      <Sidebar
        planets={planets}
        selectedIndex={selectedIndex}
        onSelect={handleSelectPlanet}
      />

      <TimeControls
        timeScale={timeScale}
        onTimeScaleChange={handleTimeScaleChange}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
      />

      <PlanetPanel planet={planet} onClose={handleClosePlanet} />

      <MissionsPanel
        open={missionsOpen}
        onClose={() => setMissionsOpen(false)}
        onSimulate={handleStartMissionSim}
      />

      {missionSimData && (
        <MissionSimPanel
          trajectoryData={missionSimData}
          currentPhase={missionSimPhase}
          progress={missionSimProgress}
          speed={missionSimSpeed}
          onClose={handleStopMissionSim}
          onSetSpeed={handleMissionSimSpeed}
        />
      )}
    </div>
  );
}
