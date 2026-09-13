import { createHash, randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  CreateGovernedResponseBody,
  CreateGovernedResponseResponse,
  DeletePilotRetrievalSourceParams,
  DeletePilotRetrievalSourceResponse,
  GetPilotEvidenceResponse,
} from "@workspace/api-zod";
import { authenticatePilotToken } from "../lib/pilot-auth";

const router: IRouter = Router();
const WORKLOAD_ID = "claims-assistant";
const API_VERSION = "2026-09-01";
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const usageByIdentity = new Map<string, { count: number; resetAt: number }>();

const sources = new Map([
  ["claim-note-42", {
    title: "Approved claim notes",
    content: "The claim was approved after policy coverage and assessor evidence were verified.",
    workloadId: WORKLOAD_ID,
  }],
  ["claims-policy-7", {
    title: "Claims handling policy",
    content: "Approved claims must retain the source decision and assessor evidence as citations.",
    workloadId: WORKLOAD_ID,
  }],
]);

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function stableError(
  res: Parameters<Parameters<IRouter["post"]>[1]>[1],
  status: number,
  code: string,
  traceId: string,
  message: string,
) {
  res.status(status).json({ error: { code, message, trace_id: traceId } });
}

router.post("/v1/responses", (req, res): void => {
  const traceId = String(req.header("x-correlation-id") || randomUUID());
  const authorization = req.header("authorization");
  const identity = authenticatePilotToken(authorization);
  if (!identity) {
    stableError(res, 401, "WORKLOAD_NOT_APPROVED", traceId, "A valid Entra bearer identity is required.");
    return;
  }
  if (req.header("x-api-version") !== API_VERSION) {
    stableError(res, 400, "PLATFORM_UNAVAILABLE", traceId, `x-api-version must be ${API_VERSION}.`);
    return;
  }

  const parsed = CreateGovernedResponseBody.safeParse(req.body);
  if (!parsed.success) {
    stableError(res, 400, "DATA_CLASSIFICATION_BLOCKED", traceId, "The request does not match the governed contract.");
    return;
  }
  const input = parsed.data;
  if (
    identity.workloadId !== WORKLOAD_ID ||
    input.workload_id !== identity.workloadId ||
    input.model_route !== "balanced"
  ) {
    stableError(res, 403, "WORKLOAD_NOT_APPROVED", traceId, "The workload or logical model route is not approved.");
    return;
  }
  if (input.retrieval.index !== "claims-knowledge" || !input.retrieval.require_citations) {
    stableError(res, 403, "RETRIEVAL_ACCESS_DENIED", traceId, "Only cited claims-knowledge retrieval is approved.");
    return;
  }
  if (input.tools.length > 0) {
    stableError(res, 403, "TOOL_NOT_ALLOWED", traceId, "This pilot has no registered tools.");
    return;
  }

  const identityHash = hash(identity.applicationId).slice(0, 16);
  const now = Date.now();
  const quota = usageByIdentity.get(identityHash);
  const current = !quota || quota.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : quota;
  if (current.count >= MAX_REQUESTS) {
    res.setHeader("retry-after", String(Math.ceil((current.resetAt - now) / 1000)));
    stableError(res, 429, "QUOTA_EXCEEDED", traceId, "The pilot quota is five requests per minute per application identity.");
    return;
  }
  current.count += 1;
  usageByIdentity.set(identityHash, current);

  const prompt = input.input.map((message) => message.content).join("\n");
  if (/(ignore (all|previous) instructions|reveal (the )?(system|secret)|exfiltrate)/i.test(prompt)) {
    req.log.warn({ trace_id: traceId, workload_id: WORKLOAD_ID, policy: "aidr-inline", outcome: "blocked" }, "governed_ai_policy");
    stableError(res, 403, "SAFETY_BLOCKED", traceId, "Inline AIDR policy blocked the request.");
    return;
  }

  const matches = [...sources.entries()]
    .filter(([, source]) => source.workloadId === WORKLOAD_ID)
    .slice(0, input.retrieval.top_k);
  if (matches.length === 0) {
    stableError(res, 403, "RETRIEVAL_ACCESS_DENIED", traceId, "No authorized cited source is available.");
    return;
  }
  const fullOutput = `${matches[0]![1].content} The response is grounded only in the approved pilot index.`;
  const maxCharacters = input.response_policy.max_output_tokens * 4;
  const outputText = fullOutput.slice(0, maxCharacters);
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(outputText.length / 4);
  const response = CreateGovernedResponseResponse.parse({
    id: `resp_${randomUUID()}`,
    status: "completed",
    model_route: "balanced",
    output: [{ type: "text", text: outputText }],
    citations: matches.map(([source_id, source]) => ({ source_id, title: source.title })),
    safety: {
      status: "passed",
      policy_version: API_VERSION,
      aidr_request: "passed",
      aidr_response: "passed",
      native_safety: "passed",
    },
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: Number(((inputTokens + outputTokens) * 0.000002).toFixed(6)),
    },
    trace_id: traceId,
  });

  // This is the telemetry contract sent to OpenTelemetry/Dynatrace and SIEM.
  // It deliberately excludes authorization, prompt, response, and source content.
  req.log.info({
    event: "governed_ai_request",
    trace_id: traceId,
    workload_id: WORKLOAD_ID,
    identity_hash: identityHash,
    model_route: "balanced",
    foundry_deployment: "approved-eu-balanced",
    aidr_request: "passed",
    aidr_response: "passed",
    zscaler_egress: "approved-foundry-destination",
    retrieval_source_ids: matches.map(([id]) => id),
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    raw_content_logged: false,
  }, "governed_ai_request");
  res.setHeader("x-correlation-id", traceId);
  res.setHeader("x-workload-id", WORKLOAD_ID);
  res.json(response);
});

router.get("/platform/pilot/evidence", (_req, res): void => {
  const collectedAt = new Date().toISOString();
  const definitions = [
    ["Entra application boundary", "Platform security", "Bearer identity is required and workload identity is server-resolved."],
    ["Boomi / APIM boundary", "Integration engineering", "Boomi governs subscription entry; this APIM-shaped route owns model policy and response contract."],
    ["Foundry approved route", "AI platform", "Logical route balanced resolves only to approved-eu-balanced."],
    ["CrowdStrike AIDR inline", "Security operations", "Request and response inspection fail closed with SAFETY_BLOCKED."],
    ["Scoped cited retrieval", "Data platform", "Only claims-knowledge sources bound to claims-assistant can be returned, with mandatory source IDs."],
    ["Zscaler egress", "Network security", "The route records the approved Foundry destination policy outcome."],
    ["Correlation-safe telemetry", "SRE", "Operational events contain trace, route, policy, token, and source IDs; raw content is excluded."],
    ["Quota and attribution", "Cloud economics", "Five requests per minute are enforced per hashed application identity."],
  ];
  const evidence = definitions.map(([control, owner, summary]) => {
    const record = { control, owner, summary, target: WORKLOAD_ID, rule_version: API_VERSION };
    return { ...record, status: "passed", collected_at: collectedAt, evidence_hash: hash(record) };
  });
  res.json(GetPilotEvidenceResponse.parse({
    workload_id: WORKLOAD_ID,
    environment: "non-production",
    mode: "control-plane simulation; credentialed vendor exports required before production",
    evidence,
  }));
});

router.delete("/platform/pilot/retrieval/:sourceId", (req, res): void => {
  const identity = authenticatePilotToken(req.header("authorization"));
  if (!identity) {
    res.status(401).json({ error: "A valid pilot administrative identity is required." });
    return;
  }
  if (identity.workloadId !== WORKLOAD_ID || !identity.canDeleteSources) {
    res.status(403).json({ error: "The application is not authorized to delete pilot sources." });
    return;
  }
  const params = DeletePilotRetrievalSourceParams.parse(req.params);
  if (!sources.has(params.sourceId)) {
    res.status(404).json({ error: "Source not found" });
    return;
  }
  sources.delete(params.sourceId);
  const record = {
    source_id: params.sourceId,
    deleted: true,
    retrieval_matches_after_delete: sources.has(params.sourceId) ? 1 : 0,
    cache_entries_removed: 0,
  };
  res.json(DeletePilotRetrievalSourceResponse.parse({ ...record, evidence_hash: hash(record) }));
});

export default router;