import type { Session, Driver } from '../store';
import { sendTelegramAlert } from './telegram';

export interface EscalationStatus {
  sessionId: string;
  t20Pinged: boolean;
  t120Escalated: boolean;
}

const escalationTracking = new Map<string, EscalationStatus>();

/**
 * Checks session age after claim and fires required notifications:
 * - T = 20s: UI reminder notification callback
 * - T = 120s: Backup proxy SMS
 */
export async function checkSessionEscalation(
  session: Session,
  driver?: Driver,
  onT20Ping?: (session: Session) => void,
  onT120Escalate?: (session: Session) => void
): Promise<EscalationStatus | null> {
  if (session.status !== 'claimed' || !session.claimedAt) {
    return null;
  }

  const elapsedSec = Math.floor((Date.now() - session.claimedAt) / 1000);
  const status = escalationTracking.get(session.id) || {
    sessionId: session.id,
    t20Pinged: false,
    t120Escalated: false,
  };

  // T = 20s reminder
  if (elapsedSec >= 20 && !status.t20Pinged) {
    status.t20Pinged = true;
    escalationTracking.set(session.id, status);
    if (onT20Ping) {
      onT20Ping(session);
    }
  }

  // T = 120s escalation to backup proxy phone
  if (elapsedSec >= 120 && !status.t120Escalated && driver?.proxyPhone) {
    status.t120Escalated = true;
    escalationTracking.set(session.id, status);

    if (onT120Escalate) {
      onT120Escalate(session);
    }

    sendTelegramAlert({
      kind: 'escalation',
      senderName: session.senderName,
      amount: session.amount,
      token: session.token,
    }).catch(() => {});
  }

  return status;
}

export function getEscalationStatus(sessionId: string): EscalationStatus | undefined {
  return escalationTracking.get(sessionId);
}

export function clearEscalationTracking(): void {
  escalationTracking.clear();
}
