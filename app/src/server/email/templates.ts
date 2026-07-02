import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { email_templates } from "@/db/schema";
import { renderTemplate, type TemplateVars } from "./template-render";

export type { TemplateVars } from "./template-render";
export { renderTemplate, findMissingPlaceholders, escapeHtml } from "./template-render";

export interface RenderedTemplate {
  code: string;
  subject: string;
  body_html: string;
  requires_approval: boolean;
}

export interface TemplateRow {
  code: string;
  name_vi: string;
  subject_vi: string;
  body_html: string;
  variables: string[];
  requires_approval: boolean;
}

const templateColumns = {
  code: email_templates.code,
  name_vi: email_templates.name_vi,
  subject_vi: email_templates.subject_vi,
  body_html: email_templates.body_html,
  variables: email_templates.variables,
  requires_approval: email_templates.requires_approval,
} as const;

function toTemplateRow(row: {
  code: string;
  name_vi: string;
  subject_vi: string;
  body_html: string;
  variables: unknown;
  requires_approval: boolean;
}): TemplateRow {
  return {
    code: row.code,
    name_vi: row.name_vi,
    subject_vi: row.subject_vi,
    body_html: row.body_html,
    variables: Array.isArray(row.variables) ? (row.variables as string[]) : [],
    requires_approval: row.requires_approval,
  };
}

/**
 * Fetch one email_templates row by code. Templates are global and read-only
 * for HR — caller authorization happens at the action layer.
 */
export async function loadTemplate(code: string): Promise<TemplateRow | null> {
  const db = await getDb();
  const rows = await db
    .select(templateColumns)
    .from(email_templates)
    .where(and(eq(email_templates.code, code), eq(email_templates.is_active, true)))
    .limit(1);
  return rows[0] ? toTemplateRow(rows[0]) : null;
}

export async function listActiveTemplates(): Promise<TemplateRow[]> {
  const db = await getDb();
  const rows = await db
    .select(templateColumns)
    .from(email_templates)
    .where(eq(email_templates.is_active, true))
    .orderBy(asc(email_templates.name_vi));
  return rows.map(toTemplateRow);
}

/**
 * Convenience: fetch + substitute a template in one call.
 * Throws if the template code doesn't exist.
 */
export async function renderFromTemplate(
  code: string,
  vars: TemplateVars,
): Promise<RenderedTemplate> {
  const tpl = await loadTemplate(code);
  if (!tpl) throw new Error(`Mẫu email "${code}" không tồn tại hoặc đã bị tắt`);
  return {
    code: tpl.code,
    subject: renderTemplate(tpl.subject_vi, vars),
    body_html: renderTemplate(tpl.body_html, vars),
    requires_approval: tpl.requires_approval,
  };
}
