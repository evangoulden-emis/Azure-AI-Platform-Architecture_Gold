import { createHmac, timingSafeEqual } from "node:crypto";

const ISSUER = "https://login.microsoftonline.com/northstar-pilot/v2.0";
const AUDIENCE = "api://northstar-ai-gateway";

type PilotClaims = {
  iss: string;
  aud: string;
  azp: string;
  exp: number;
  roles: string[];
};

export type PilotIdentity = {
  applicationId: string;
  workloadId: string;
  canDeleteSources: boolean;
};

const applicationRegistry: Record<string, Omit<PilotIdentity, "applicationId">> = {
  "claims-assistant-pilot-app": {
    workloadId: "claims-assistant",
    canDeleteSources: false,
  },
  "claims-assistant-pilot-admin": {
    workloadId: "claims-assistant",
    canDeleteSources: true,
  },
};

function secret(): string {
  const value = process.env["SESSION_SECRET"];
  if (!value || value.length < 16) {
    throw new Error("SESSION_SECRET of at least 16 characters is required for pilot token validation.");
  }
  return value;
}

function sign(value: string): Buffer {
  return createHmac("sha256", secret()).update(value).digest();
}

function decodePart<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

export function authenticatePilotToken(authorization: string | undefined): PilotIdentity | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  const [encodedHeader, encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra) return null;

  try {
    const header = decodePart<{ alg?: string; typ?: string }>(encodedHeader);
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const supplied = Buffer.from(encodedSignature, "base64url");
    const expected = sign(`${encodedHeader}.${encodedPayload}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

    const claims = decodePart<PilotClaims>(encodedPayload);
    if (
      claims.iss !== ISSUER ||
      claims.aud !== AUDIENCE ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Math.floor(Date.now() / 1000) ||
      !Array.isArray(claims.roles)
    ) return null;
    const registration = applicationRegistry[claims.azp];
    if (!registration || !claims.roles.includes("AI.Invoke")) return null;
    return {
      applicationId: claims.azp,
      workloadId: registration.workloadId,
      canDeleteSources:
        registration.canDeleteSources && claims.roles.includes("Pilot.Source.Delete"),
    };
  } catch {
    return null;
  }
}

// Test-only token issuer for the non-production harness. Production uses Entra
// signing keys and standard JWT validation at APIM rather than this issuer.
export function issuePilotToken(
  applicationId: keyof typeof applicationRegistry,
  roles: string[],
  expiresInSeconds = 300,
): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Pilot tokens cannot be issued in production.");
  }
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: ISSUER,
    aud: AUDIENCE,
    azp: applicationId,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    roles,
  })).toString("base64url");
  return `${header}.${payload}.${sign(`${header}.${payload}`).toString("base64url")}`;
}