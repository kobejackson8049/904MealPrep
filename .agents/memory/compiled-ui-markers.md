---
name: Compiled UI marker checks
description: A lightweight way to catch source, generated bundle, and preview drift during frontend work.
---

When a live preview appears not to reflect a recent frontend change, verify a distinctive changed UI string in both the source and compiled bundle before trusting screenshots.

**Why:** Hot reload, cached preview state, and partially updated generated output can make a visual check look older than the source being edited.

**How to apply:** Choose a unique user-facing marker from the change, search source and the latest build output for it, then restart the managed workflow and repeat the visual check.