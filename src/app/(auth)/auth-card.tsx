export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Franja roja de borde a borde bajo la barra pizarra, como el resto de la app. */}
      <div className="mx-[calc(50%-50vw)] bg-brand franja-trazos text-white">
        <div className="mx-auto max-w-md px-4 pt-6 pb-7">
          <h1 className="font-display text-[1.75rem] leading-tight font-extrabold">
            {title}
          </h1>
        </div>
      </div>
      <section className="flex flex-col gap-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        {description && <p className="text-muted-foreground">{description}</p>}
        {children}
      </section>
    </>
  );
}
