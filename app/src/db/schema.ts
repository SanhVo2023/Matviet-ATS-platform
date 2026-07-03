/**
 * D1 (SQLite) schema — single source of truth after the Cloudflare pivot (ADR 0009).
 *
 * Conventions:
 * - ids: text UUIDs generated app-side (crypto.randomUUID)
 * - timestamps: ISO-8601 UTC strings in TEXT columns — EXCEPT better-auth tables,
 *   which follow better-auth's integer-epoch convention so the adapter works unmodified
 * - booleans: INTEGER 0/1 via drizzle boolean mode
 * - json/arrays: TEXT via drizzle json mode
 * - property names: snake_case for app tables (so $inferSelect matches the row shapes
 *   the UI has consumed since G1); camelCase for better-auth tables (adapter contract)
 * - enums: TEXT constrained by the string-literal unions below (values identical to
 *   the old Postgres enums)
 */
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------------------------------------------------------------------------
// Enum value lists (unchanged from Postgres — mirrored in src/types/db.ts)
// ---------------------------------------------------------------------------

export const USER_ROLES = ["admin", "hr", "hiring_manager", "bod", "tap_doan"] as const;
export const JOB_STATUSES = ["draft", "open", "paused", "closed", "filled"] as const;
export const FLOW_TYPES = ["staff", "management"] as const;
export const ROLE_FAMILIES = ["sales", "optician", "office", "manager", "custom"] as const;
export const PIPELINE_STAGES = [
  "new",
  "screening",
  "screened",
  "interview_scheduled",
  "interviewed",
  "test_sent",
  "test_done",
  "recommended",
  "salary_deal",
  "bod_review",
  "tap_doan_review",
  "offer_sent",
  "offer_accepted",
  "hired",
  "rejected",
  "withdrew",
] as const;
export const CANDIDATE_SOURCES = [
  "manual_upload",
  "email_inbox",
  "csv_import",
  "topcv_api",
  "referral",
] as const;
export const AI_SCREENING_STATUSES = ["pending", "success", "failed"] as const;
export const SCORING_JOB_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export const INTERVIEW_STATUSES = ["scheduled", "completed", "cancelled", "no_show"] as const;
export const INTERVIEW_TYPES = ["in_person", "phone", "video"] as const;
export const INTERVIEWER_ROLES = ["interviewer", "observer"] as const;
export const RECOMMENDATIONS = ["strong_yes", "yes", "maybe", "no"] as const;
export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export const APPROVAL_STEP_KINDS = [
  "hr_recommend",
  "manager_recommend",
  "salary_deal",
  "bod",
  "tap_doan",
] as const;
export const EMAIL_DIRECTIONS = ["outbound", "inbound"] as const;
export const EMAIL_STATUSES = [
  "queued",
  "pending_approval",
  "sent",
  "delivered",
  "failed",
  "received",
] as const;
export const EMPLOYEE_STATUSES = ["active", "on_leave", "terminated"] as const;

const uuid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// better-auth tables (ADR 0010). `users` absorbs the old `profiles` columns.
// Property names match better-auth's field names so the drizzle adapter maps 1:1.
// ---------------------------------------------------------------------------

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    // --- app fields (old `profiles`) ---
    role: text("role", { enum: USER_ROLES }).notNull().default("hr"),
    phone: text("phone"),
    departmentId: text("department_id"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    // --- better-auth admin plugin fields ---
    banned: integer("banned", { mode: "boolean" }).notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: integer("ban_expires", { mode: "timestamp" }),
  },
  (t) => [index("idx_users_role").on(t.role), index("idx_users_dept").on(t.departmentId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("idx_sessions_user").on(t.userId)],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("idx_accounts_user").on(t.userId)],
);

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ---------------------------------------------------------------------------
// HRIS foundation (ADR 0012) — person-centric core. ATS writes `people` only;
// positions/employees stay empty until the employee-management build group.
// ---------------------------------------------------------------------------

export const people = sqliteTable(
  "people",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    full_name: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    dob: text("dob"),
    gender: text("gender"),
    national_id: text("national_id"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
    updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
  },
  (t) => [index("idx_people_email").on(t.email), index("idx_people_phone").on(t.phone)],
);

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey().$defaultFn(uuid),
  name: text("name").notNull(),
  code: text("code").unique(),
  parent_id: text("parent_id"),
  head_user_id: text("head_user_id").references(() => users.id),
  created_at: text("created_at").notNull().$defaultFn(nowIso),
  updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
});

export const positions = sqliteTable("positions", {
  id: text("id").primaryKey().$defaultFn(uuid),
  title: text("title").notNull(),
  department_id: text("department_id").references(() => departments.id),
  created_at: text("created_at").notNull().$defaultFn(nowIso),
  updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
});

export const employees = sqliteTable(
  "employees",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    person_id: text("person_id")
      .notNull()
      .references(() => people.id),
    employee_code: text("employee_code").unique(),
    department_id: text("department_id").references(() => departments.id),
    position_id: text("position_id").references(() => positions.id),
    hired_at: text("hired_at"),
    status: text("status", { enum: EMPLOYEE_STATUSES }).notNull().default("active"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
    updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
  },
  (t) => [index("idx_employees_person").on(t.person_id)],
);

// ---------------------------------------------------------------------------
// ATS tables (ported 1:1 from Postgres migrations 0002–0019)
// ---------------------------------------------------------------------------

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    title: text("title").notNull(),
    code: text("code").unique(),
    department_id: text("department_id").references(() => departments.id),
    location: text("location"),
    description: text("description"),
    requirements: text("requirements", { mode: "json" }).$type<Json>().notNull().default([]),
    weights: text("weights", { mode: "json" }).$type<Json>().notNull().default({}),
    role_family: text("role_family", { enum: ROLE_FAMILIES }).notNull().default("custom"),
    flow_type: text("flow_type", { enum: FLOW_TYPES }).notNull().default("staff"),
    status: text("status", { enum: JOB_STATUSES }).notNull().default("draft"),
    headcount: integer("headcount").notNull().default(1),
    salary_min: real("salary_min"),
    salary_max: real("salary_max"),
    posted_at: text("posted_at"),
    closed_at: text("closed_at"),
    is_archived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    created_by: text("created_by").references(() => users.id),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
    updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
  },
  (t) => [
    index("idx_jobs_status").on(t.status),
    index("idx_jobs_dept").on(t.department_id),
    index("idx_jobs_posted_at").on(t.posted_at),
  ],
);

export const job_assignments = sqliteTable(
  "job_assignments",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    job_id: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    manager_user_id: text("manager_user_id")
      .notNull()
      .references(() => users.id),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [
    uniqueIndex("uq_assignments_job_manager").on(t.job_id, t.manager_user_id),
    index("idx_assignments_manager").on(t.manager_user_id),
  ],
);

export const weight_templates = sqliteTable("weight_templates", {
  id: text("id").primaryKey().$defaultFn(uuid),
  family: text("family", { enum: ROLE_FAMILIES }).notNull().unique(),
  name_vi: text("name_vi").notNull(),
  weights: text("weights", { mode: "json" }).$type<Json>().notNull(),
  is_default: integer("is_default", { mode: "boolean" }).notNull().default(false),
  updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
});

export const cv_files = sqliteTable("cv_files", {
  id: text("id").primaryKey().$defaultFn(uuid),
  storage_path: text("storage_path").notNull(),
  pdf_storage_path: text("pdf_storage_path"),
  original_name: text("original_name").notNull(),
  mime: text("mime").notNull(),
  size_bytes: integer("size_bytes").notNull(),
  uploaded_by: text("uploaded_by").references(() => users.id),
  created_at: text("created_at").notNull().$defaultFn(nowIso),
});

export const candidates = sqliteTable(
  "candidates",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    job_id: text("job_id")
      .notNull()
      .references(() => jobs.id),
    person_id: text("person_id").references(() => people.id),
    full_name: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    dob: text("dob"),
    gender: text("gender"),
    location: text("location"),
    source: text("source", { enum: CANDIDATE_SOURCES }).notNull().default("manual_upload"),
    source_meta: text("source_meta", { mode: "json" }).$type<Json>().notNull().default({}),
    referrer_user_id: text("referrer_user_id").references(() => users.id),
    current_stage: text("current_stage", { enum: PIPELINE_STAGES }).notNull().default("new"),
    cv_file_id: text("cv_file_id").references(() => cv_files.id),
    cv_text: text("cv_text"),
    parsed: text("parsed", { mode: "json" }).$type<Json>(),
    ai_score: real("ai_score"),
    ai_breakdown: text("ai_breakdown", { mode: "json" }).$type<Json>(),
    ai_scored_at: text("ai_scored_at"),
    ai_screening_status: text("ai_screening_status", { enum: AI_SCREENING_STATUSES })
      .notNull()
      .default("pending"),
    ai_screening_error: text("ai_screening_error"),
    notes: text("notes"),
    is_archived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    created_by: text("created_by").references(() => users.id),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
    updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
  },
  (t) => [
    index("idx_candidates_job").on(t.job_id),
    index("idx_candidates_stage").on(t.current_stage),
    index("idx_candidates_score").on(t.ai_score),
    index("idx_candidates_email").on(t.email),
    index("idx_candidates_phone").on(t.phone),
    index("idx_candidates_screening_status").on(t.ai_screening_status),
    index("idx_candidates_created_at").on(t.created_at),
    index("idx_candidates_job_created").on(t.job_id, t.created_at),
    index("idx_candidates_source_created").on(t.source, t.created_at),
    index("idx_candidates_person").on(t.person_id),
  ],
);

export const ai_screenings = sqliteTable(
  "ai_screenings",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    candidate_id: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    total: real("total").notNull(),
    criteria: text("criteria", { mode: "json" }).$type<Json>().notNull(),
    weights_snapshot: text("weights_snapshot", { mode: "json" }).$type<Json>().notNull(),
    pass1_raw: text("pass1_raw", { mode: "json" }).$type<Json>(),
    pass2_raw: text("pass2_raw", { mode: "json" }).$type<Json>(),
    prompt_hash: text("prompt_hash"),
    tokens_in: integer("tokens_in"),
    tokens_out: integer("tokens_out"),
    cost_usd: real("cost_usd"),
    duration_ms: integer("duration_ms"),
    error: text("error"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [index("idx_screenings_candidate").on(t.candidate_id, t.created_at)],
);

export const stage_history = sqliteTable(
  "stage_history",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    candidate_id: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    from_stage: text("from_stage", { enum: PIPELINE_STAGES }),
    to_stage: text("to_stage", { enum: PIPELINE_STAGES }).notNull(),
    actor_user_id: text("actor_user_id").references(() => users.id),
    notes: text("notes"),
    at: text("at").notNull().$defaultFn(nowIso),
  },
  (t) => [
    index("idx_stage_history_candidate").on(t.candidate_id, t.at),
    index("idx_stage_history_to_stage_at").on(t.to_stage, t.at),
  ],
);

export const scoring_queue = sqliteTable(
  "scoring_queue",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    candidate_id: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    status: text("status", { enum: SCORING_JOB_STATUSES }).notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    last_error: text("last_error"),
    next_retry_at: text("next_retry_at"),
    triggered_by: text("triggered_by").references(() => users.id),
    enqueued_at: text("enqueued_at").notNull().$defaultFn(nowIso),
    started_at: text("started_at"),
    completed_at: text("completed_at"),
  },
  (t) => [
    index("idx_scoring_queue_pending").on(t.status, t.enqueued_at),
    index("idx_scoring_queue_candidate").on(t.candidate_id),
  ],
);

export const interviews = sqliteTable(
  "interviews",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    candidate_id: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    job_id: text("job_id")
      .notNull()
      .references(() => jobs.id),
    scheduled_at: text("scheduled_at").notNull(),
    duration_min: integer("duration_min").notNull().default(60),
    type: text("type", { enum: INTERVIEW_TYPES }).notNull().default("in_person"),
    status: text("status", { enum: INTERVIEW_STATUSES }).notNull().default("scheduled"),
    location_or_link: text("location_or_link"),
    teams_link: text("teams_link"),
    graph_event_id: text("graph_event_id"),
    notes: text("notes"),
    created_by: text("created_by").references(() => users.id),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
    updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
  },
  (t) => [
    index("idx_interviews_candidate").on(t.candidate_id),
    index("idx_interviews_scheduled").on(t.scheduled_at),
    index("idx_interviews_status").on(t.status),
  ],
);

export const interview_attendees = sqliteTable(
  "interview_attendees",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    interview_id: text("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role", { enum: INTERVIEWER_ROLES }).notNull().default("interviewer"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [
    uniqueIndex("uq_attendees_interview_user").on(t.interview_id, t.user_id),
    index("idx_attendees_user").on(t.user_id),
  ],
);

export const interview_evaluations = sqliteTable(
  "interview_evaluations",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    interview_id: text("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    evaluator_user_id: text("evaluator_user_id")
      .notNull()
      .references(() => users.id),
    scores: text("scores", { mode: "json" }).$type<Json>().notNull(),
    recommendation: text("recommendation", { enum: RECOMMENDATIONS }),
    strengths: text("strengths"),
    concerns: text("concerns"),
    proposed_salary: real("proposed_salary"),
    internal_notes: text("internal_notes"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
    updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
  },
  (t) => [
    uniqueIndex("uq_evals_interview_evaluator").on(t.interview_id, t.evaluator_user_id),
    index("idx_evals_interview").on(t.interview_id),
  ],
);

export const assessments = sqliteTable(
  "assessments",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    job_id: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    test_storage_path: text("test_storage_path"),
    original_name: text("original_name"),
    instructions: text("instructions"),
    time_limit_min: integer("time_limit_min"),
    is_active: integer("is_active", { mode: "boolean" }).notNull().default(true),
    created_by: text("created_by").references(() => users.id),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
    updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
  },
  (t) => [index("idx_assessments_job_active").on(t.job_id, t.is_active)],
);

export const assessment_submissions = sqliteTable(
  "assessment_submissions",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    assessment_id: text("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    candidate_id: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    submission_storage_path: text("submission_storage_path"),
    submitted_at: text("submitted_at"),
    email_message_id: text("email_message_id"),
    score: real("score"),
    notes: text("notes"),
    graded_by: text("graded_by").references(() => users.id),
    graded_at: text("graded_at"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
    updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
  },
  (t) => [
    uniqueIndex("uq_assessment_subs_candidate_assessment").on(t.candidate_id, t.assessment_id),
    index("idx_subs_candidate").on(t.candidate_id),
  ],
);

export const assessment_invite_tokens = sqliteTable(
  "assessment_invite_tokens",
  {
    token: text("token").primaryKey(),
    assessment_id: text("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    candidate_id: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    submission_id: text("submission_id").references(() => assessment_submissions.id),
    expires_at: text("expires_at").notNull(),
    used_at: text("used_at"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [index("idx_assessment_tokens_candidate").on(t.candidate_id)],
);

export const approvals = sqliteTable(
  "approvals",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    candidate_id: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    step_index: integer("step_index").notNull(),
    step_kind: text("step_kind", { enum: APPROVAL_STEP_KINDS }).notNull(),
    status: text("status", { enum: APPROVAL_STATUSES }).notNull().default("pending"),
    actor_user_id: text("actor_user_id").references(() => users.id),
    notes: text("notes"),
    decided_at: text("decided_at"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
    updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
  },
  (t) => [
    index("idx_approvals_candidate").on(t.candidate_id, t.step_index),
    index("idx_approvals_status").on(t.status),
    index("idx_approvals_decided_at").on(t.decided_at),
  ],
);

export const email_templates = sqliteTable("email_templates", {
  id: text("id").primaryKey().$defaultFn(uuid),
  code: text("code").notNull().unique(),
  name_vi: text("name_vi").notNull(),
  subject_vi: text("subject_vi").notNull(),
  body_html: text("body_html").notNull(),
  body_md: text("body_md"),
  variables: text("variables", { mode: "json" }).$type<Json>().notNull().default([]),
  requires_approval: integer("requires_approval", { mode: "boolean" }).notNull().default(true),
  is_active: integer("is_active", { mode: "boolean" }).notNull().default(true),
  created_at: text("created_at").notNull().$defaultFn(nowIso),
  updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
});

export const email_messages = sqliteTable(
  "email_messages",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    direction: text("direction", { enum: EMAIL_DIRECTIONS }).notNull(),
    status: text("status", { enum: EMAIL_STATUSES }).notNull().default("queued"),
    candidate_id: text("candidate_id").references(() => candidates.id, { onDelete: "set null" }),
    job_id: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
    interview_id: text("interview_id").references(() => interviews.id, { onDelete: "set null" }),
    template_code: text("template_code"),
    subject: text("subject").notNull(),
    body_html: text("body_html"),
    body_text: text("body_text"),
    from_email: text("from_email"),
    to_emails: text("to_emails", { mode: "json" }).$type<string[]>().notNull().default([]),
    cc_emails: text("cc_emails", { mode: "json" }).$type<string[]>().notNull().default([]),
    graph_message_id: text("graph_message_id"),
    conversation_id: text("conversation_id"),
    in_reply_to: text("in_reply_to"),
    scheduled_send_at: text("scheduled_send_at"),
    sent_at: text("sent_at"),
    received_at: text("received_at"),
    retry_count: integer("retry_count").notNull().default(0),
    next_retry_at: text("next_retry_at"),
    error: text("error"),
    approved_by: text("approved_by").references(() => users.id),
    approved_at: text("approved_at"),
    created_by: text("created_by").references(() => users.id),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
    updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
  },
  (t) => [
    index("idx_emails_candidate").on(t.candidate_id, t.created_at),
    index("idx_emails_status").on(t.status),
    index("idx_emails_queue_drain").on(t.status, t.created_at),
    index("idx_emails_next_retry").on(t.next_retry_at),
  ],
);

export const inbox_attachments = sqliteTable("inbox_attachments", {
  id: text("id").primaryKey().$defaultFn(uuid),
  email_message_id: text("email_message_id")
    .notNull()
    .references(() => email_messages.id, { onDelete: "cascade" }),
  storage_path: text("storage_path"),
  original_name: text("original_name"),
  mime: text("mime"),
  size_bytes: integer("size_bytes"),
  is_cv: integer("is_cv", { mode: "boolean" }).notNull().default(false),
  cv_file_id: text("cv_file_id").references(() => cv_files.id),
  created_at: text("created_at").notNull().$defaultFn(nowIso),
});

export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey().$defaultFn(uuid),
  candidate_id: text("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  referrer_user_id: text("referrer_user_id")
    .notNull()
    .references(() => users.id),
  relationship: text("relationship"),
  notes: text("notes"),
  created_at: text("created_at").notNull().$defaultFn(nowIso),
});

/** Runtime-configurable settings (admin UI) — e.g. ai_model, ai_enabled. */
export const app_settings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updated_at: text("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso),
});

/** One row per Workers AI call — powers the admin usage/cost dashboard. */
export const ai_usage_log = sqliteTable(
  "ai_usage_log",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    feature: text("feature").notNull(), // scoring | agent | email_draft | jd_generate | interview_questions | candidate_summary
    model: text("model").notNull(),
    tokens_in: integer("tokens_in").notNull().default(0),
    tokens_out: integer("tokens_out").notNull().default(0),
    cost_usd: real("cost_usd").notNull().default(0),
    user_id: text("user_id"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [
    index("idx_ai_usage_created").on(t.created_at),
    index("idx_ai_usage_feature").on(t.feature, t.created_at),
  ],
);

export const audit_log = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    entity: text("entity").notNull(),
    entity_id: text("entity_id"),
    action: text("action").notNull(),
    actor_user_id: text("actor_user_id").references(() => users.id),
    before: text("before", { mode: "json" }).$type<Json>(),
    after: text("after", { mode: "json" }).$type<Json>(),
    meta: text("meta", { mode: "json" }).$type<Json>(),
    at: text("at").notNull().$defaultFn(nowIso),
  },
  (t) => [
    index("idx_audit_entity").on(t.entity, t.entity_id, t.at),
    index("idx_audit_actor").on(t.actor_user_id, t.at),
  ],
);

// ---------------------------------------------------------------------------
// In-app notifications + Web Push (notification center in the TopBar bell).
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES = [
  "scoring_done",
  "scoring_failed",
  "approval_pending",
  "approval_finalized",
  "interview_created",
  "interview_reminder",
  "email_failed",
  "system",
] as const;

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
    title: text("title").notNull(),
    body: text("body"),
    /** App-relative link ("/ung-vien/<id>") the bell navigates to on click. */
    link: text("link"),
    read_at: text("read_at"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [
    index("idx_notifications_user").on(t.user_id, t.created_at),
    // reminder dedup lookups: same user + type + link only once
    index("idx_notifications_dedup").on(t.user_id, t.type, t.link),
  ],
);

/** One row per browser push subscription (a user can have several devices). */
export const push_subscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    user_agent: text("user_agent"),
    created_at: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [index("idx_push_subs_user").on(t.user_id)],
);
