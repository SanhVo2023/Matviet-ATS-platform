import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * Fetch one email_templates row by code. Uses the admin client because templates
 * are global and read-only for HR — caller authorization happens at the action layer.
 */
export async function loadTemplate(code: string): Promise<TemplateRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_templates")
    .select("code, name_vi, subject_vi, body_html, variables, requires_approval")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    code: string;
    name_vi: string;
    subject_vi: string;
    body_html: string;
    variables: unknown;
    requires_approval: boolean;
  };
  return {
    code: row.code,
    name_vi: row.name_vi,
    subject_vi: row.subject_vi,
    body_html: row.body_html,
    variables: Array.isArray(row.variables) ? (row.variables as string[]) : [],
    requires_approval: row.requires_approval,
  };
}

export async function listActiveTemplates(): Promise<TemplateRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_templates")
    .select("code, name_vi, subject_vi, body_html, variables, requires_approval")
    .eq("is_active", true)
    .order("name_vi");
  if (error) throw error;
  return (data ?? []).map((d) => {
    const row = d as {
      code: string;
      name_vi: string;
      subject_vi: string;
      body_html: string;
      variables: unknown;
      requires_approval: boolean;
    };
    return {
      code: row.code,
      name_vi: row.name_vi,
      subject_vi: row.subject_vi,
      body_html: row.body_html,
      variables: Array.isArray(row.variables) ? (row.variables as string[]) : [],
      requires_approval: row.requires_approval,
    };
  });
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
