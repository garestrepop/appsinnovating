// Clases Tailwind compartidas para mantener consistente el tema oscuro
// (negro, morado eléctrico, azul eléctrico, texto blanco) entre formularios.

export const cardClass = "rounded-lg border border-border bg-surface p-4";

export const inputClass =
  "rounded-md border border-border bg-black/40 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple";

export const primaryButtonClass =
  "rounded-md bg-gradient-to-r from-accent-purple to-accent-blue px-4 py-2 text-sm font-medium text-white shadow-[0_0_16px_rgba(56,189,248,0.25)] hover:opacity-90 disabled:opacity-50";

export const secondaryButtonClass =
  "rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-hover disabled:opacity-50";
