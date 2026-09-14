import { Router, type IRouter } from "express";
import {
  GetPlatformOverviewResponse,
  ListArchitectureDecisionsResponse,
  ListPlatformCapabilitiesResponse,
  ListPlatformControlsResponse,
  ListPlatformRoadmapResponse,
  UpdateArchitectureDecisionBody,
  UpdateArchitectureDecisionParams,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { architectureDecisionsTable } from "@workspace/db";
import { authenticatePilotToken } from "../lib/pilot-auth";

const router: IRouter = Router();

const capabilities = [
  {
    id: "identity-policy",
    name: "Identity & policy",
    description:
      "Entra-backed access, managed identities, workload isolation, and APIM policy enforcement.",
    status: "Ready to standardise",
    owner: "Platform security",
    services: ["Entra ID", "Managed identity", "APIM"],
    readiness: 82,
    accent: "violet",
  },
  {
    id: "model-gateway",
    name: "AI serving gateway",
    description:
      "APIM provides the token-aware AI policy boundary in front of Azure AI Foundry models and agents.",
    status: "Strategic direction set",
    owner: "AI platform",
    services: ["Azure AI Foundry", "APIM AI gateway", "CrowdStrike AIDR"],
    readiness: 68,
    accent: "cyan",
  },
  {
    id: "data-retrieval",
    name: "Data & retrieval",
    description:
      "Region-bound source content, metadata, embeddings, and retrieval with clear data ownership.",
    status: "Architecture decision needed",
    owner: "Data platform",
    services: ["ADLS Gen2", "Azure AI Search", "Key Vault"],
    readiness: 46,
    accent: "amber",
  },
  {
    id: "integration-runtime",
    name: "Integration & runtime",
    description:
      "Boomi governs enterprise integration entry while Azure serverless runtimes execute AI workflows.",
    status: "Ready to pilot",
    owner: "Integration engineering",
    services: ["Functions", "Durable Functions", "Boomi"],
    readiness: 71,
    accent: "emerald",
  },
  {
    id: "trust-operations",
    name: "Trust & operations",
    description:
      "AIDR inspection, Zscaler egress policy, Dynatrace telemetry, audit trails, and operational feedback.",
    status: "Control mapping",
    owner: "Security operations",
    services: ["Dynatrace", "CrowdStrike AIDR", "Zscaler"],
    readiness: 63,
    accent: "rose",
  },
  {
    id: "developer-enablement",
    name: "Developer enablement",
    description:
      "Golden paths, IaC modules, environment promotion, and self-service onboarding for product teams.",
    status: "Planned",
    owner: "Developer platform",
    services: ["Terraform", "CI/CD", "Service catalogue"],
    readiness: 39,
    accent: "blue",
  },
];

const controls = [
  {
    id: "uk-eu-residency",
    name: "UK / Europe residency",
    category: "Data boundary",
    description:
      "Prompts, source data, embeddings, logs, and backups stay inside the approved geography.",
    status: "In review",
    owner: "Data protection",
    evidence: "Region policy and service allow-list",
  },
  {
    id: "entra-authz",
    name: "Entra workload authorization",
    category: "Identity",
    description:
      "Every workload uses managed identity and least-privilege access to platform services.",
    status: "Defined",
    owner: "Platform security",
    evidence: "RBAC matrix and identity patterns",
  },
  {
    id: "model-guardrails",
    name: "Independent AI guardrails",
    category: "AI safety",
    description:
      "CrowdStrike AIDR runs inline at the AI gateway alongside native content safety, redaction, and model allow-listing.",
    status: "Direction defined",
    owner: "Responsible AI",
    evidence: "Gateway policy catalogue",
  },
  {
    id: "observability",
    name: "End-to-end observability",
    category: "Operations",
    description:
      "Trace the user request, retrieval context, model call, policy decisions, and outcome.",
    status: "Mapped",
    owner: "SRE",
    evidence: "OpenTelemetry and Dynatrace design",
  },
  {
    id: "cost-controls",
    name: "Cost and quota controls",
    category: "FinOps",
    description:
      "Budgets, quotas, per-team attribution, and rate limits prevent uncontrolled model spend.",
    status: "Planned",
    owner: "Cloud economics",
    evidence: "Usage metering specification",
  },
];

const roadmap = [
  {
    id: "phase-1",
    phase: "01",
    title: "Establish the paved road",
    description:
      "Confirm ownership and governance intake, then create the Terraform baseline for APIM and Azure AI Foundry.",
    status: "In progress",
    horizon: "Days 0–30",
    owner: "AI platform",
    dependencies: ["Platform ownership", "Boomi / APIM boundary"],
  },
  {
    id: "phase-2",
    phase: "02",
    title: "Prove a governed workload",
    description:
      "Deploy non-production AIDR guardrails, pilot use cases, evaluation, telemetry, and the temporary AWS adapter.",
    status: "Next",
    horizon: "Days 31–60",
    owner: "Product engineering",
    dependencies: ["Paved road", "Approved data domain"],
  },
  {
    id: "phase-3",
    phase: "03",
    title: "Open self-service to teams",
    description:
      "Move approved pilots to production and complete telemetry, registry, catalogue, and onboarding governance.",
    status: "Planned",
    horizon: "Days 61–90",
    owner: "Developer platform",
    dependencies: ["Pilot learnings", "FinOps telemetry"],
  },
];

const initialDecisions = [
  {
    id: "model-gateway",
    title: "Use APIM as the AI-serving gateway",
    area: "Model access",
    recommendation:
      "Expose Azure AI Foundry models and agents through a versioned APIM AI gateway contract instead of direct calls.",
    rationale:
      "Keeps token-aware policy, AIDR inspection, quotas, routing, cost attribution, and safety enforcement in one place.",
    status: "Accepted",
    owner: "AI platform",
  },
  {
    id: "boomi-apim-boundary",
    title: "Define the Boomi and APIM boundary",
    area: "API & integration",
    recommendation:
      "Use Boomi for enterprise integration entry and orchestration, with APIM owning the AI-serving and model-policy boundary.",
    rationale:
      "Preserves the enterprise integration fabric without duplicating APIM's token-aware AI routing and guardrail role.",
    status: "Needs review",
    owner: "Integration engineering",
  },
  {
    id: "retrieval-service",
    title: "Standardise retrieval as a platform capability",
    area: "Data & retrieval",
    recommendation:
      "Offer a governed ingestion and search path before teams create bespoke vector stores.",
    rationale:
      "Improves data ownership, deletion handling, quality measurement, and regional isolation.",
    status: "Needs review",
    owner: "Data platform",
  },
  {
    id: "iac-standard",
    title: "Adopt reusable IaC modules",
    area: "Repeatability",
    recommendation:
      "Use a small set of versioned Terraform modules with opinionated environment composition.",
    rationale:
      "Makes the platform repeatable for new teams without turning every application into a bespoke cloud build.",
    status: "Accepted",
    owner: "Cloud engineering",
  },
];

router.get("/platform/overview", async (_req, res) => {
  const data = GetPlatformOverviewResponse.parse({
    platformName: "enlivio AI Platform",
    environment: "Azure · UK South / EU West",
    regionPolicy: "UK / Europe only",
    readinessScore: 61,
    activeUsers: 12,
    capabilityCount: capabilities.length,
    controlCount: controls.length,
    roadmapCount: roadmap.length,
    nextMilestone: "Approve the model gateway contract",
    lastReviewed: "13 Sep 2026",
  });
  res.json(data);
});

router.get("/platform/capabilities", (_req, res) => {
  res.json(ListPlatformCapabilitiesResponse.parse(capabilities));
});

router.get("/platform/controls", (_req, res) => {
  res.json(ListPlatformControlsResponse.parse(controls));
});

router.get("/platform/roadmap", (_req, res) => {
  res.json(ListPlatformRoadmapResponse.parse(roadmap));
});

router.get("/platform/decisions", async (_req, res) => {
  await db
    .insert(architectureDecisionsTable)
    .values(initialDecisions)
    .onConflictDoNothing();
  const rows = await db.select().from(architectureDecisionsTable);
  const definitions = new Map(initialDecisions.map((decision) => [decision.id, decision]));
  const current = rows.map((row) => {
    const definition = definitions.get(row.id);
    return definition
      ? { ...row, ...definition, status: row.status, updatedAt: row.updatedAt }
      : row;
  });
  res.json(ListArchitectureDecisionsResponse.parse(current));
});

router.patch("/platform/decisions/:decisionId", async (req, res) => {
  const identity = authenticatePilotToken(req.header("authorization"));
  if (!identity) {
    res.status(401).json({ error: "A valid bearer identity is required" });
    return;
  }
  if (!identity.canUpdateArchitectureDecisions) {
    res.status(403).json({ error: "Architecture decision update permission is required" });
    return;
  }

  const params = UpdateArchitectureDecisionParams.parse(req.params);
  const body = UpdateArchitectureDecisionBody.parse(req.body);
  const [updated] = await db
    .update(architectureDecisionsTable)
    .set({ status: body.status, updatedAt: new Date() })
    .where(eq(architectureDecisionsTable.id, params.decisionId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Architecture decision not found" });
    return;
  }

  res.json(updated);
});

export default router;