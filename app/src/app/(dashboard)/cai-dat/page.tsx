import { redirect } from "next/navigation";

/** /cai-dat has no index content — land admins on user management. */
export default function SettingsIndexPage() {
  redirect("/cai-dat/nguoi-dung");
}
