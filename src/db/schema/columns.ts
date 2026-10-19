/**
 * Columnas comunes a varias tablas.
 *
 * @module
 */

import { timestamp } from "drizzle-orm/pg-core";

/**
 * `creado_en` y `actualizado_en` (este se actualiza solo en cada `update` de
 * Drizzle).
 */
export const timestamps = {
  creadoEn: timestamp("creado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
