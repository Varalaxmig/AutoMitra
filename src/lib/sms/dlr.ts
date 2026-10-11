import type { DlrReport } from './types';

/**
 * Fast2SMS Delivery Receipt Webhook Handler (Phase 4 / TASK-18)
 *
 * Fast2SMS posts delivery reports with request_id, status, and timestamp.
 */

export function parseFast2SmsDlr(payload: Record<string, unknown>): DlrReport {
  const messageId = String(
    payload['request_id'] ?? payload['message_id'] ?? payload['id'] ?? ''
  );
  const rawStatus = String(
    payload['status'] ?? payload['delivery_status'] ?? ''
  ).toUpperCase();

  let status: 'DELIVERED' | 'FAILED' | 'PENDING' = 'PENDING';
  if (rawStatus.includes('DELIVER') || rawStatus === 'SUCCESS') {
    status = 'DELIVERED';
  } else if (
    rawStatus.includes('FAIL') ||
    rawStatus.includes('REJECT') ||
    rawStatus === 'UNDELIVERED'
  ) {
    status = 'FAILED';
  }

  const deliveredAt =
    (payload['delivered_at'] as string | undefined) ??
    (payload['timestamp'] as string | undefined) ??
    new Date().toISOString();

  const reason =
    (payload['reason'] as string | undefined) ??
    (payload['error'] as string | undefined);

  return {
    messageId,
    status,
    deliveredAt,
    ...(reason ? { reason } : {}),
  };
}
