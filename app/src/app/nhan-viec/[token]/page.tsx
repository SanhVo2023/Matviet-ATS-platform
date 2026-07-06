import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { getOfferByToken } from "@/server/offers/service";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/card";
import { OfferResponseCard } from "@/components/features/offer-public/OfferResponseCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Xác nhận nhận việc — Mắt Việt",
  robots: { index: false, follow: false },
};

/**
 * Public offer accept/decline page (G12). The token IS the authorization —
 * same philosophy as /test/[token]. Idempotent: revisits after answering show
 * the recorded outcome.
 */
export default async function OfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const offer = await getOfferByToken(token);

  if (!offer || offer.expired) {
    return (
      <Shell>
        <div className="flex items-start gap-3 p-6">
          <AlertTriangle className="mt-1 h-6 w-6 text-error" aria-hidden />
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {offer ? "Liên kết đã hết hạn" : "Liên kết không hợp lệ"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Vui lòng liên hệ Phòng Nhân sự Mắt Việt qua{" "}
              <a className="text-primary-600 hover:underline" href="mailto:hr@matviet.com.vn">
                hr@matviet.com.vn
              </a>{" "}
              để được hỗ trợ.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <OfferResponseCard
        token={token}
        candidateName={offer.candidate_name}
        jobTitle={offer.job_title}
        responded={offer.responded}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-6">
        <Logo variant="primary" width={150} height={44} priority />
        <Card className="w-full">{children}</Card>
      </main>
      <footer className="px-6 py-8 text-center text-xs text-slate-500">
        Mắt Việt — Hệ thống tuyển dụng
      </footer>
    </div>
  );
}
