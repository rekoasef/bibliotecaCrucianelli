import { z } from "zod";
import { rolUsuario } from "@/db/schema/usuarios";

const texto = (campo: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `Completá ${campo}.`)
    .max(max, `${campo} es demasiado largo.`);

export const concesionarioSchema = z.object({
  nombre: texto("el nombre"),
  localidad: texto("la localidad"),
  provincia: texto("la provincia"),
});

export const usuarioSchema = z
  .object({
    nombre: texto("el nombre"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Ingresá un email válido.")),
    rol: z.enum(rolUsuario.enumValues, { error: "Elegí un rol." }),
    concesionarioId: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .pipe(z.uuid().nullable()),
  })
  .superRefine((data, ctx) => {
    if (data.rol === "concesionario" && !data.concesionarioId) {
      ctx.addIssue({
        code: "custom",
        path: ["concesionarioId"],
        message: "Elegí el concesionario del usuario.",
      });
    }
  })
  // Solo los usuarios de rol concesionario pertenecen a un concesionario (CHECK en la base).
  .transform((data) => ({
    ...data,
    concesionarioId: data.rol === "concesionario" ? data.concesionarioId : null,
  }));

export type UsuarioInput = z.infer<typeof usuarioSchema>;
