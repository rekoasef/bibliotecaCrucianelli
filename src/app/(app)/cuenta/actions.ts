"use server";

import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import type { FormState } from "@/components/forms/form-state";
import { auth } from "@/lib/auth/auth";
import { requireUser } from "@/lib/auth/session";

export async function updateNombre(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .string()
    .trim()
    .min(2, "Ingresá tu nombre.")
    .max(120)
    .safeParse(formData.get("nombre"));
  if (!parsed.success) {
    return { fieldErrors: { nombre: [parsed.error.issues[0].message] } };
  }

  await db
    .update(usuarios)
    .set({ nombre: parsed.data })
    .where(eq(usuarios.id, user.id));
  revalidatePath("/cuenta");
  return { success: "Nombre actualizado." };
}

const changePasswordSchema = z
  .object({
    actual: z.string().min(1, "Ingresá tu contraseña actual."),
    nueva: z
      .string()
      .min(8, "La contraseña tiene que tener al menos 8 caracteres.")
      .max(128, "La contraseña es demasiado larga."),
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });

export async function changePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.actual,
        newPassword: parsed.data.nueva,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return {
        fieldErrors: { actual: ["La contraseña actual no es correcta."] },
      };
    }
    throw error;
  }

  return {
    success:
      "Contraseña cambiada. Se cerraron tus sesiones en otros dispositivos.",
  };
}
