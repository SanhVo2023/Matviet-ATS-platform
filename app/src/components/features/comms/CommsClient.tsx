"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, Plus, Pin, PinOff, Trash2, FileText, Download, Upload } from "lucide-react";
import { PageHeader } from "@/components/primitives/PageHeader";
import { EmptyState } from "@/components/primitives/EmptyState";
import { SlideOver } from "@/components/primitives/SlideOver";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { t, interpolate } from "@/lib/i18n";
import { formatDate } from "@/lib/vi-format";
import {
  createAnnouncementAction,
  togglePinAction,
  deleteAnnouncementAction,
  uploadDocumentAction,
  deleteDocumentAction,
} from "@/app/(dashboard)/thong-bao/actions";
import type { AnnouncementItem, HrDocumentItem } from "@/server/comms/repository";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function CommsClient({
  announcements,
  documents,
  canManage,
}: {
  announcements: AnnouncementItem[];
  documents: HrDocumentItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [annOpen, setAnnOpen] = React.useState(false);
  const [docOpen, setDocOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function run(id: string, p: Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    setBusy(id);
    const res = await p;
    setBusy(null);
    if (res.ok) {
      if (okMsg) toast.success(okMsg);
      router.refresh();
    } else if (res.error) toast.error(res.error);
  }

  return (
    <>
      <PageHeader icon={Megaphone} title={t.comms.title} subtitle={t.comms.subtitle} />

      {/* Announcements */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            <Megaphone className="h-4 w-4 text-accent-600" aria-hidden />
            {t.comms.announcements}
          </h2>
          {canManage ? (
            <Button size="sm" onClick={() => setAnnOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              {t.comms.addAnnouncement}
            </Button>
          ) : null}
        </div>
        {announcements.length === 0 ? (
          <EmptyState icon={Megaphone} title={t.comms.noAnnouncements} />
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id} className={cn(a.pinned && "border-accent-300")}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {a.pinned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                            <Pin className="h-3 w-3" aria-hidden />
                            {t.comms.pinned}
                          </span>
                        ) : null}
                        <h3 className="font-semibold text-brand-900">{a.title}</h3>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.body}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {a.author_name ?? "—"} · {formatDate(a.created_at)}
                      </p>
                    </div>
                    {canManage ? (
                      <div className="flex flex-none items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === a.id}
                          onClick={() => run(a.id, togglePinAction(a.id, !a.pinned))}
                          aria-label={a.pinned ? t.comms.unpin : t.comms.pin}
                        >
                          {a.pinned ? (
                            <PinOff className="h-4 w-4" aria-hidden />
                          ) : (
                            <Pin className="h-4 w-4" aria-hidden />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === a.id}
                          onClick={() =>
                            run(a.id, deleteAnnouncementAction(a.id), t.success.deleted)
                          }
                          aria-label={t.action.delete}
                        >
                          <Trash2 className="h-4 w-4 text-error-fg" aria-hidden />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            <FileText className="h-4 w-4 text-accent-600" aria-hidden />
            {t.comms.documents}
          </h2>
          {canManage ? (
            <Button size="sm" onClick={() => setDocOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" aria-hidden />
              {t.comms.addDocument}
            </Button>
          ) : null}
        </div>
        {documents.length === 0 ? (
          <EmptyState icon={FileText} title={t.comms.noDocuments} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium text-brand-900">{d.title}</div>
                    <div className="text-xs text-slate-500">
                      {d.category ? `${d.category} · ` : ""}
                      {d.original_name} · {formatBytes(d.size_bytes)}
                      {d.uploader_name
                        ? ` · ${interpolate(t.comms.uploadedBy, { name: d.uploader_name })}`
                        : ""}
                    </div>
                    {d.description ? (
                      <div className="mt-0.5 text-sm text-slate-600">{d.description}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={`/api/files/${d.storage_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-1 h-4 w-4" aria-hidden />
                        {t.comms.download}
                      </a>
                    </Button>
                    {canManage ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === d.id}
                        onClick={() => run(d.id, deleteDocumentAction(d.id), t.success.deleted)}
                        aria-label={t.action.delete}
                      >
                        <Trash2 className="h-4 w-4 text-error-fg" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {canManage ? (
        <>
          <AnnouncementForm
            open={annOpen}
            onOpenChange={setAnnOpen}
            onDone={() => router.refresh()}
          />
          <DocumentForm open={docOpen} onOpenChange={setDocOpen} onDone={() => router.refresh()} />
        </>
      ) : null}
    </>
  );
}

function AnnouncementForm({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pinned, setPinned] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setPinned(false);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error(t.error.validation);
      return;
    }
    setSaving(true);
    const res = await createAnnouncementAction({ title, body, pinned });
    setSaving(false);
    if (res.ok) {
      toast.success(t.success.saved);
      onOpenChange(false);
      onDone();
    } else toast.error(res.error);
  }

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title={t.comms.addAnnouncement} width="md">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <SlideOver.Body className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="an_title">{t.comms.announcementTitle}</Label>
            <Input
              id="an_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="an_body">{t.comms.announcementBody}</Label>
            <Textarea
              id="an_body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-brand-900">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-slate-300 text-accent-500 focus-visible:ring-2 focus-visible:ring-ring"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            {t.comms.pin}
          </label>
        </SlideOver.Body>
        <SlideOver.Footer>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t.action.cancel}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu…" : t.action.save}
          </Button>
        </SlideOver.Footer>
      </form>
    </SlideOver>
  );
}

function DocumentForm({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setCategory("");
      setFile(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t.error.validation);
      return;
    }
    if (!file) {
      toast.error("Vui lòng chọn tệp.");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("category", category);
    fd.set("file", file);
    const res = await uploadDocumentAction(fd);
    setSaving(false);
    if (res.ok) {
      toast.success(t.success.saved);
      onOpenChange(false);
      onDone();
    } else toast.error(res.error);
  }

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title={t.comms.addDocument} width="md">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <SlideOver.Body className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doc_title">{t.comms.docTitle}</Label>
            <Input
              id="doc_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc_cat">{t.comms.docCategory}</Label>
            <Input id="doc_cat" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc_desc">{t.comms.docDescription}</Label>
            <Textarea
              id="doc_desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc_file">{t.comms.docFile}</Label>
            <Input
              id="doc_file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
        </SlideOver.Body>
        <SlideOver.Footer>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t.action.cancel}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Đang tải…" : t.action.upload}
          </Button>
        </SlideOver.Footer>
      </form>
    </SlideOver>
  );
}
