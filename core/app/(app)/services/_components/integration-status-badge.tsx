import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export function IntegrationStatusBadge({
  serviceId,
  hasCredential,
  hasError,
}: {
  serviceId: string;
  hasCredential: boolean;
  hasError: boolean;
}) {
  const href = `/services/${serviceId}/integrations`;

  if (!hasCredential) {
    return (
      <Link href={href} className="text-muted-foreground inline-flex">
        <Badge variant="outline" className="text-xs">
          Manual
        </Badge>
      </Link>
    );
  }
  if (hasError) {
    return (
      <Link href={href} className="inline-flex">
        <Badge variant="destructive" className="text-xs">
          Sync error
        </Badge>
      </Link>
    );
  }
  return (
    <Link href={href} className="inline-flex">
      <Badge className="text-xs">Connected</Badge>
    </Link>
  );
}
