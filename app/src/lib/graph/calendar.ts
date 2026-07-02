import "server-only";
import { getMailboxAddress } from "./auth";
import { graphFetch, graphPost, GraphHttpError } from "./client";

/**
 * Outlook calendar events + Teams links via MS Graph (Group 7).
 * Events are created on the recruiting mailbox's calendar (tuyendung@...);
 * interviewers + candidate are invited as attendees, so everyone gets the
 * standard Outlook invite + reminders for free.
 *
 * Required application permissions (admin consent):
 *   Calendars.ReadWrite + OnlineMeetings.ReadWrite
 */

export interface CalendarAttendee {
  email: string;
  name?: string | null;
  /** "required" (interviewer/candidate) or "optional" (observer). */
  type?: "required" | "optional";
}

export interface CreateEventInput {
  subject: string;
  bodyHtml: string;
  /** ISO UTC start. */
  startIso: string;
  durationMin: number;
  attendees: CalendarAttendee[];
  /** true → Teams online meeting is auto-generated. */
  isOnline: boolean;
  /** Physical location label (store address / meeting room) for offline interviews. */
  location?: string | null;
}

export interface CreateEventResult {
  eventId: string;
  teamsJoinUrl: string | null;
  webLink: string | null;
}

function toGraphAttendees(attendees: CalendarAttendee[]) {
  return attendees.map((a) => ({
    emailAddress: { address: a.email, name: a.name ?? a.email },
    type: a.type ?? "required",
  }));
}

function buildEventPayload(input: CreateEventInput) {
  const start = new Date(input.startIso);
  const end = new Date(start.getTime() + input.durationMin * 60_000);
  return {
    subject: input.subject,
    body: { contentType: "HTML" as const, content: input.bodyHtml },
    start: { dateTime: start.toISOString(), timeZone: "UTC" },
    end: { dateTime: end.toISOString(), timeZone: "UTC" },
    attendees: toGraphAttendees(input.attendees),
    location: input.location ? { displayName: input.location } : undefined,
    isOnlineMeeting: input.isOnline,
    onlineMeetingProvider: input.isOnline ? ("teamsForBusiness" as const) : undefined,
  };
}

export async function createCalendarEvent(input: CreateEventInput): Promise<CreateEventResult> {
  const mailbox = getMailboxAddress();
  const res = await graphPost(`/users/${mailbox}/events`, buildEventPayload(input));
  const json = (await res.json()) as {
    id: string;
    webLink?: string;
    onlineMeeting?: { joinUrl?: string };
  };
  return {
    eventId: json.id,
    teamsJoinUrl: json.onlineMeeting?.joinUrl ?? null,
    webLink: json.webLink ?? null,
  };
}

/** Reschedule / retitle an existing event. */
export async function updateCalendarEvent(
  eventId: string,
  input: Pick<CreateEventInput, "subject" | "bodyHtml" | "startIso" | "durationMin"> &
    Partial<Pick<CreateEventInput, "attendees" | "location">>,
): Promise<void> {
  const mailbox = getMailboxAddress();
  const start = new Date(input.startIso);
  const end = new Date(start.getTime() + input.durationMin * 60_000);
  const patch: Record<string, unknown> = {
    subject: input.subject,
    body: { contentType: "HTML", content: input.bodyHtml },
    start: { dateTime: start.toISOString(), timeZone: "UTC" },
    end: { dateTime: end.toISOString(), timeZone: "UTC" },
  };
  if (input.attendees) patch.attendees = toGraphAttendees(input.attendees);
  if (input.location !== undefined) {
    patch.location = input.location ? { displayName: input.location } : null;
  }
  const res = await graphFetch(`/users/${mailbox}/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw await GraphHttpError.fromResponse(res);
}

/** Cancels the event — attendees receive a cancellation notice. */
export async function cancelCalendarEvent(eventId: string, comment?: string): Promise<void> {
  const mailbox = getMailboxAddress();
  try {
    await graphPost(`/users/${mailbox}/events/${eventId}/cancel`, {
      comment: comment ?? "Buổi phỏng vấn đã bị hủy.",
    });
  } catch (err) {
    // 404 → event already gone; treat as cancelled.
    if (err instanceof GraphHttpError && err.statusCode === 404) return;
    throw err;
  }
}
