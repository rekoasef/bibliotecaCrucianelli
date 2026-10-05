import { BrandMark } from "@/components/layout/brand-mark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col border-t-[3px] border-t-brand">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
        <BrandMark />
        {children}
      </main>
    </div>
  );
}
