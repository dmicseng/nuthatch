import type { VendorAdapter } from './types';

const REGISTRY = new Map<string, VendorAdapter>();

export function registerAdapter(adapter: VendorAdapter): void {
  REGISTRY.set(adapter.vendorSlug, adapter);
}

export function getAdapter(vendorSlug: string): VendorAdapter | undefined {
  return REGISTRY.get(vendorSlug);
}

export function hasAdapter(vendorSlug: string): boolean {
  return REGISTRY.has(vendorSlug);
}

export function listAdapters(): VendorAdapter[] {
  return Array.from(REGISTRY.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}
