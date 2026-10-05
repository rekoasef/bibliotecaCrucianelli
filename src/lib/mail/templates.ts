const BRAND = "Biblioteca Técnica Crucianelli";

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// HTML simple con estilos en línea: es lo que mejor se ve en todos los clientes de mail.
function layout(
  title: string,
  paragraphs: string[],
  cta: { label: string; url: string },
) {
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#18181b">${escapeHtml(p)}</p>`,
    )
    .join("");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border-top:4px solid #e30613">
<tr><td style="padding:28px 24px">
<p style="margin:0 0 4px;font-size:13px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;color:#52525b">${BRAND}</p>
<h1 style="margin:0 0 20px;font-size:22px;color:#18181b">${escapeHtml(title)}</h1>
${body}
<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#e30613;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 22px;border-radius:10px">${escapeHtml(cta.label)}</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#52525b">Si el botón no funciona, copiá este link en el navegador:<br>${escapeHtml(cta.url)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

export function invitationEmail({
  nombre,
  url,
}: {
  nombre: string;
  url: string;
}) {
  const title = "Te invitaron a la biblioteca técnica";
  const paragraphs = [
    `Hola ${nombre}:`,
    "Te crearon un usuario en la Biblioteca Técnica Crucianelli, donde vas a encontrar manuales, despieces, instructivos y videos de las máquinas.",
    "Para entrar, definí tu contraseña con el siguiente link. Vence en 7 días y se puede usar una sola vez.",
  ];
  const cta = { label: "Definir contraseña", url };
  return {
    subject: title,
    html: layout(title, paragraphs, cta),
    text: `${paragraphs.join("\n\n")}\n\n${url}`,
  };
}

export function passwordResetEmail({
  nombre,
  url,
}: {
  nombre: string;
  url: string;
}) {
  const title = "Restablecer tu contraseña";
  const paragraphs = [
    `Hola ${nombre}:`,
    "Pediste restablecer tu contraseña de la Biblioteca Técnica Crucianelli. El link vence en 1 hora y se puede usar una sola vez.",
    "Si no fuiste vos, ignorá este mail: tu contraseña no cambia.",
  ];
  const cta = { label: "Elegir nueva contraseña", url };
  return {
    subject: title,
    html: layout(title, paragraphs, cta),
    text: `${paragraphs.join("\n\n")}\n\n${url}`,
  };
}
