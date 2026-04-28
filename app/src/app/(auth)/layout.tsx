import { Logo } from "@/components/layout/Logo";

/**
 * Auth shell — centered card on a soft brand-navy gradient.
 * No session check here; middleware bounces signed-in users to /.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-50 via-white to-white px-4 py-10"
    >
      <a href="#auth-card" className="skip-link">
        Bỏ qua đến nội dung
      </a>
      <div className="mb-8">
        <Logo variant="primary" width={180} height={54} priority />
      </div>
      <div id="auth-card" className="w-full max-w-md">
        {children}
      </div>
    </main>
  );
}
