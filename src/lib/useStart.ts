import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { startSession, useSessions, useUserId, type Template } from "./data";

export function useStartWorkout() {
  const uid = useUserId();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const sessions = useSessions();
  const [busy, setBusy] = useState(false);
  const active = (sessions.data ?? []).find((s) => s.status === "active" || s.status === "paused");

  async function start(t: Template, reduced = false) {
    if (t.kind === "run") {
      navigate({ to: "/traning/lopning" });
      return;
    }
    if (active) {
      toast("Du har ett pågående pass – vi fortsätter där du var.");
      navigate({ to: "/traning/pass/$sessionId", params: { sessionId: active.id } });
      return;
    }
    setBusy(true);
    try {
      const s = await startSession(uid, t, reduced);
      await qc.invalidateQueries({ queryKey: ["sessions"] });
      navigate({ to: "/traning/pass/$sessionId", params: { sessionId: s.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte starta passet");
    } finally {
      setBusy(false);
    }
  }
  return { start, busy, active };
}
