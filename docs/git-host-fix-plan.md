# Git-Host Fix Plan — Local Bare Repo Fragility

**Owner:** CTO · **Status:** Awaiting CEO approval (no infra change without it) · **Date:** 2026-09-27

## 1. What happened

The project's `origin` was historically a **local bare repository** at `file:///repos/lokarta.git`, owned by the agent user (`node`). During a root-run process window (2026-09-27 05:14–05:18), 19 of the `objects/<xx>/` fanout directories were created **root-owned**, so `node` could no longer write loose objects that hash into those shards. A push then failed deterministically with:

```text
remote: error: unable to migrate objects to permanent storage
```

This is fully documented in [`environment-notes.md` §5](environment-notes.md) and [LIV-31](/LIV/issues/LIV-31)'s commit `2741fd1`.

## 2. Current workaround (non-destructive, reversible)

Keep incoming pushes as packfiles in the agent-writable `objects/pack/` instead of exploding them into loose fanout dirs:

```sh
git -C /repos/lokarta.git config receive.unpackLimit 1
```

Revert:

```sh
git -C /repos/lokarta.git config --unset receive.unpackLimit
```

## 3. Current state (verified this run)

- `git remote -v` → `origin = https://github.com/jpeckenpaugh/lokarta-v3` (GitHub-hosted).
- `git ls-remote --heads origin` → `3dbf9ad… refs/heads/main` — GitHub reachable via managed credentials.
- `/repos/` does not exist on this host: the local bare repo has been decommissioned and the remote migrated to GitHub.

**Consequence:** the root-owned-object-dir fragility no longer affects the canonical repo. It only resurfaces if we re-host `origin` on a local bare repo.

## 4. Permanent fix (requires root/admin — NOT runnable from an agent)

If local bare hosting is ever reinstated (or for any future local bare repo), the fix is:

```sh
chown -R node:1003 /repos/lokarta.git/objects
```

Then remove the workaround:

```sh
git -C /repos/lokarta.git config --unset receive.unpackLimit
```

**Safety rules (unchanged):** do **not** `rm` / `chown` / `chmod` the root-owned directories from an agent run. `chown` on another user's objects is a root-level, cross-owner mutation and must be executed by the operator/admin with root, outside the agent sandbox.

## 5. Proposed decision for the CEO

1. **Confirm GitHub is canonical** (`jpeckenpaugh/lokarta-v3`) and close out the local bare-repo path — the recommended option; no further infra action.
2. **If local bare hosting must remain**, authorize the operator to run the `chown -R node:1003 /repos/lokarta.git/objects` step, after which the `receive.unpackLimit` workaround is removed.

## 6. Rollback path

- Nothing here mutates the canonical repo or GitHub. The workaround is a single `git config` key and is trivially reversible (`--unset`). The permanent fix is a one-line `chown`; its rollback is re-owning the directories back to `root` if a root-run process must resume.

## 7. Acceptance criteria

- CEO picks option 1 or 2 (recorded on this issue).
- No `chown`/`rm` is executed from any agent run.
- If option 2: `receive.unpackLimit` is unset only after the `chown` completes, and a sample push is verified end-to-end.
