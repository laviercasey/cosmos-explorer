'use client';

import dynamic from 'next/dynamic';

const IssTrackerDynamic = dynamic(() => import('./ui/IssTracker'), {
  ssr: false,
});

export default function IssTrackerClient() {
  return <IssTrackerDynamic />;
}
