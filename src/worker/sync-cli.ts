// Corre la detección de cambios en Drive una vez (además de la tarea nocturna del worker).
//   npm run sync:drive
import "dotenv/config";
import { syncDriveChanges } from "./drive-sync";

syncDriveChanges()
  .then((r) => {
    console.info("Detección de cambios:", r);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
