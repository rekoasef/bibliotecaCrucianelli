import { MARK_END, MARK_START } from "@/lib/search/markers";

/** Fragmento con coincidencias resaltadas. Convierte los marcadores en <mark> (sin HTML crudo). */
export function Highlight({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest) {
    const start = rest.indexOf(MARK_START);
    if (start === -1) {
      parts.push(rest);
      break;
    }
    const end = rest.indexOf(MARK_END, start);
    parts.push(rest.slice(0, start));
    const marked = rest.slice(start + 1, end === -1 ? undefined : end);
    parts.push(
      <mark
        key={key++}
        className="rounded-sm bg-amber-200 px-0.5 text-foreground"
      >
        {marked}
      </mark>,
    );
    rest = end === -1 ? "" : rest.slice(end + 1);
  }
  return <>{parts}</>;
}
