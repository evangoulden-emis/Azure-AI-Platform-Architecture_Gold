#!/usr/bin/env python3
"""Fail-closed policy checks for a Terraform JSON plan."""
import json
import sys
from pathlib import Path

def fail(message):
    print(f"DENY: {message}", file=sys.stderr)
    return 1

if len(sys.argv) != 3:
    print("usage: check_plan.py PLAN.json ALLOWLIST.json", file=sys.stderr)
    sys.exit(2)

plan_path, allowlist_path = map(Path, sys.argv[1:])
if not plan_path.is_file() or not allowlist_path.is_file():
    sys.exit(fail("plan and allow-list files are mandatory"))

try:
    plan = json.loads(plan_path.read_text())
    rules = json.loads(allowlist_path.read_text())
    resources = plan["planned_values"]["root_module"].get("resources", [])
except (json.JSONDecodeError, KeyError, TypeError) as exc:
    sys.exit(fail(f"invalid or incomplete input: {exc}"))

def walk(module):
    yield from module.get("resources", [])
    for child in module.get("child_modules", []):
        yield from walk(child)

resources = list(walk(plan["planned_values"]["root_module"]))
if not resources:
    sys.exit(fail("plan contains no managed resources"))

approved_types = set(rules["approved_resource_types"])
approved_locations = set(rules["approved_locations"])
approved_envs = set(rules["approved_environments"])
private_types = set(rules["private_resource_types"])
denials = []

for resource in resources:
    if resource.get("mode", "managed") != "managed":
        continue
    rtype = resource.get("type")
    values = resource.get("values") or {}
    address = resource.get("address", "<unknown>")
    if rtype not in approved_types:
        denials.append(f"{address}: resource type {rtype!r} is not approved")
    location = values.get("location")
    if location and location.lower() not in approved_locations:
        denials.append(f"{address}: location {location!r} is not approved")
    tags = values.get("tags") or {}
    environment = str(tags.get("environment", "")).lower()
    if environment and environment not in approved_envs:
        denials.append(f"{address}: environment {environment!r} is not non-production")
    if any(token in environment for token in ("prod", "production")):
        denials.append(f"{address}: production-like environment is forbidden")
    if rtype in private_types:
        public_access = values.get("public_network_access_enabled", values.get("public_network_access"))
        if public_access not in (False, "Disabled"):
            denials.append(f"{address}: protected service must disable public network access")
    if rtype == "azurerm_storage_account":
        if values.get("shared_access_key_enabled") is not False:
            denials.append(f"{address}: shared-key authentication must be disabled")
    if rtype == "azurerm_cognitive_account" and values.get("local_auth_enabled") is not False:
        denials.append(f"{address}: local AI service authentication must be disabled")

if denials:
    for denial in denials:
        fail(denial)
    sys.exit(1)
print(f"ALLOW: {len(resources)} planned resources satisfy the non-production policy")