import { LicensingError } from "./errors";
import { verifySignedEntitlement } from "./entitlement";
import type { LicenseStore } from "./storage";
import {
  LICENSE_PROTOCOL_VERSION,
  type ApiResponse,
  type DeactivationResult,
  type LicenseGrant,
  type LicensingPolicy,
  type StoredLicense,
} from "./types";

export interface LicensingClientOptions {
  baseUrl: string;
  productSlug: string;
  installationId: string;
  platform: string;
  appVersion: string;
  store: LicenseStore;
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  nonce?: () => string;
}

export class LicensingClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly now: () => Date;
  private readonly nonce: () => string;
  private policy: LicensingPolicy | null = null;

  constructor(private readonly options: LicensingClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.now = options.now ?? (() => new Date());
    this.nonce = options.nonce ?? (() => globalThis.crypto.randomUUID());
  }

  async getPolicy() {
    if (this.policy) return this.policy;
    const response = await this.request<LicensingPolicy>(
      `/products/${encodeURIComponent(this.options.productSlug)}/licensing`,
      { method: "GET" },
    );
    this.policy = response;
    return response;
  }

  async activate(licenseKey: string, deviceName?: string) {
    const policy = await this.getPolicy();
    const grant = await this.request<LicenseGrant>("/licenses/activate", {
      method: "POST",
      body: JSON.stringify({
        ...this.requestContext(),
        licenseKey,
        deviceName,
      }),
    });
    if (!grant.activationToken) {
      throw new LicensingError("service_unavailable", "The activation response did not include a refresh credential.", {
        retryable: true,
      });
    }
    await this.verifyAndStore(grant, grant.activationToken, policy);
    return grant.entitlement;
  }

  async validate() {
    const stored = await this.requireStored();
    const policy = await this.getPolicy();
    const grant = await this.request<LicenseGrant>("/licenses/validate", {
      method: "POST",
      body: JSON.stringify({
        ...this.requestContext(),
        licenseId: stored.licenseId,
        activationToken: stored.activationToken,
      }),
    });
    await this.verifyAndStore(grant, stored.activationToken, policy);
    return grant.entitlement;
  }

  async refresh() {
    const stored = await this.requireStored();
    const policy = await this.getPolicy();
    const grant = await this.request<LicenseGrant>("/licenses/refresh", {
      method: "POST",
      body: JSON.stringify({
        ...this.requestContext(),
        licenseId: stored.licenseId,
        activationToken: stored.activationToken,
      }),
    });
    if (!grant.activationToken) {
      throw new LicensingError("service_unavailable", "The refresh response did not include a refresh credential.", {
        retryable: true,
      });
    }
    await this.verifyAndStore(grant, grant.activationToken, policy);
    return grant.entitlement;
  }

  async deactivate(reason?: string) {
    const stored = await this.requireStored();
    const result = await this.request<DeactivationResult>("/licenses/deactivate", {
      method: "POST",
      body: JSON.stringify({
        ...this.requestContext(),
        licenseId: stored.licenseId,
        activationToken: stored.activationToken,
        reason,
      }),
    });
    await this.options.store.remove(this.options.productSlug);
    return result;
  }

  async loadOffline() {
    const stored = await this.requireStored();
    return verifySignedEntitlement(stored.signedEntitlement, {
      publicKeySpki: stored.publicKeySpki,
      keyId: stored.signingKeyId,
      productSlug: this.options.productSlug,
      installationId: this.options.installationId,
      now: this.now(),
    });
  }

  private requestContext() {
    return {
      protocolVersion: LICENSE_PROTOCOL_VERSION,
      productSlug: this.options.productSlug,
      installationId: this.options.installationId,
      platform: this.options.platform,
      appVersion: this.options.appVersion,
      nonce: this.nonce(),
      timestamp: this.now().toISOString(),
    };
  }

  private async request<T>(path: string, init: RequestInit) {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          accept: "application/json",
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...init.headers,
        },
      });
    } catch (error) {
      throw new LicensingError("service_unavailable", "The licensing service could not be reached.", {
        retryable: true,
        cause: error,
      });
    }

    let envelope: ApiResponse<T>;
    try {
      envelope = await response.json() as ApiResponse<T>;
    } catch (error) {
      throw new LicensingError("service_unavailable", "The licensing service returned an unreadable response.", {
        retryable: true,
        cause: error,
      });
    }
    if (
      !envelope
      || typeof envelope !== "object"
      || envelope.protocolVersion !== LICENSE_PROTOCOL_VERSION
      || typeof envelope.requestId !== "string"
      || typeof envelope.ok !== "boolean"
    ) {
      throw new LicensingError("service_unavailable", "The licensing service returned an unsupported response.", {
        retryable: true,
      });
    }
    if (!envelope.ok) throw LicensingError.fromApi(envelope.error, envelope.requestId);
    return envelope.data;
  }

  private async verifyAndStore(grant: LicenseGrant, activationToken: string, policy: LicensingPolicy) {
    await verifySignedEntitlement(grant.signedEntitlement, {
      publicKeySpki: policy.signing.publicKeySpki,
      keyId: policy.signing.keyId,
      productSlug: this.options.productSlug,
      installationId: this.options.installationId,
      now: this.now(),
    });
    const stored: StoredLicense = {
      productSlug: this.options.productSlug,
      installationId: this.options.installationId,
      licenseId: grant.licenseId,
      activationToken,
      signedEntitlement: grant.signedEntitlement,
      signingKeyId: policy.signing.keyId,
      publicKeySpki: policy.signing.publicKeySpki,
      storedAt: this.now().toISOString(),
    };
    await this.options.store.save(stored);
  }

  private async requireStored() {
    const stored = await this.options.store.load(this.options.productSlug);
    if (!stored || stored.installationId !== this.options.installationId) {
      throw new LicensingError("invalid_activation", "No activation is stored for this installation.");
    }
    return stored;
  }
}

export function createInstallationId() {
  return globalThis.crypto.randomUUID();
}
