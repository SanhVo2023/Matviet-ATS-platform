"use client";

import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Strikethrough,
  Quote,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Disabled state — wired through Tiptap's `editable` prop. */
  disabled?: boolean;
  /** Override the styling of the rendered content area. */
  className?: string;
  /** Aria-label for the editor itself; falls back to "Trình soạn thảo". */
  ariaLabel?: string;
}

/**
 * Tiptap-based rich text editor.
 *
 * Output is sanitized by Tiptap's schema (StarterKit only allows the marks/nodes
 * we configured) — we don't accept arbitrary HTML, just paragraphs, headings,
 * lists, bold/italic/strike, blockquote.
 *
 * Vietnamese diacritics: rendered via `font-sans` which is Be Vietnam Pro.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  ariaLabel,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // SSR-safe per Tiptap docs
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
    ],
    content: value || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none min-h-[120px] focus:outline-none",
          "prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900",
          "prose-li:my-0 prose-ul:my-2 prose-ol:my-2",
          "[&_p.is-editor-empty:first-child]:before:text-slate-400",
          "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
          "[&_p.is-editor-empty:first-child]:before:float-left",
          "[&_p.is-editor-empty:first-child]:before:h-0",
          "[&_p.is-editor-empty:first-child]:before:pointer-events-none",
        ),
        "data-placeholder": placeholder || "",
        "aria-label": ariaLabel || "Trình soạn thảo",
        lang: "vi",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // StarterKit emits "<p></p>" for empty content — normalize to empty string
      // so Zod required-string validators see it as blank.
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Keep editor in sync when parent value changes (e.g. form reset).
  React.useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className={cn("min-h-[160px] rounded-md border border-input bg-background", className)}
        aria-busy
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      <Toolbar editor={editor} disabled={!!disabled} />
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

const TOOLBAR_BUTTON =
  "inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 data-[active=true]:bg-slate-100 data-[active=true]:text-slate-900";

function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const button = (label: string, icon: React.ReactNode, isActive: boolean, run: () => void) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        run();
      }}
      disabled={disabled}
      data-active={isActive}
      className={TOOLBAR_BUTTON}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-1.5">
      {button("In đậm", <Bold className="h-3.5 w-3.5" aria-hidden />, editor.isActive("bold"), () =>
        editor.chain().focus().toggleBold().run(),
      )}
      {button(
        "In nghiêng",
        <Italic className="h-3.5 w-3.5" aria-hidden />,
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
      )}
      {button(
        "Gạch ngang",
        <Strikethrough className="h-3.5 w-3.5" aria-hidden />,
        editor.isActive("strike"),
        () => editor.chain().focus().toggleStrike().run(),
      )}
      <Separator />
      {button(
        "Tiêu đề lớn",
        <Heading2 className="h-3.5 w-3.5" aria-hidden />,
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      )}
      {button(
        "Tiêu đề nhỏ",
        <Heading3 className="h-3.5 w-3.5" aria-hidden />,
        editor.isActive("heading", { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      )}
      <Separator />
      {button(
        "Danh sách",
        <List className="h-3.5 w-3.5" aria-hidden />,
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
      )}
      {button(
        "Danh sách đánh số",
        <ListOrdered className="h-3.5 w-3.5" aria-hidden />,
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
      )}
      {button(
        "Trích dẫn",
        <Quote className="h-3.5 w-3.5" aria-hidden />,
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run(),
      )}
      <Separator />
      {button("Hoàn tác", <Undo2 className="h-3.5 w-3.5" aria-hidden />, false, () =>
        editor.chain().focus().undo().run(),
      )}
      {button("Làm lại", <Redo2 className="h-3.5 w-3.5" aria-hidden />, false, () =>
        editor.chain().focus().redo().run(),
      )}
    </div>
  );
}

function Separator() {
  return <span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden />;
}
