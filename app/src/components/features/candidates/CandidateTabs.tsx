import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CvPreview } from "./CvPreview";
import { t } from "@/lib/i18n";

interface Props {
  cv?: {
    signedUrl: string | null;
    mime: string;
    originalName: string;
  };
}

/**
 * Center-column tabs on the candidate detail page.
 * v1 (G3): CV preview + History (history is the right rail; this tab is just
 * a hint that the activity stream lives there). Other tabs are placeholders
 * filled by their respective groups (G4 AI, G5 interviews, G6 emails,
 * G7 tests, G8 approvals).
 */
export function CandidateTabs({ cv }: Props) {
  return (
    <Tabs defaultValue="cv" className="w-full">
      <TabsList className="overflow-x-auto">
        <TabsTrigger value="cv">CV</TabsTrigger>
        <TabsTrigger value="ai" disabled>
          Phân tích AI
        </TabsTrigger>
        <TabsTrigger value="interviews" disabled>
          {t.nav.interviews}
        </TabsTrigger>
        <TabsTrigger value="tests" disabled>
          {t.nav.tests}
        </TabsTrigger>
        <TabsTrigger value="emails" disabled>
          {t.nav.emails}
        </TabsTrigger>
        <TabsTrigger value="approvals" disabled>
          {t.nav.approvals}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="cv">
        {cv ? (
          <CvPreview signedUrl={cv.signedUrl} mime={cv.mime} originalName={cv.originalName} />
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Chưa có CV được đính kèm.
          </div>
        )}
      </TabsContent>

      <TabsContent value="ai">
        <Stub
          title="Phân tích AI"
          description="Sẽ ra mắt trong Group 4. Hệ thống tự động chấm điểm 6 tiêu chí + trích dẫn bằng chứng từ CV."
        />
      </TabsContent>
      <TabsContent value="interviews">
        <Stub
          title={t.nav.interviews}
          description="Group 5: lịch phỏng vấn + Microsoft Teams + form đánh giá."
        />
      </TabsContent>
      <TabsContent value="tests">
        <Stub title={t.nav.tests} description="Group 7: gửi bài test, nhận bài làm, chấm điểm." />
      </TabsContent>
      <TabsContent value="emails">
        <Stub title={t.nav.emails} description="Group 6: lịch sử email với ứng viên." />
      </TabsContent>
      <TabsContent value="approvals">
        <Stub title={t.nav.approvals} description="Group 8: quy trình duyệt 3 hoặc 4 bước." />
      </TabsContent>
    </Tabs>
  );
}

function Stub({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
