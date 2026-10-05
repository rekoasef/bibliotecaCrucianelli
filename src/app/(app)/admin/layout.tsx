import { requireAdmin } from "@/lib/auth/session";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <aside className="lg:w-52 lg:shrink-0">
        <p className="mb-2 hidden px-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase lg:block">
          Administración
        </p>
        <AdminNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
