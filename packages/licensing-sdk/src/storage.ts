import type { StoredLicense } from "./types";

export interface LicenseStore {
  load(productSlug: string): Promise<StoredLicense | null>;
  save(license: StoredLicense): Promise<void>;
  remove(productSlug: string): Promise<void>;
}

export class MemoryLicenseStore implements LicenseStore {
  private readonly licenses = new Map<string, StoredLicense>();

  async load(productSlug: string) {
    return this.licenses.get(productSlug) ?? null;
  }

  async save(license: StoredLicense) {
    this.licenses.set(license.productSlug, license);
  }

  async remove(productSlug: string) {
    this.licenses.delete(productSlug);
  }
}
