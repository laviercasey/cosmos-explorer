import { setRequestLocale } from 'next-intl/server';

import {
  fetchMissionsServer,
  fetchPlanetsServer,
  fetchTrajectoriesServer,
} from '@shared/api/server';
import { DataCacheClient } from '@shared/data';

import { CosmosSceneClient } from '@widgets/cosmos-scene';
import { IssTrackerClient } from '@widgets/iss-tracker';

export const revalidate = 3600;

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [planets, missions, trajectories] = await Promise.all([
    fetchPlanetsServer({ lang: locale }),
    fetchMissionsServer({ lang: locale }),
    fetchTrajectoriesServer({ lang: locale }),
  ]);

  return (
    <DataCacheClient initial={{ planets, missions, trajectories }}>
      <CosmosSceneClient />
      <IssTrackerClient />
    </DataCacheClient>
  );
}
