"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import {
  EmailComposerDialog,
  type ComposerDefaults,
  type ComposerTemplateInfo,
} from "./EmailComposerDialog";

interface Props {
  templates: ComposerTemplateInfo[];
  defaults?: ComposerDefaults;
  /** Visual size + label override. Defaults to a medium primary button. */
  variant?: "primary" | "outline";
  size?: "sm" | "md";
  label?: string;
}

/** Reusable trigger that opens the email composer slide-over. */
export function ComposeEmailButton({
  templates,
  defaults,
  variant = "primary",
  size = "md",
  label,
}: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={variant === "outline" ? "outline" : "default"}
        size={size === "sm" ? "sm" : "default"}
        className="gap-2"
      >
        <Mail className="h-4 w-4" aria-hidden /> {label ?? t.emails.action.compose}
      </Button>
      <EmailComposerDialog
        open={open}
        onOpenChange={setOpen}
        templates={templates}
        defaults={defaults}
      />
    </>
  );
}
