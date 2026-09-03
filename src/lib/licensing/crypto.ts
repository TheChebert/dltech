import { createCipheriv, createDecipheriv, createPrivateKey, createPublicKey, randomBytes, sign, verify } from "node:crypto";

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}
export function loadEd25519PrivateKey(value: string) {
  if (value.includes("BEGIN PRIVATE KEY")) return createPrivateKey(value);
  return createPrivateKey({ key: Buffer.from(value, "base64"), format: "der", type: "pkcs8" });
}
export function signCompactJws(payload: Record<string, unknown>, privateKeyValue: string, keyId: string) {
  const privateKey = loadEd25519PrivateKey(privateKeyValue);
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("Entitlement signing key must be Ed25519.");
  const header = base64UrlJson({ alg: "EdDSA", kid: keyId, typ: "DLT-ENTITLEMENT+jwt", v: 1 });
  const body = base64UrlJson(payload);
  const signingInput = header + "." + body;
  const signature = sign(null, Buffer.from(signingInput, "ascii"), privateKey).toString("base64url");
  return signingInput + "." + signature;
}

export function verifyCompactJws(token: string, publicKeyValue: string) {
  const [header, payload, signature, extra] = token.split(".");
  if (!header || !payload || !signature || extra) return false;
  const publicKey = publicKeyValue.includes("BEGIN PUBLIC KEY")
    ? createPublicKey(publicKeyValue)
    : createPublicKey({ key: Buffer.from(publicKeyValue, "base64"), format: "der", type: "spki" });
  return verify(null, Buffer.from(header + "." + payload, "ascii"), publicKey, Buffer.from(signature, "base64url"));
}

export function publicJwkFromPrivateKey(privateKeyValue: string, keyId: string) {
  const key = createPublicKey(loadEd25519PrivateKey(privateKeyValue));
  const jwk = key.export({ format: "jwk" });
  return { ...jwk, alg: "EdDSA", use: "sig", kid: keyId };
}

function decodeEncryptionKey(value: string) {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("License encryption key must be 32 base64-encoded bytes.");
  return key;
}

export function encryptLicenseKey(licenseKey: string, encryptionKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeEncryptionKey(encryptionKey), iv);
  const encrypted = Buffer.concat([cipher.update(licenseKey, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptLicenseKey(value: string, encryptionKey: string) {
  const [version, iv, authTag, encrypted, extra] = value.split(".");
  if (version !== "v1" || !iv || !authTag || !encrypted || extra) throw new Error("Invalid license ciphertext.");
  const decipher = createDecipheriv("aes-256-gcm", decodeEncryptionKey(encryptionKey), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
