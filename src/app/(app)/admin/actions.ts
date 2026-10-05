"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import {
  getUsuario,
  revokeSesionesConcesionario,
  revokeSesionesUsuario,
} from "@/db/queries/usuarios";
import { concesionarios, usuarios } from "@/db/schema";
import type { FormState } from "@/components/forms/form-state";
import { sendInvitation } from "@/lib/auth/invitations";
import { requireAdmin } from "@/lib/auth/session";
import { formatRetryAfter, hit, rateLimits } from "@/lib/rate-limit";
import { concesionarioSchema, usuarioSchema } from "@/lib/validation/admin";

// Cada acción verifica el rol por su cuenta: proteger el layout no protege las Server Actions.

const idSchema = z.uuid();

function formValues(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
}

// ── Concesionarios ──────────────────────────────────────────────────────────

export async function saveConcesionario(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const id = values.id ? idSchema.parse(values.id) : null;

  const parsed = concesionarioSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  let savedId = id;
  try {
    if (id) {
      await db
        .update(concesionarios)
        .set(parsed.data)
        .where(eq(concesionarios.id, id));
    } else {
      const [row] = await db
        .insert(concesionarios)
        .values(parsed.data)
        .returning({ id: concesionarios.id });
      savedId = row.id;
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: { nombre: ["Ya existe un concesionario con ese nombre."] },
        values,
      };
    }
    throw error;
  }

  revalidatePath("/admin/concesionarios");
  if (!id) redirect(`/admin/concesionarios/${savedId}?creado=1`);
  return { success: "Cambios guardados.", values };
}

export async function setConcesionarioActivo(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const activo = formData.get("activo") === "true";

  await db
    .update(concesionarios)
    .set({ activo })
    .where(eq(concesionarios.id, id));
  // Desactivar bloquea el ingreso de todos sus usuarios, también los que ya estaban adentro.
  if (!activo) await revokeSesionesConcesionario(id);

  revalidatePath("/admin/concesionarios");
  revalidatePath(`/admin/concesionarios/${id}`);
}

// ── Usuarios ────────────────────────────────────────────────────────────────

export async function createUsuario(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const parsed = usuarioSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  let usuario: { id: string; email: string; nombre: string };
  try {
    [usuario] = await db.insert(usuarios).values(parsed.data).returning({
      id: usuarios.id,
      email: usuarios.email,
      nombre: usuarios.nombre,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: { email: ["Ya hay un usuario con ese email."] },
        values,
      };
    }
    throw error;
  }

  // Si falla el mail, el usuario igual queda creado y se puede reenviar desde su ficha.
  let invitado = "1";
  try {
    await sendInvitation(usuario);
  } catch (error) {
    console.error("No se pudo enviar la invitación", error);
    invitado = "error";
  }
  revalidatePath("/admin/usuarios");
  redirect(`/admin/usuarios/${usuario.id}?invitado=${invitado}`);
}

export async function updateUsuario(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData);
  const id = idSchema.parse(values.id);

  const parsed = usuarioSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  if (id === admin.id && parsed.data.rol !== "admin") {
    return {
      fieldErrors: { rol: ["No podés quitarte el rol de administrador."] },
      values,
    };
  }

  const anterior = await getUsuario(id);
  if (!anterior) return { error: "El usuario no existe.", values };

  try {
    await db.update(usuarios).set(parsed.data).where(eq(usuarios.id, id));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        fieldErrors: { email: ["Ya hay un usuario con ese email."] },
        values,
      };
    }
    throw error;
  }

  // Cambiar rol o concesionario cambia lo que puede ver: que vuelva a entrar.
  if (
    anterior.rol !== parsed.data.rol ||
    anterior.concesionarioId !== parsed.data.concesionarioId
  ) {
    await revokeSesionesUsuario(id);
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  return { success: "Cambios guardados.", values };
}

export async function setUsuarioActivo(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const activo = formData.get("activo") === "true";
  if (id === admin.id) return; // no desactivarse a sí mismo

  await db.update(usuarios).set({ activo }).where(eq(usuarios.id, id));
  if (!activo) await revokeSesionesUsuario(id);

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
}

export async function resendInvitation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const usuario = await getUsuario(id);
  if (!usuario) return { error: "El usuario no existe." };
  if (!usuario.activo) return { error: "El usuario está desactivado." };
  if (usuario.tienePassword)
    return { error: "El usuario ya definió su contraseña." };

  const limit = await hit(`invitacion:${id}`, rateLimits.invitationResend);
  if (!limit.allowed) {
    return {
      error: `Demasiados reenvíos. Probá de nuevo en ${formatRetryAfter(limit.retryAfterSeconds)}.`,
    };
  }

  try {
    await sendInvitation(usuario);
  } catch (error) {
    console.error("No se pudo reenviar la invitación", error);
    return {
      error:
        "No se pudo enviar el mail. Revisá la configuración de SMTP y probá de nuevo.",
    };
  }
  return { success: `Invitación reenviada a ${usuario.email}.` };
}
