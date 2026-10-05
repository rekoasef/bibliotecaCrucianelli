import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <BrandMark />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">No encontramos esta página</h1>
        <p className="text-muted-foreground">
          Puede que el link esté mal o que la sección todavía no exista.
        </p>
      </div>
      <Button asChild size="lg" className="self-start">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
