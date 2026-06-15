/**
 * Google Calendar helpers
 * -----------------------
 * 1. buildGoogleCalendarUrl  — opens Google Calendar in-browser, pre-filled
 * 2. generateICSContent      — creates an iCalendar (.ics) string with
 *                              email + display reminders 1 hour before
 * 3. downloadICS             — triggers a browser download of the .ics file
 *
 * No OAuth or API key required for either approach.
 */

export interface CalendarEventParams {
  /** Event title shown in Google Calendar / calendar apps */
  title: string
  /** ISO 8601 date string (e.g. booking.scheduledTime) */
  startTime: string
  /** Duration in minutes */
  durationMinutes: number
  /** Optional rich description / notes */
  description?: string
  /** Human-readable location, e.g. "Online" */
  location?: string
  /** The actual meeting join URL — included in description */
  meetingUrl?: string
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Converts a JS Date to the compact UTC format iCalendar / Google Calendar
 * expects:  YYYYMMDDTHHMMSSZ
 */
function toIsoCompact(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

/**
 * Escapes special characters in iCalendar text fields.
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g,  "\\;")
    .replace(/,/g,  "\\,")
    .replace(/\n/g, "\\n")
}

// ── Google Calendar URL ───────────────────────────────────────────────────────

/**
 * Returns a fully-formed Google Calendar "TEMPLATE" URL.
 * Opening this in any browser drops the user into their Google Calendar
 * with all fields pre-filled — they only need to click "Save".
 *
 * Location is always "Online". The join URL lives in the description.
 */
export function buildGoogleCalendarUrl(params: CalendarEventParams): string {
  const start = new Date(params.startTime)
  const end   = new Date(start.getTime() + params.durationMinutes * 60_000)

  // Build a rich description that includes the meeting link
  const description = [
    params.description || "",
    params.meetingUrl ? `\nJoin meeting: ${params.meetingUrl}` : "",
  ].join("").trim()

  const query = new URLSearchParams({
    action:   "TEMPLATE",
    text:     params.title,
    dates:    `${toIsoCompact(start)}/${toIsoCompact(end)}`,
    location: params.location || "Online",
    ...(description ? { details: description } : {}),
  })

  return `https://calendar.google.com/calendar/render?${query.toString()}`
}

// ── ICS file with reminders ───────────────────────────────────────────────────

/**
 * Generates an iCalendar (.ics) string that includes:
 *  - Location: Online
 *  - VALARM ACTION:DISPLAY  — pop-up notification 1 hour before
 *  - VALARM ACTION:EMAIL    — email reminder 1 hour before
 *
 * The .ics format is understood by Google Calendar, Apple Calendar,
 * Outlook, and virtually every calendar application.
 */
export function generateICSContent(params: CalendarEventParams): string {
  const start = new Date(params.startTime)
  const end   = new Date(start.getTime() + params.durationMinutes * 60_000)
  const now   = new Date()
  const uid   = `${Date.now()}-${Math.random().toString(36).slice(2)}@intervexa.app`

  const description = [
    params.description || "",
    params.meetingUrl ? `\nJoin meeting: ${params.meetingUrl}` : "",
  ].join("").trim()

  const reminderDescription = `⏰ Your interview starts in 1 hour — ${params.title}`
  const reminderSummary     = `Reminder: ${params.title}`

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Intervexa//Live Interview Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",

    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIsoCompact(now)}`,
    `DTSTART:${toIsoCompact(start)}`,
    `DTEND:${toIsoCompact(end)}`,
    `SUMMARY:${escapeICS(params.title)}`,
    `LOCATION:${escapeICS(params.location || "Online")}`,
    ...(description ? [`DESCRIPTION:${escapeICS(description)}`] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",

    // ── Pop-up notification 1 DAY before ───────────────────────────────
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-P1D",
    `DESCRIPTION:${escapeICS(`📅 Tomorrow: ${params.title} — don't forget your interview!`)}`,
    "END:VALARM",

    // ── Email reminder 1 DAY before ────────────────────────────────────
    "BEGIN:VALARM",
    "ACTION:EMAIL",
    "TRIGGER:-P1D",
    `SUMMARY:${escapeICS(`Tomorrow: ${params.title}`)}`,
    `DESCRIPTION:${escapeICS(`Your interview is tomorrow. Join link: ${params.meetingUrl || "See event details"}`)}`,
    "END:VALARM",

    // ── Pop-up notification 1 HOUR before ──────────────────────────────
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT1H",
    `DESCRIPTION:${escapeICS(`⏰ Starting in 1 hour: ${params.title}`)}`,
    "END:VALARM",

    // ── Email reminder 1 HOUR before ───────────────────────────────────
    "BEGIN:VALARM",
    "ACTION:EMAIL",
    "TRIGGER:-PT1H",
    `SUMMARY:${escapeICS(`1 hour left: ${params.title}`)}`,
    `DESCRIPTION:${escapeICS(`Your interview starts in 1 hour. Join: ${params.meetingUrl || "See event details"}`)}`,
    "END:VALARM",

    "END:VEVENT",
    "END:VCALENDAR",
  ]

  return lines.join("\r\n")
}

/**
 * Triggers a browser download of a .ics calendar file.
 * The downloaded file includes both a pop-up and email reminder 1 hour
 * before the event when imported into any calendar app.
 */
export function downloadICS(params: CalendarEventParams, filename?: string): void {
  if (typeof window === "undefined") return

  const safeName = filename
    ?? params.title
         .replace(/[^a-z0-9]/gi, "_")
         .replace(/__+/g, "_")
         .toLowerCase() + ".ics"

  const content = generateICSContent(params)
  const blob    = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const url     = URL.createObjectURL(blob)
  const a       = document.createElement("a")

  a.href     = url
  a.download = safeName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
