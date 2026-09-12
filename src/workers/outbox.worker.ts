import { prisma } from '../infrastructure/database/prisma';

let isRunning = false;

export async function processOutboxEvents() {
  if (isRunning) return;
  isRunning = true;

  try {
    // 1. Atomically claim up to 10 pending events using Postgres SKIP LOCKED.
    // This prevents multiple worker nodes from picking up the same event.
    const events = await prisma.$queryRaw<any[]>`
      UPDATE "OutboxEvent" 
      SET status = 'PROCESSING', "processedAt" = NOW()
      WHERE id IN (
        SELECT id FROM "OutboxEvent" 
        WHERE status = 'PENDING' 
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED 
        LIMIT 10
      )
      RETURNING *;
    `;

    if (events.length === 0) {
      isRunning = false;
      return;
    }

    // 2. Process each event
    for (const event of events) {
      try {
        if (event.type === 'BOOKING_CREATED') {
          // In a real app, you would call your email provider (SendGrid, AWS SES) here
          await new Promise(resolve => setTimeout(resolve, 50)); 
        }

        // Mark as fully PROCESSED only AFTER successful delivery
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSED' }
        });

      } catch (error) {
        // console.error(`[OutboxWorker] Failed to process event ${event.id}:`, error);
        
        // 4. Mark as FAILED to allow manual intervention or a dead-letter queue
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'FAILED' }
        });
      }
    }
  } catch (error) {
    // console.error('[OutboxWorker] Fatal error fetching events:', error);
  } finally {
    isRunning = false;
  }
}

let workerInterval: NodeJS.Timeout | null = null;

export function startOutboxWorker(intervalMs = 5000) {
  if (workerInterval) {
    return;
  }
  
  // console.log(`[OutboxWorker] Started polling every ${intervalMs}ms`);
  workerInterval = setInterval(() => {
    processOutboxEvents();
  }, intervalMs);
}

export function stopOutboxWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    // console.log('[OutboxWorker] Stopped polling');
  }
}
