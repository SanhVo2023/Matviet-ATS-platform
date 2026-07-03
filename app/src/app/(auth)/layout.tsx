import { AuthSplash } from "./AuthSplash";

/**
 * Auth shell — navy-chrome splash with GSAP entrance (design-language §4.1).
 * The auth card itself must sit on a raised white surface (children render
 * inside a Card). No session check here; middleware bounces signed-in users.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content">
      <a href="#auth-card" className="skip-link">
        Bỏ qua đến nội dung
      </a>
      <AuthSplash>{children}</AuthSplash>
    </main>
  );
}
