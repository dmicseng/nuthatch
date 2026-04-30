export const SYNC_QUEUE_NAME = 'vendor-sync';

export type SyncJobData = {
  serviceId: string;
  orgId: string;
};

export type SyncJobResult = {
  eventsAdded: number;
  snapshotsAdded: number;
  warnings: string[];
};
