// Motor de sugerencias de preguntas basado en reglas (palabras clave).
//
// Esto es un placeholder mientras se conecta un LLM real (Anthropic/OpenAI).
// La función `generateSuggestions` tiene la firma que un motor con IA
// necesitaría (transcript + contexto ya cubierto -> lista de sugerencias),
// así que reemplazar la implementación interna por una llamada a un LLM
// no debería requerir cambios en quien la consume (ver app/api/.../suggestions/route.ts).

export interface SuggestionRule {
  category: string;
  keywords: string[];
  question: string;
  reason: string;
}

export const SUGGESTION_RULES: SuggestionRule[] = [
  {
    category: "Usuarios y roles",
    keywords: ["usuario", "usuarios", "rol", "roles", "perfil", "permisos"],
    question:
      "¿Qué tipos de usuario tendrá el sistema y qué puede hacer cada uno (permisos)?",
    reason: "Se mencionaron usuarios/roles; hay que definir los perfiles de acceso.",
  },
  {
    category: "Integraciones",
    keywords: ["integra", "integración", "api", "conectar", "sistema externo", "erp", "crm"],
    question:
      "¿Con qué sistemas externos necesita integrarse la aplicación (APIs, ERP, CRM, pasarelas)?",
    reason: "Se mencionó una integración con otro sistema.",
  },
  {
    category: "Rendimiento y escalabilidad",
    keywords: ["lento", "rápido", "rendimiento", "escalar", "concurrentes", "picos de uso"],
    question:
      "¿Cuántos usuarios concurrentes se esperan y hay picos de uso previsibles (ej. fin de mes)?",
    reason: "Se habló de velocidad/carga; conviene precisar el requerimiento de rendimiento.",
  },
  {
    category: "Seguridad",
    keywords: ["seguridad", "contraseña", "encriptar", "cifrado", "datos sensibles", "confidencial"],
    question:
      "¿Qué nivel de seguridad se requiere para los datos sensibles (cifrado, autenticación multifactor, control de acceso)?",
    reason: "Se mencionó seguridad o datos sensibles.",
  },
  {
    category: "Disponibilidad y SLA",
    keywords: ["disponibilidad", "24/7", "caída", "downtime", "sla"],
    question:
      "¿Qué disponibilidad se necesita (por ejemplo 99.9%) y qué pasa si el sistema se cae unos minutos?",
    reason: "Se habló de disponibilidad o tiempo de actividad.",
  },
  {
    category: "Datos y almacenamiento",
    keywords: ["base de datos", "almacenar", "histórico", "volumen de datos", "migrar datos"],
    question:
      "¿Qué volumen de datos se manejará y por cuánto tiempo deben conservarse los históricos?",
    reason: "Se mencionó almacenamiento o volumen de datos.",
  },
  {
    category: "Reportes",
    keywords: ["reporte", "reportes", "informe", "dashboard", "indicador", "kpi"],
    question:
      "¿Qué reportes o indicadores (KPIs) necesita ver el cliente y con qué frecuencia?",
    reason: "Se mencionaron reportes, dashboards o indicadores.",
  },
  {
    category: "Notificaciones",
    keywords: ["notificar", "notificación", "alerta", "correo", "email", "sms", "whatsapp"],
    question:
      "¿Qué eventos deben generar notificaciones y por qué canal (correo, SMS, push, WhatsApp)?",
    reason: "Se mencionaron notificaciones o alertas.",
  },
  {
    category: "Dispositivos y plataformas",
    keywords: ["móvil", "celular", "tablet", "app", "navegador", "escritorio", "responsive"],
    question:
      "¿Desde qué dispositivos se usará la aplicación (celular, tablet, computador) y debe funcionar sin internet?",
    reason: "Se mencionaron dispositivos o plataformas de uso.",
  },
  {
    category: "Presupuesto y tiempo",
    keywords: ["presupuesto", "costo", "fecha límite", "plazo", "cuándo", "lanzar"],
    question:
      "¿Cuál es el presupuesto aproximado y la fecha en la que necesitan tener el sistema funcionando?",
    reason: "Se mencionó presupuesto o plazos.",
  },
  {
    category: "Flujos de aprobación",
    keywords: ["aprobar", "aprobación", "autorizar", "firma", "flujo de trabajo", "workflow"],
    question:
      "¿Existen pasos de aprobación o autorización antes de que una acción quede confirmada?",
    reason: "Se mencionó un flujo de aprobación.",
  },
  {
    category: "Pagos",
    keywords: ["pago", "pagos", "factura", "cobrar", "tarjeta", "pasarela de pago"],
    question:
      "¿Cómo se procesarán los pagos (pasarela, facturación) y qué monedas o impuestos aplican?",
    reason: "Se mencionaron pagos o facturación.",
  },
  {
    category: "Idiomas y localización",
    keywords: ["idioma", "idiomas", "traducir", "país", "moneda"],
    question:
      "¿La aplicación debe soportar varios idiomas, monedas o zonas horarias?",
    reason: "Se mencionaron idiomas o localización.",
  },
  {
    category: "Accesibilidad",
    keywords: ["accesibilidad", "discapacidad", "lector de pantalla"],
    question:
      "¿Hay requisitos de accesibilidad (lectores de pantalla, contraste, tamaños de fuente)?",
    reason: "Se mencionó accesibilidad.",
  },
  {
    category: "Respaldo y continuidad",
    keywords: ["respaldo", "backup", "recuperación", "desastre"],
    question:
      "¿Con qué frecuencia se necesitan respaldos (backups) y cuál es el plan si se pierden datos?",
    reason: "Se mencionaron respaldos o recuperación ante desastres.",
  },
];

export const STARTER_QUESTIONS: SuggestionRule[] = [
  {
    category: "Objetivo del proyecto",
    keywords: [],
    question:
      "¿Cuál es el problema principal que el cliente quiere resolver con esta aplicación?",
    reason: "Pregunta inicial recomendada para toda entrevista de requerimientos.",
  },
  {
    category: "Usuarios y roles",
    keywords: [],
    question: "¿Quiénes van a usar el sistema día a día?",
    reason: "Pregunta inicial recomendada para toda entrevista de requerimientos.",
  },
  {
    category: "Éxito del proyecto",
    keywords: [],
    question:
      "¿Cómo sabría el cliente que el proyecto fue un éxito, un mes después de lanzado?",
    reason: "Pregunta inicial recomendada para toda entrevista de requerimientos.",
  },
];

export interface Suggestion {
  category: string;
  question: string;
  reason: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Genera sugerencias de preguntas a partir del transcript acumulado.
 * `coveredCategories` son categorías para las que ya se generó una sugerencia
 * en esta sesión (para no repetir).
 */
export function generateSuggestions(
  transcript: string,
  coveredCategories: string[]
): Suggestion[] {
  const normalizedTranscript = normalize(transcript ?? "");
  const covered = new Set(coveredCategories);

  if (!normalizedTranscript.trim()) {
    return STARTER_QUESTIONS.filter((r) => !covered.has(r.category)).map(
      (r) => ({ category: r.category, question: r.question, reason: r.reason })
    );
  }

  const matches: Suggestion[] = [];
  for (const rule of SUGGESTION_RULES) {
    if (covered.has(rule.category)) continue;
    const hit = rule.keywords.some((kw) =>
      normalizedTranscript.includes(normalize(kw))
    );
    if (hit) {
      matches.push({
        category: rule.category,
        question: rule.question,
        reason: rule.reason,
      });
    }
  }
  return matches;
}
