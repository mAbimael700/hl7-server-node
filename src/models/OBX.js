export function OBX(segment) {
  if (segment.type !== "OBX") {
    throw new Error("El segmento no corresponde a este modelo.");
  }

  const fields = segment.fields;

  return {
    clave: fields[14] ?? undefined,
    nombre: fields[4].replaceAll("^", " ") ?? undefined,
    resultado: parseFloat(fields[5]).toFixed(2) ?? undefined,
  };
}


