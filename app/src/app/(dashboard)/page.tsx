import { requireSession, isHr, isManager } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t, tf } from "@/lib/i18n";

/**
 * Role-conditional landing page.
 *   - HR / admin → lean dashboard skeleton (Group 10 fills it in)
 *   - Hiring manager → "Hộp việc cần làm" inbox skeleton (Group 8 fills it in)
 *   - BOD / Tập đoàn → approval queue (Group 8 fills it in)
 *
 * For Group 1 these are placeholder shells with empty states so the app
 * shows something coherent the moment a user logs in.
 */
export default async function HomePage() {
  const profile = await requireSession();

  if (isManager(profile.role)) {
    return <ManagerInbox name={profile.full_name ?? "anh/chị"} />;
  }
  if (isHr(profile.role)) {
    return <HrDashboard name={profile.full_name ?? "chị Hương"} />;
  }
  return <ExecApprovalQueue name={profile.full_name ?? "anh/chị"} />;
}

function HrDashboard({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">{t.nav.dashboard}</h1>
        <p className="mt-1 text-sm text-slate-500">{tf.greeting(name)}</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["openJobs", t.dashboard.cards.openJobs],
            ["newCvs", t.dashboard.cards.newCvs],
            ["todayInterviews", t.dashboard.cards.todayInterviews],
            ["pendingApprovals", t.dashboard.cards.pendingApprovals],
          ] as const
        ).map(([key, label]) => (
          <Card key={key} className="transition-shadow hover:shadow-md">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>{t.dashboard.funnel.title}</CardTitle>
            <CardDescription>{t.empty.reports}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{t.dashboard.todaySchedule.title}</CardTitle>
            <CardDescription>{t.empty.interviewsToday}</CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}

function ManagerInbox({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{tf.greeting(name)}</h1>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t.managerInbox.toDo.title}</CardTitle>
          <CardDescription>{t.empty.managerInbox}</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.managerInbox.upcomingInterviews.title}</CardTitle>
          <CardDescription>{t.empty.interviewsUpcoming}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function ExecApprovalQueue({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{tf.greeting(name)}</h1>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t.nav.approvals}</CardTitle>
          <CardDescription>{t.empty.approvals}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
