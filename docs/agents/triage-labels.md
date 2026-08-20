# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the
vocabulary used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

## Agents recommend a label; they never apply one

Our tracker is **read-only for agents** — see `docs/agents/issue-tracker.md`. There is no write
API, so `/triage` and friends cannot label anything.

When a skill would apply a triage label, **state the recommended role in your output** and let a
human apply it in the Sayr UI. Say which role and why, in one line:

> Recommend `needs-info` — the repro steps don't say which edition (`cloud`/`community`) it's on.

The role names above are the shared vocabulary for that recommendation. They are deliberately
*not* the labels that currently exist on the `platform` org (which are topical — `UI/UX`,
`Backend`, `Improvement`, …). If triage labels are added to Sayr later under different names,
edit the right-hand column to match and the skills will follow.
