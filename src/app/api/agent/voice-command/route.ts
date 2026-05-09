import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

const voiceIntentSchema = z.object({
  kind: z.enum([
    "navigate_map",
    "approve_public_alert",
    "hold_public_alert",
    "publish_x_alert",
    "contact_emergency_services",
    "summarize_status",
    "noop",
  ]),
  targetId: z
    .enum(["costanera-vitacura", "shoa-valparaiso", "conaf-metropolitano"])
    .optional(),
  service: z.enum(["SAMU", "Bomberos", "Carabineros", "SENAPRED"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  reason: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const voiceCommandResponseSchema = z.object({
  intent: voiceIntentSchema,
  spokenResponse: z.string(),
});

type VoiceCommandResponse = z.infer<typeof voiceCommandResponseSchema>;

export async function POST(request: Request) {
  const { transcript, context } = (await request.json()) as {
    transcript?: string;
    context?: unknown;
  };

  if (!transcript?.trim()) {
    return Response.json(
      {
        intent: { kind: "noop", confidence: 0 },
        spokenResponse: "No recibi una instruccion de voz util.",
      } satisfies VoiceCommandResponse,
      { status: 400 },
    );
  }

  try {
    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      system: [
        "You are CrisisGrid's voice operator parser.",
        "Convert Spanish or English operator speech into one safe structured intent.",
        "Never claim that a real emergency service, X/Twitter, SENAPRED, police, fire or medical call has been contacted.",
        "Sensitive public actions must be approval intents, not direct execution.",
        "Use contact_emergency_services only when the operator explicitly asks to call, contact, dispatch, notify or alert an emergency service.",
        "Use navigate_map for map movement commands.",
        "Keep spokenResponse short, operational and in Spanish.",
      ].join(" "),
      prompt: JSON.stringify({
        transcript,
        context,
        availableMapTargets: [
          { targetId: "costanera-vitacura", label: "Vitacura / Costanera" },
          { targetId: "shoa-valparaiso", label: "SHOA Valparaiso coast" },
          { targetId: "conaf-metropolitano", label: "CONAF Cerro San Cristobal" },
        ],
        allowedServices: ["SAMU", "Bomberos", "Carabineros", "SENAPRED"],
      }),
      output: Output.object({ schema: voiceCommandResponseSchema }),
    });

    return Response.json(output);
  } catch {
    return Response.json(localVoiceFallback(transcript));
  }
}

function localVoiceFallback(transcript: string): VoiceCommandResponse {
  const normalized = transcript
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (normalized.includes("valparaiso") || normalized.includes("shoa")) {
    return {
      intent: { kind: "navigate_map", targetId: "shoa-valparaiso", confidence: 0.72 },
      spokenResponse: "Moviendo el mapa hacia Valparaiso.",
    };
  }

  if (normalized.includes("conaf") || normalized.includes("san cristobal")) {
    return {
      intent: { kind: "navigate_map", targetId: "conaf-metropolitano", confidence: 0.72 },
      spokenResponse: "Moviendo el mapa hacia el foco CONAF metropolitano.",
    };
  }

  if (normalized.includes("mapa") || normalized.includes("vitacura") || normalized.includes("costanera")) {
    return {
      intent: { kind: "navigate_map", targetId: "costanera-vitacura", confidence: 0.78 },
      spokenResponse: "Moviendo el mapa hacia Vitacura y Costanera.",
    };
  }

  if (normalized.includes("autoriza") || normalized.includes("aprueba")) {
    return {
      intent: { kind: "approve_public_alert", confidence: 0.76 },
      spokenResponse: "Aprobando la alerta publica pendiente.",
    };
  }

  if (normalized.includes("no autor") || normalized.includes("mant") || normalized.includes("frena")) {
    return {
      intent: { kind: "hold_public_alert", confidence: 0.7 },
      spokenResponse: "Manteniendo la alerta en espera.",
    };
  }

  const service = resolveService(normalized);
  if (service) {
    return {
      intent: {
        kind: "contact_emergency_services",
        service,
        priority: normalized.includes("urgente") ? "critical" : "high",
        reason: "Operator voice request",
        confidence: 0.74,
      },
      spokenResponse: `Preparando solicitud de contacto con ${service}. Requiere aprobacion humana.`,
    };
  }

  return {
    intent: { kind: "summarize_status", confidence: 0.52 },
    spokenResponse: "CrisisGrid sigue monitoreando senales, camaras y acciones pendientes.",
  };
}

function resolveService(normalized: string): VoiceCommandResponse["intent"]["service"] | undefined {
  if (normalized.includes("samu") || normalized.includes("ambulancia") || normalized.includes("medic")) {
    return "SAMU";
  }

  if (normalized.includes("bombero") || normalized.includes("incendio")) {
    return "Bomberos";
  }

  if (normalized.includes("carabinero") || normalized.includes("policia")) {
    return "Carabineros";
  }

  if (normalized.includes("senapred") || normalized.includes("emergencia")) {
    return "SENAPRED";
  }

  return undefined;
}
