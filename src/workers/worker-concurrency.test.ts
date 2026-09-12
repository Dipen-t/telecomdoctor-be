import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../infrastructure/database/prisma';
import { processOutboxEvents } from './outbox.worker';

describe('Worker Concurrency Test', () => {
  beforeAll(async () => {
    await prisma.outboxEvent.deleteMany({});
  });

  it('should process events exactly once even with 5 concurrent workers polling simultaneously', async () => {
    // 1. Insert 1 pending event
    const event = await prisma.outboxEvent.create({
      data: {
        type: 'BOOKING_CREATED',
        payload: { consultationId: 'test-123' },
        status: 'PENDING'
      }
    });

    // 2. Spawn 5 "workers" running exactly at the same time
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(processOutboxEvents());
    }

    await Promise.all(promises);

    // 3. Check the DB. It should be PROCESSED.
    const updated = await prisma.outboxEvent.findUnique({
      where: { id: event.id }
    });
    
    expect(updated?.status).toBe('PROCESSED');
    expect(updated?.processedAt).toBeDefined();
  });
});
