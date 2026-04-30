'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Unplug, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatRelativeDate } from '@/lib/format';

type Props = {
  serviceId: string;
  adapterDisplayName: string;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
};

export function ConnectedCard({
  serviceId,
  adapterDisplayName,
  lastSyncedAt,
  lastSyncError,
}: Props) {
  const router = useRouter();
  const [syncing, startSync] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl font-normal flex items-center gap-2">
            {adapterDisplayName}
            {lastSyncError ? (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="size-3" /> Sync error
              </Badge>
            ) : (
              <Badge className="gap-1">
                <CheckCircle2 className="size-3" /> Connected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            {lastSyncedAt ? (
              <p>
                Last synced{' '}
                <time dateTime={lastSyncedAt.toISOString()}>
                  {formatRelativeDate(lastSyncedAt)}
                </time>
              </p>
            ) : (
              <p className="text-muted-foreground">Not synced yet — first run is queued.</p>
            )}
            {lastSyncError ? (
              <p className="text-destructive mt-2 text-xs font-mono">{lastSyncError}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={syncing}
              onClick={() =>
                startSync(async () => {
                  const res = await fetch(`/api/services/${serviceId}/sync`, {
                    method: 'POST',
                  });
                  if (res.ok) {
                    toast.success('Sync queued');
                    router.refresh();
                  } else {
                    toast.error('Could not queue sync');
                  }
                })
              }
            >
              {syncing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Sync now
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
            >
              <Unplug className="size-4" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {adapterDisplayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Credentials will be deleted and automatic syncs will stop. Past billing
              data stays in history. You can reconnect later by entering credentials again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                startDelete(async () => {
                  const res = await fetch(`/api/services/${serviceId}/credentials`, {
                    method: 'DELETE',
                  });
                  if (res.ok || res.status === 204) {
                    toast.success('Disconnected');
                    setConfirmOpen(false);
                    router.refresh();
                  } else {
                    toast.error('Could not disconnect');
                  }
                });
              }}
            >
              {deleting ? 'Disconnecting…' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
