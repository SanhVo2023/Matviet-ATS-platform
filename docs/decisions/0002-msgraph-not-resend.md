# 0002 — MS Graph for outbound + inbound + calendar; reject Resend

**Date:** 2026-04-21
**Status:** Accepted
**Decision-makers:** Sanh Võ + Claude

## Context

Mắt Việt uses Office 365 (every employee has a license). We need outbound recruitment email, inbound CV polling from a shared mailbox, and Outlook calendar events with Teams meeting links. Two viable provider paths: Microsoft Graph (Office 365 native) or Resend (modern transactional email API).

## Decision

**Use Microsoft Graph for ALL email + calendar operations.** Don't add Resend.

## Alternatives considered

- **Resend (outbound only) + MS Graph (inbox + calendar)** — better outbound DX (delivery/open/click webhooks, simpler API). **DEALBREAKER:** when a candidate replies to a Resend-sent email, the reply doesn't land in `hr@matviet.com.vn` — Resend's inbound is webhook-only with metadata-not-body, and HR uses Outlook as their CRM. Reply threading would break.
- **Resend only** — abandons inbox polling and calendar; we'd need Cloudflare Email Routing or similar. Loses too much.
- **Custom SMTP** — no inbox API at all; email-only.

## Consequences

- **Pro:**
  - Sender identity unambiguous: `hr@matviet.com.vn` (real company domain)
  - Free (within existing O365 license)
  - Native reply threading in Outlook
  - Single Azure AD app registration covers send + receive + calendar
  - Inbox polling for inbound CVs (forwarded from TopCV) is native
  - Teams meeting links auto-generated via `isOnlineMeeting: true`
- **Con:**
  - Graph confirms send-success only — no built-in delivery/open/click tracking. Acceptable for ≤5 outbound/day at our scale.
  - More complex auth (Azure AD app + ApplicationAccessPolicy + admin consent) vs Resend's single API key.
  - DKIM setup required on `matviet.com.vn` (Microsoft selectors).
- **Risk:** if MS Graph API has an outage, both send and inbox polling stall. Mitigation: design `MailProvider` interface seam so an SMTP/IMAP fallback could be added later.

## Implementation notes

- App-only daemon flow (`ConfidentialClientApplication` from MSAL Node)
- `ApplicationAccessPolicy` restricts the AAD app to `hr@matviet.com.vn` only — security must-have
- Scopes: `Mail.Send`, `Mail.Read`, `Mail.ReadWrite`, `Calendars.ReadWrite`, `MailboxSettings.Read`
- DNS prerequisites: SPF + DKIM + DMARC live on `matviet.com.vn` BEFORE Group 6 ships

## References

- Research dispatched 2026-04-21; full comparison in master plan history
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Application Access Policies](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-access-policies)
- [Resend Receiving Emails docs](https://resend.com/docs/dashboard/receiving/introduction)
