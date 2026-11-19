// Public screens: the landing page draws its own top bar; the other public placeholders render
// the header themselves (no hospital yet, so the bar is primary).
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
