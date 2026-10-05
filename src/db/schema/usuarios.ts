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

export const rolUsuario = pgEnum("rol_usuario", [
  "admin",
  "fabrica",
  "concesionario",
]);

const timestamps = {
  creadoEn: timestamp("creado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const concesionarios = pgTable("concesionarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull().unique(),
  localidad: text("localidad").notNull(),
  provincia: text("provincia").notNull(),
  activo: boolean("activo").notNull().default(true),
  ...timestamps,
});

// También es la tabla de usuarios de Better Auth (ver src/lib/auth/auth.ts):
// `nombre`, `email_verificado` e `imagen` son los campos que la librería exige.
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

export type Concesionario = typeof concesionarios.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type RolUsuario = (typeof rolUsuario.enumValues)[number];
