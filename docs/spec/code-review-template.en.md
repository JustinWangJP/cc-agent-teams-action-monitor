# Code Review Template

**Target Version**: 2.1.0
**Last Updated**: 2026-02-24

---

Language: [日本語](code-review-template.md) | [English](code-review-template.en.md) | [中文](code-review-template.zh.md)

## Design Philosophy (Key Considerations for Review)

Please conduct reviews with an understanding of the project's key design principles.

### Real-time Update Implementation

- **HTTP polling** is adopted (not WebSocket)
- Polling interval: 5-60 seconds (default: 30 seconds)
- Controlled by TanStack Query's `refetchInterval` and `staleTime`

### Team Status Determination

Determined by session log mtime:
- `active`: mtime ≤ 1 hour
- `stopped`: mtime > 1 hour
- `unknown`: no session log
- `inactive`: no members

### Data Sources

| Data | Path |
|------|------|
| Team config | `~/.claude/teams/{team_name}/config.json` |
| Status determination | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` |
| Inbox | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` |
| Tasks | `~/.claude/tasks/{team_name}/{task_id}.json` |

---

## Review Target

- **PR/Commit**: #{number}
- **Author**: @username
- **Reviewer**: @qa-lead
- **Review Date**: YYYY-MM-DD

---

## Overview

| Item | Evaluation |
|------|------------|
| Overall Assessment | [Approve / Request Changes / Comment] |
| Test Coverage | XX% (Target: 80%) |
| Lint Errors | 0 / X errors |
| TypeScript Errors | 0 / X errors |

---

## Checklist Results

### Functionality

- [ ] Meets requirements
- [ ] Edge cases considered
- [ ] Appropriate error handling

### Code Quality

- [ ] High readability
- [ ] No duplication
- [ ] Appropriate abstraction

### Testing

- [ ] Sufficient unit tests
- [ ] Tests are readable
- [ ] Tests are independent

### Project-Specific

- [ ] No WebSocket references (uses HTTP polling)
- [ ] Team status determination implemented based on mtime
- [ ] File paths correctly reference under `~/.claude/`
- [ ] Polling-related hooks correctly set `staleTime` and `refetchInterval`

### Documentation

- [ ] Appropriate comments
- [ ] Changelog updated

---

## Detailed Feedback

### Strengths

- Implemented point 1
- Implemented point 2

### Suggestions

1. **File**: `path/to/file.ts:XX`
   - Content
   - Proposal: Specific improvement suggestion

2. **File**: `path/to/file.py:XX`
   - Content
   - Proposal: Specific improvement suggestion

### Required Changes

1. **File**: `path/to/file.ts:XX`
   - Issue: Description
   - Fix: Specific fix method

---

## Conclusion

[Approve] / [Request Changes]

### Additional Comments

Free text field
