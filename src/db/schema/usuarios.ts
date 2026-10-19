/**
 * Concesionarios y usuarios.
 *
 * @module
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";

/** Roles con cuenta. El cliente final no tiene cuenta (ver `RolLector`). */
export const rolUsuario = pgEnum("rol_usuario", [
  "admin",
  "fabrica",
  "concesionario",
]);

/** Concesionario de la red. Desactivarlo bloquea a todos sus usuarios. */
export const concesionarios = pgTable("concesionarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull().unique(),
  localidad: text("localidad").notNull(),
  provincia: text("provincia").notNull(),
  activo: boolean("activo").notNull().default(true),
  ...timestamps,
});

/**
 * Usuarios de la app. También es la tabla de usuarios de Better Auth (ver
 * `src/lib/auth/auth.ts`): `nombre`, `email_verificado` e `imagen` son los
 * campos que la librería exige.
 *
 * @remarks Un usuario de concesionario tiene que tener concesionario, y solo
 *   él; el email se guarda en minúsculas.
 */
export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    email: text("email").notNull().unique(),
    emailVerificado: boolean("email_verificado").notNull().default(false),
    imagen: text("imagen"),
    rol: rolUsuario("rol").notNull(),
    concesionarioId: uuid("concesionario_id").references(
      () => concesionarios.id,
      { onDelete: "restrict" },
    ),
    activo: boolean("activo").notNull().default(true),
    ultimoIngreso: timestamp("ultimo_ingreso", { withTimezone: true }),
    // Último uso de la app (la sesión se renueva sola, así que el login no alcanza).
    ultimaActividad: timestamp("ultima_actividad", { withTimezone: true }),
    // Cuenta pausada por inactividad; solo el admin la vuelve a habilitar.
    pausadoEn: timestamp("pausado_en", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check(
      "usuarios_rol_concesionario",
      sql`(${t.rol} = 'concesionario') = (${t.concesionarioId} IS NOT NULL)`,
    ),
    check("usuarios_email_minusculas", sql`${t.email} = lower(${t.email})`),
    index("usuarios_concesionario_idx").on(t.concesionarioId),
  ],
);

/** Fila de `concesionarios`. */
export type Concesionario = typeof concesionarios.$inferSelect;

/** Fila de `usuarios`. */
export type Usuario = typeof usuarios.$inferSelect;

/** Rol de un usuario con cuenta. */
export type RolUsuario = (typeof rolUsuario.enumValues)[number];
