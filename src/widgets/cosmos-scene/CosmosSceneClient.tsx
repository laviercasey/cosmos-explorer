'use client';

import dynamic from 'next/dynamic';

import { LoadingScreen } from '@shared/ui';

const CosmosSceneDynamic = dynamic(() => import('./ui/CosmosScene'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

export default function CosmosSceneClient() {
  return <CosmosSceneDynamic />;
}
