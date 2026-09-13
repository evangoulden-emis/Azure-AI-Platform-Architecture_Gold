#!/usr/bin/env python3
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent
CHECK = ROOT / "check_plan.py"
RULES = ROOT / "allowlist.json"

def plan(resource):
    return {"planned_values": {"root_module": {"resources": [resource]}}}

def run(payload):
    with tempfile.NamedTemporaryFile("w", suffix=".json") as handle:
        json.dump(payload, handle)
        handle.flush()
        return subprocess.run(
            ["python3", str(CHECK), handle.name, str(RULES)],
            text=True, capture_output=True
        )

allowed = run(plan({
    "address": "azurerm_storage_account.good",
    "mode": "managed",
    "type": "azurerm_storage_account",
    "values": {
        "location": "uksouth",
        "public_network_access_enabled": False,
        "shared_access_key_enabled": False,
        "tags": {"environment": "dev"}
    }
}))
assert allowed.returncode == 0, allowed.stderr

for bad in [
    plan({"address": "azurerm_linux_virtual_machine.bad", "type": "azurerm_linux_virtual_machine", "values": {"location": "uksouth", "tags": {"environment": "dev"}}}),
    plan({"address": "azurerm_storage_account.bad", "type": "azurerm_storage_account", "values": {"location": "eastus", "public_network_access_enabled": False, "shared_access_key_enabled": False, "tags": {"environment": "dev"}}}),
    plan({"address": "azurerm_storage_account.bad", "type": "azurerm_storage_account", "values": {"location": "uksouth", "public_network_access_enabled": True, "shared_access_key_enabled": True, "tags": {"environment": "production"}}})
]:
    denied = run(bad)
    assert denied.returncode != 0, denied.stdout

print("policy fixtures passed")