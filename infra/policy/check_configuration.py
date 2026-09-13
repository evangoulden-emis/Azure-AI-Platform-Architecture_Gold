#!/usr/bin/env python3
"""Reject unapproved Terraform services and environment compositions in CI."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]
RULES = json.loads((ROOT / "policy" / "allowlist.json").read_text())
approved_types = set(RULES["approved_resource_types"])
approved_environments = set(RULES["approved_environments"])
denials = []

environment_root = ROOT / "environments"
for entry in environment_root.iterdir():
    if entry.is_dir() and entry.name not in approved_environments:
        denials.append(f"environment composition {entry.name!r} is not approved")

resource_pattern = re.compile(r'^\s*resource\s+"([^"]+)"', re.MULTILINE)
for terraform_file in ROOT.rglob("*.tf"):
    if ".terraform" in terraform_file.parts:
        continue
    content = terraform_file.read_text()
    for resource_type in resource_pattern.findall(content):
        if resource_type not in approved_types:
            denials.append(
                f"{terraform_file.relative_to(ROOT)}: resource type "
                f"{resource_type!r} is not approved"
            )
    if re.search(
        r'environment\s*=\s*"(prod|production)"',
        content,
        flags=re.IGNORECASE,
    ):
        denials.append(
            f"{terraform_file.relative_to(ROOT)}: production target is forbidden"
        )

if denials:
    for denial in denials:
        print(f"DENY: {denial}", file=sys.stderr)
    sys.exit(1)

print("ALLOW: Terraform configuration uses approved services and environments")