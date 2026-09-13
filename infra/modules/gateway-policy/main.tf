variable "api_management_name" { type = string }
variable "resource_group_name" { type = string }
variable "api_name" { type = string }
variable "gateway_client_id" { type = string }
variable "tenant_id" { type = string }
variable "backend_identity_client_id" { type = string }
variable "aidr_inspection_url" { type = string }
variable "model_route_deployments" { type = map(string) }
variable "workloads" {
  type = map(object({
    client_id         = string
    classification    = string
    model_routes      = list(string)
    retrieval_indexes = list(string)
    quota_per_minute  = number
  }))
}

locals {
  workload_branches = join("\n", [
    for workload_id, workload in var.workloads : <<-XML
      <when condition="@(((Jwt)context.Variables[&quot;jwt&quot;]).Claims.GetValueOrDefault(&quot;azp&quot;, new string[] {})[0] == &quot;${workload.client_id}&quot;)">
        <set-header name="x-workload-id" exists-action="override"><value>${workload_id}</value></set-header>
        <set-header name="x-data-classification" exists-action="override"><value>${workload.classification}</value></set-header>
        <choose>
          <when condition="@((string)context.Request.Body.As&lt;JObject&gt;(preserveContent: true)[&quot;workload_id&quot;] != &quot;${workload_id}&quot;)">
            <return-response><set-status code="403" reason="WORKLOAD_NOT_APPROVED" /></return-response>
          </when>
          <when condition="@(!new [] { ${join(", ", [for route in workload.model_routes : "&quot;${route}&quot;"])} }.Contains((string)context.Request.Body.As&lt;JObject&gt;(preserveContent: true)[&quot;model_route&quot;]))">
            <return-response><set-status code="503" reason="MODEL_ROUTE_UNAVAILABLE" /></return-response>
          </when>
          <when condition="@(!string.IsNullOrEmpty((string)context.Request.Body.As&lt;JObject&gt;(preserveContent: true)[&quot;retrieval&quot;]?[&quot;index&quot;]) &amp;&amp; !new [] { ${join(", ", [for index in workload.retrieval_indexes : "&quot;${index}&quot;"])} }.Contains((string)context.Request.Body.As&lt;JObject&gt;(preserveContent: true)[&quot;retrieval&quot;]?[&quot;index&quot;]))">
            <return-response><set-status code="403" reason="RETRIEVAL_ACCESS_DENIED" /></return-response>
          </when>
        </choose>
        <rate-limit-by-key calls="${workload.quota_per_minute}" renewal-period="60" counter-key="${workload.client_id}" />
      </when>
    XML
  ])
  route_branches = join("\n", [
    for route, deployment in var.model_route_deployments : <<-XML
      <when condition="@((string)context.Request.Body.As&lt;JObject&gt;(preserveContent: true)[&quot;model_route&quot;] == &quot;${route}&quot;)">
        <set-variable name="logicalModelRoute" value="${route}" />
        <set-variable name="modelDeployment" value="${deployment}" />
      </when>
    XML
  ])
}

resource "azurerm_api_management_api_policy" "this" {
  api_name            = var.api_name
  api_management_name = var.api_management_name
  resource_group_name = var.resource_group_name
  xml_content         = <<XML
<policies>
  <inbound>
    <base />
    <validate-jwt header-name="Authorization" failed-validation-httpcode="401" require-expiration-time="true" require-scheme="Bearer" output-token-variable-name="jwt">
      <openid-config url="https://login.microsoftonline.com/${var.tenant_id}/v2.0/.well-known/openid-configuration" />
      <audiences><audience>${var.gateway_client_id}</audience></audiences>
      <required-claims><claim name="roles" match="any"><value>gateway.invoke</value></claim></required-claims>
    </validate-jwt>
    <check-header name="x-api-version" failed-check-httpcode="400" failed-check-error-message="Unsupported API version" ignore-case="false">
      <value>2026-09-01</value>
    </check-header>
    <set-header name="x-correlation-id" exists-action="skip"><value>@(Guid.NewGuid().ToString())</value></set-header>
    <choose>
      ${local.workload_branches}
      <otherwise><return-response><set-status code="403" reason="WORKLOAD_NOT_APPROVED" /></return-response></otherwise>
    </choose>
    <choose>
      ${local.route_branches}
      <otherwise><return-response><set-status code="503" reason="MODEL_ROUTE_UNAVAILABLE" /></return-response></otherwise>
    </choose>
    <send-request mode="new" response-variable-name="aidrResponse" timeout="10" ignore-error="false">
      <set-url>${var.aidr_inspection_url}</set-url>
      <set-method>POST</set-method>
      <set-header name="x-aidr-direction" exists-action="override"><value>input</value></set-header>
      <set-header name="x-correlation-id" exists-action="override"><value>@((string)context.Request.Headers.GetValueOrDefault("x-correlation-id", ""))</value></set-header>
      <set-body>@(context.Request.Body.As&lt;string&gt;(preserveContent: true))</set-body>
    </send-request>
    <choose>
      <when condition="@(((IResponse)context.Variables[&quot;aidrResponse&quot;]).StatusCode != 204)">
        <return-response><set-status code="403" reason="SAFETY_BLOCKED" /></return-response>
      </when>
    </choose>
    <set-body>@{
      var request = context.Request.Body.As&lt;JObject&gt;(preserveContent: true);
      return new JObject(
        new JProperty("messages", request["input"]),
        new JProperty("max_tokens", request["response_policy"]?["max_output_tokens"] ?? 800)
      ).ToString();
    }</set-body>
    <rewrite-uri template="@(&quot;/openai/deployments/&quot; + (string)context.Variables[&quot;modelDeployment&quot;] + &quot;/chat/completions?api-version=2024-10-21&quot;)" />
    <authentication-managed-identity resource="https://cognitiveservices.azure.com" client-id="${var.backend_identity_client_id}" />
  </inbound>
  <backend><base /></backend>
  <outbound>
    <base />
    <send-request mode="new" response-variable-name="aidrOutputResponse" timeout="10" ignore-error="false">
      <set-url>${var.aidr_inspection_url}</set-url>
      <set-method>POST</set-method>
      <set-header name="x-aidr-direction" exists-action="override"><value>output</value></set-header>
      <set-body>@(context.Response.Body.As&lt;string&gt;(preserveContent: true))</set-body>
    </send-request>
    <choose>
      <when condition="@(((IResponse)context.Variables[&quot;aidrOutputResponse&quot;]).StatusCode != 204)">
        <return-response><set-status code="503" reason="SAFETY_BLOCKED" /></return-response>
      </when>
    </choose>
    <set-body>@{
      var response = context.Response.Body.As&lt;JObject&gt;(preserveContent: true);
      return new JObject(
        new JProperty("id", response["id"]),
        new JProperty("status", "completed"),
        new JProperty("model_route", context.Variables["logicalModelRoute"]),
        new JProperty("output", new JArray(new JObject(new JProperty("type", "text"), new JProperty("text", response["choices"]?[0]?["message"]?["content"])))),
        new JProperty("citations", new JArray()),
        new JProperty("safety", new JObject(new JProperty("status", "passed"), new JProperty("policy_version", "2026-09-01"))),
        new JProperty("usage", response["usage"]),
        new JProperty("trace_id", context.Request.Headers.GetValueOrDefault("x-correlation-id", ""))
      ).ToString();
    }</set-body>
  </outbound>
  <on-error><base /></on-error>
</policies>
XML
}