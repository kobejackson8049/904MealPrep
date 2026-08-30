---
name: Artifact workflow port recovery
description: A managed Vite artifact can retain an orphaned listener after a failed restart.
---

When a managed artifact reports that its configured port is already in use, inspect and clear the orphaned process before changing artifact routing or adding another workflow.

**Why:** The 904 Meal Prepz workflow had a healthy Vite process left behind after a restart attempt, so the next managed start failed even though the code and port configuration were correct.

**How to apply:** Follow the port-debugging guidance: inspect listeners, stop only the stale process for the affected artifact, then restart the exact managed workflow once.