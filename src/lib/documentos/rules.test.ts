import { describe, expect, it } from "vitest";
import { normalizeTag } from "@/lib/text";
import {
  advertenciasArchivos,
  faltantesParaPublicar,
  modelosSinLineaCubierta,
  parseEtiquetas,
} from "./rules";

describe("faltantesParaPublicar", () => {
  it("documento completo: nada falta", () => {
    expect(
      faltantesParaPublicar({
        titulo: "X",
        tipoId: "t",
        cantidadArchivos: 1,
        cantidadMaquinas: 1,
        cantidadProductos: 0,
      }),
    ).toEqual([]);
  });

  it("alcanza con un producto si no corresponde a una máquina", () => {
    expect(
      faltantesParaPublicar({
        titulo: "Monitor",
        tipoId: "t",
        cantidadArchivos: 1,
        cantidadMaquinas: 0,
        cantidadProductos: 1,
      }),
    ).toEqual([]);
  });

  it("lista todo lo que falta", () => {
    expect(
      faltantesParaPublicar({
        titulo: "  ",
        tipoId: null,
        cantidadArchivos: 0,
        cantidadMaquinas: 0,
        cantidadProductos: 0,
      }),
    ).toHaveLength(4);
  });
});

describe("advertenciasArchivos", () => {
  const video = {
    nombre: "video.mp4",
    modoAcceso: "publico" as const,
    disponible: true,
  };

  const soloFabrica = { visibleConcesionarios: false, visibleClientes: false };
  const conc = { visibleConcesionarios: true, visibleClientes: false };

  it("avisa video público en documento Solo fábrica", () => {
    expect(advertenciasArchivos(soloFabrica, [video])).toHaveLength(1);
  });

  it("no avisa si el documento es para concesionarios o clientes", () => {
    expect(advertenciasArchivos(conc, [video])).toEqual([]);
    expect(
      advertenciasArchivos({ ...soloFabrica, visibleClientes: true }, [video]),
    ).toEqual([]);
  });

  it("avisa archivos no disponibles", () => {
    expect(
      advertenciasArchivos(conc, [
        { ...video, modoAcceso: "servidor", disponible: false },
      ]),
    ).toHaveLength(1);
  });
});

describe("modelosSinLineaCubierta", () => {
  it("descarta modelos cuya línea ya está asociada", () => {
    const modelos = [
      { id: "m1", lineaId: "gringa" },
      { id: "m2", lineaId: "plantor" },
    ];
    expect(modelosSinLineaCubierta(["gringa"], modelos)).toEqual(["m2"]);
  });
});

describe("parseEtiquetas", () => {
  it("separa por coma, limpia y quita repetidos equivalentes", () => {
    expect(
      parseEtiquetas(
        "dosificador, Sensor ,, Dosificádor,  cardán  ",
        normalizeTag,
      ),
    ).toEqual(["dosificador", "Sensor", "cardán"]);
  });
});
