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
    name: "Model gateway",
    description:
      "A governed model access layer that keeps applications independent from provider-specific APIs.",
    status: "Design in progress",
    owner: "AI platform",
    services: ["Azure OpenAI", "APIM", "Content safety"],
    readiness: 58,
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
    name: "Integration runtime",
    description:
      "Serverless workflows and enterprise integration contracts for repeatable AI application delivery.",
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
      "Prompt and model telemetry, audit trails, threat detection, and operational feedback loops.",
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
    name: "Model and prompt guardrails",
    category: "AI safety",
    description:
      "Content safety, prompt filtering, sensitive data redaction, and model allow-listing apply centrally.",
    status: "Draft",
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
      "Ship the reference architecture, Entra patterns, APIM gateway contract, and IaC module baseline.",
    status: "In progress",
    horizon: "0–90 days",
    owner: "AI platform",
    dependencies: ["Security control baseline", "Model provider shortlist"],
  },
  {
    id: "phase-2",
    phase: "02",
    title: "Prove a governed workload",
    description:
      "Deliver one production-shaped use case with retrieval, evaluation, telemetry, and a clear rollback path.",
    status: "Next",
    horizon: "90–180 days",
    owner: "Product engineering",
    dependencies: ["Paved road", "Approved data domain"],
  },
  {
    id: "phase-3",
    phase: "03",
    title: "Open self-service to teams",
    description:
      "Publish golden-path templates, onboarding checks, quota policies, and reusable prompt and evaluation assets.",
    status: "Planned",
    horizon: "6–12 months",
    owner: "Developer platform",
    dependencies: ["Pilot learnings", "FinOps telemetry"],
  },
];

const initialDecisions = [
  {
    id: "model-gateway",
    title: "Use a central model gateway",
    area: "Model access",
    recommendation:
      "Expose model access through a versioned APIM contract instead of direct provider calls from product teams.",
    rationale:
      "Keeps provider changes, safety controls, quotas, cost attribution, and residency policy in one place.",
    status: "Proposed",
    owner: "AI platform",
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
    platformName: "Northstar AI Platform",
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
  const rows = await db.select().from(architectureDecisionsTable);
  if (rows.length === 0) {
    await db.insert(architectureDecisionsTable).values(initialDecisions);
    const seeded = await db.select().from(architectureDecisionsTable);
    res.json(ListArchitectureDecisionsResponse.parse(seeded));
    return;
  }
  res.json(ListArchitectureDecisionsResponse.parse(rows));
});

router.patch("/platform/decisions/:decisionId", async (req, res) => {
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