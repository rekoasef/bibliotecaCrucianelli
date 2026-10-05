import { BrandMark } from "./brand-mark";
import { DesktopNav } from "./desktop-nav";

export function SiteHeader({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-t-[3px] border-b border-t-brand bg-card">
      <div className="mx-auto flex h-(--header-height) max-w-6xl items-center justify-between px-4 md:px-6">
        <BrandMark />
        <DesktopNav isAdmin={isAdmin} />
      </div>
    </header>
  );
}
