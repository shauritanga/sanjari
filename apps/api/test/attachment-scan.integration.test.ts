import { describe, expect, it, vi } from 'vitest';
import { AttachmentScanService } from '../src/conversations/attachment-scan.service';

describe('attachment scanning worker contract', () => {
  it('fails closed into pending review when no scanner provider is configured', async () => {
    const update = vi.fn().mockResolvedValue({});
    const prisma = {
      messageAttachment: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: 'attachment-1',
            storageKey: 'messages/user-1/file.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 100,
          }),
        update,
      },
    };
    const result = await new AttachmentScanService(prisma as never).process('attachment-1');
    expect(result).toEqual({ status: 'pending_review' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'pending_review' } }),
    );
  });
});
