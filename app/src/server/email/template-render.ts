/**
 * Pure template-rendering helpers — usable from both server (template loaders)
 * and client (composer's live preview). NO `server-only` import here, NO
 * Supabase / fetch dependencies.
 */

export type TemplateVars = Record<string, string | number | null | undefined>;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Substitute `{{var_name}}` in `template` with values from `vars`.
 *
 * - Values are coerced to string then HTML-escaped (subject + body share the same
 *   renderer; subject lines are short text but escaping makes it safe to pass through
 *   an HTML body too).
 * - Unknown variables are left intact as `{{key}}` rather than blanked, so HR can
 *   spot a missing input on the queue page instead of sending a half-rendered email.
 * - Whitespace inside the placeholder is tolerated: `{{ candidate_name }}` works.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) return `{{${key}}}`;
    const raw = vars[key];
    if (raw === null || raw === undefined) return `{{${key}}}`;
    return escapeHtml(String(raw));
  });
}

/**
 * Find which `{{var_name}}` placeholders are still unfilled after a render pass.
 * Used by the composer UI to disable Send until every variable has a value.
 */
export function findMissingPlaceholders(rendered: string): string[] {
  const seen = new Set<string>();
  const re = /\{\{\s*(\w+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rendered)) !== null) seen.add(m[1]!);
  return [...seen];
}
