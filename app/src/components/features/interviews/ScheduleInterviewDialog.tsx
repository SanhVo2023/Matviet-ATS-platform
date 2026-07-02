"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Clock, MapPin } from "lucide-react";
import { SlideOver } from "@/components/primitives/SlideOver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { INTERVIEW_TYPES } from "@/lib/validation/interview";
import { scheduleInterviewAction } from "@/app/(dashboard)/phong-van/actions";

interface InterviewerOption {
  id: string;
  full_name: string | null;
  role: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  interviewers: InterviewerOption[];
}

const TYPE_HINT: Record<(typeof INTERVIEW_TYPES)[number], string> = {
  in_person: "Tại văn phòng / cửa hàng",
  phone: "Số điện thoại",
  video: "Microsoft Teams (link tự tạo khi tích hợp Graph)",
};

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  interviewers,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [date, setDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = React.useState("09:00");
  const [duration, setDuration] = React.useState(60);
  const [type, setType] = React.useState<(typeof INTERVIEW_TYPES)[number]>("in_person");
  const [location, setLocation] = React.useState("");
  const [attendeeIds, setAttendeeIds] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");

  const toggleAttendee = (id: string) => {
    setAttendeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
    const res = await scheduleInterviewAction({
      candidate_id: candidateId,
      scheduled_at,
      duration_min: duration,
      type,
      location_or_link: location.trim() || undefined,
      attendee_ids: attendeeIds,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.success.scheduled);
    onOpenChange(false);
    router.refresh();
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Đặt lịch phỏng vấn"
      description={`Ứng viên: ${candidateName}`}
      width="lg"
    >
      <SlideOver.Body>
        <form id="schedule-form" onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="iv-date" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Ngày
              </Label>
              <Input
                id="iv-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iv-time" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Giờ
              </Label>
              <Input
                id="iv-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iv-duration">Thời lượng (phút)</Label>
            <Input
              id="iv-duration"
              type="number"
              min={15}
              max={240}
              step={15}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value || "60", 10))}
            />
          </div>

          <div className="space-y-2">
            <Label>Hình thức</Label>
            <div className="grid grid-cols-3 gap-2">
              {INTERVIEW_TYPES.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setType(tp)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-xs transition-colors",
                    type === tp
                      ? "border-primary-500 bg-primary-50 text-primary-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  )}
                >
                  <p className="font-medium">{t.interviewType[tp]}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{TYPE_HINT[tp]}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iv-loc" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {t.interview.location}
            </Label>
            <Input
              id="iv-loc"
              placeholder={
                type === "in_person"
                  ? "VD: Văn phòng tầng 3, 123 Lý Tự Trọng, Q.1"
                  : type === "phone"
                    ? "VD: 0901 234 567"
                    : "Link Microsoft Teams (tự thêm sau khi G7 tích hợp Graph)"
              }
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Người phỏng vấn</Label>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
              {interviewers.length === 0 ? (
                <p className="px-2 py-3 text-xs text-slate-500">
                  Chưa có người dùng nào. Mời thêm tài khoản qua{" "}
                  <a className="text-primary-600 hover:underline" href="/cai-dat/nguoi-dung">
                    Cài đặt → Người dùng
                  </a>
                  .
                </p>
              ) : (
                interviewers.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={attendeeIds.includes(u.id)}
                      onChange={() => toggleAttendee(u.id)}
                      className="h-4 w-4"
                    />
                    <span className="flex-1 text-sm text-slate-700">{u.full_name ?? u.id}</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-500">
                      {u.role}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iv-notes">{t.interview.notes}</Label>
            <Textarea
              id="iv-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              placeholder="Nội dung trao đổi, câu hỏi cần hỏi…"
              lang="vi"
            />
          </div>
        </form>
      </SlideOver.Body>

      <SlideOver.Footer>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          {t.action.cancel}
        </Button>
        <Button
          type="submit"
          form="schedule-form"
          disabled={submitting || attendeeIds.length === 0}
        >
          {submitting ? "Đang lưu..." : t.action.save}
        </Button>
      </SlideOver.Footer>
    </SlideOver>
  );
}
