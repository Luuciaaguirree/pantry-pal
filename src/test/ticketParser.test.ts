import { describe, it, expect } from "vitest";
import { parseTicketText } from "@/lib/ticketParser";

const SAMPLE_TICKET = `
SUPERMERCADO MERCADONA S.A.
CIF A-46103834
C/ EJEMPLO 12, VALENCIA
TEL. 961234567
FACTURA SIMPLIFICADA
FECHA: 11/05/2026  HORA: 18:23
-----------------------------
LECH SEMI 1L           1,05
YOG NAT 4X125          1,85
TOM RAF 0,540 KG       2,15
PLAT CAN 1,200 KG      1,79
PAN INT                1,20
PRD ESP 1              0,99
JABON LAVAVAJ          2,49
-----------------------------
SUBTOTAL              11,52
IVA 10%                1,15
TOTAL                 12,67
TARJETA              12,67
VISA ****1234
AUTORIZACION 123456
GRACIAS POR SU COMPRA
`;

describe("parseTicketText", () => {
  const items = parseTicketText(SAMPLE_TICKET);

  it("ignores headers, totals, IVA, payment and promo lines", () => {
    const originals = items.map((i) => i.texto_original.toUpperCase());
    expect(originals.some((o) => o.includes("TOTAL"))).toBe(false);
    expect(originals.some((o) => o.includes("IVA"))).toBe(false);
    expect(originals.some((o) => o.includes("TARJETA"))).toBe(false);
    expect(originals.some((o) => o.includes("CIF"))).toBe(false);
    expect(originals.some((o) => o.includes("MERCADONA"))).toBe(false);
    expect(originals.some((o) => o.includes("FECHA"))).toBe(false);
  });

  it("expands known abbreviations with high confidence", () => {
    const yog = items.find((i) => i.texto_original.startsWith("YOG NAT"));
    expect(yog).toBeDefined();
    expect(yog!.producto_detectado).toBe("Yogur natural");
    expect(yog!.confianza).toBe("alta");
    expect(yog!.estado).toBe("confirmado");

    const lech = items.find((i) => i.texto_original.startsWith("LECH SEMI"));
    expect(lech!.producto_detectado).toBe("Leche semidesnatada");
  });

  it("keeps original text on every item", () => {
    items.forEach((i) => expect(i.texto_original.length).toBeGreaterThan(0));
  });

  it("marks ambiguous lines as 'No reconocido' / revisar", () => {
    const prd = items.find((i) => i.texto_original.startsWith("PRD ESP"));
    expect(prd).toBeDefined();
    expect(prd!.producto_detectado).toBe("No reconocido");
    expect(prd!.estado).toBe("revisar");
    expect(prd!.confianza).toBe("baja");
  });

  it("does not invent products from lines without a price", () => {
    const out = parseTicketText("PANADERIA\nFRUTA\nVERDURAS");
    expect(out).toEqual([]);
  });

  it("extracts a numeric price when present", () => {
    const yog = items.find((i) => i.texto_original.startsWith("YOG NAT"))!;
    expect(yog.precio).toBeCloseTo(1.85, 2);
  });
});
