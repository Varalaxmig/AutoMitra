import type { Session, Driver } from '../store';
import { sendFast2Sms } from './fast2sms';

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
  onT20Ping?: (session: Session) => void
): Promise<void> {
  if (session.status !== 'claimed' || !session.claimedAt) {
    return;
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

    await sendFast2Sms({
      toPhone: driver.proxyPhone,
      kind: 'claim',
      senderName: `${session.senderName} (URGENT 2m Rem)`,
      amount: session.amount,
      sessionId: session.id,
      lang: driver.lang,
    });
  }
}

export function clearEscalationTracking(): void {
  escalationTracking.clear();
}
