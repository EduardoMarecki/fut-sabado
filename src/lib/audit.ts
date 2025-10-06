import { supabase } from "@/integrations/supabase/client";

type AuditDetails = Record<string, any> | null | undefined;

export async function logEvent(
  event: string,
  entityType: string,
  entityId: string | null,
  details?: AuditDetails
) {
  try {
    await supabase.from("audit_log").insert({
      event,
      entity_type: entityType,
      entity_id: entityId,
      details: details ?? null,
    });
  } catch (err) {
    // Não falhar o fluxo principal por causa da auditoria
    console.warn("Audit log failed:", err);
  }
}