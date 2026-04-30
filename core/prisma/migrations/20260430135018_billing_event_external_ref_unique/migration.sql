-- AlterTable: enforce uniqueness of (service_id, external_ref) so adapters can
-- safely re-sync overlapping date ranges without creating duplicate events.
-- Manual events with NULL external_ref are not constrained because Postgres
-- treats NULLs as distinct from each other (and from any other value).
CREATE UNIQUE INDEX "billing_events_service_external_ref_unique"
ON "billing_events" ("service_id", "external_ref");
