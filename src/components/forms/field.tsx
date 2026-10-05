import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  errors?: string[];
  hint?: string;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
};

/** Label visible + control + ayuda + error debajo, conectados por aria-describedby. */
export function Field({
  id,
  label,
  errors,
  hint,
  className,
  children,
}: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const hasError = Boolean(errors?.length);
  const describedBy = [hint && hintId, hasError && errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-invalid": hasError || undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {hasError && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {errors![0]}
        </p>
      )}
    </div>
  );
}
