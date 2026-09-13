---
name: Fixed navigation layout
description: A reusable layout lesson for full-height desktop navigation shells.
---

Full-height desktop navigation should be removed from normal document flow when the main workspace is intended to share the first viewport; otherwise a min-height sidebar pushes all primary content below the fold.

**Why:** A visually correct sidebar can conceal a blank-looking workspace when it remains a normal-flow sibling with viewport height.

**How to apply:** Use a pinned navigation layer and reserve its width in the content column; keep mobile navigation in normal responsive flow.