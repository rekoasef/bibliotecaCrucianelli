import { BrandMark } from "@/components/layout/brand-mark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      {/* Pizarra arriba con el logo; la franja roja con el título la pone AuthCard. */}
      <div className="bg-slate">
        <div className="mx-auto w-full max-w-md px-4 py-4">
          <BrandMark />
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10">
        {children}
      </main>
    </div>
  );
}
