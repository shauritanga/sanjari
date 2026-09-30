import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/core/devices.dart';
import 'package:sanjari/features/chat/chat_attachments.dart';
import 'package:sanjari/features/chat/chat_message.dart';
import 'package:sanjari/features/chat/chat_repository.dart';

import 'mock_api.dart';

class FakeUploader implements BinaryUploader {
  final puts = <String>[];

  @override
  Future<void> put(String url, List<int> bytes, String mimeType) async {
    puts.add('$url|${bytes.length}');
  }
}

Map<String, dynamic> messageJson(String id) => {
      'id': id,
      'senderId': 'u1',
      'body': '📷 Photo',
      'status': 'sent',
      'createdAt': '2026-09-10T12:00:00.000Z',
    };

Map<String, dynamic> attachmentJson(String id) => {
      'id': id,
      'mimeType': 'image/jpeg',
      'sizeBytes': 12,
      'url': 'https://cdn/$id.jpg',
    };

void main() {
  group('waveform rules', () {
    test('downsamples to 40 averaged bars', () {
      final bars = downsampleWaveform(
        [for (var i = 0; i < 200; i++) i / 200],
      );

      expect(bars, hasLength(40));
      expect(bars.first, closeTo(0.01, 1e-9));
      expect(bars.last, closeTo(0.985, 1e-9));
      expect(downsampleWaveform(const []), isEmpty);
    });

    test('fallback bars render 40 sinusoidal values', () {
      final bars = fallbackWaveform();

      expect(bars, hasLength(40));
      expect(bars.first, closeTo(0.35, 1e-9));
      expect(bars.every((b) => b >= 0.3 && b <= 0.7), isTrue);
    });

    test('metering normalizes the -60..0 dBFS range', () {
      expect(normalizeMetering(-60), 0);
      expect(normalizeMetering(0), 1);
      expect(normalizeMetering(-30), 0.5);
      expect(normalizeMetering(-90), 0);
      expect(normalizeMetering(6), 1);
    });
  });

  group('attachment labels', () {
    test('placeholders and durations match the Expo literals', () {
      expect(photoPlaceholder(1), '📷 Photo');
      expect(photoPlaceholder(3), '📷 3 photos');
      expect(voicePlaceholder, '🎤 Voice note');
      expect(formatAttachmentDuration(7), '0:07');
      expect(formatAttachmentDuration(75), '1:15');
      expect(voiceNoteSeconds(5000), 5);
      expect(voiceNoteSeconds(200000), 120);
    });
  });

  group('ChatRepository attachments', () {
    test('presign sends sizeBytes as a string', () async {
      final seen = <RequestOptions>[];
      final repo = ChatRepository(
        mockApi(
          (_) => {
            'data': {'storageKey': 'k', 'uploadUrl': 'https://up/x'}
          },
          seen: seen,
        ),
      );

      final ticket = await repo.presignAttachment(
        'c1',
        'm1',
        mimeType: 'image/jpeg',
        sizeBytes: 12,
      );

      expect(ticket.storageKey, 'k');
      expect(
        seen.single.path,
        '/conversations/c1/messages/m1/attachments/presign',
      );
      expect(seen.single.data['sizeBytes'], '12');
    });

    test('complete omits empty waveforms', () async {
      final seen = <RequestOptions>[];
      final repo = ChatRepository(
        mockApi((_) => {'data': attachmentJson('a1')}, seen: seen),
      );

      final photo = await repo.completeAttachment(
        'c1',
        'm1',
        storageKey: 'k',
        mimeType: 'image/jpeg',
        sizeBytes: 12,
      );
      final voice = await repo.completeAttachment(
        'c1',
        'm1',
        storageKey: 'k',
        mimeType: 'audio/m4a',
        sizeBytes: 99,
        waveform: const [0.1, 0.9],
        durationSeconds: 7.5,
      );

      expect(photo?.id, 'a1');
      expect(voice?.id, 'a1');
      expect(seen[0].data.containsKey('waveform'), isFalse);
      expect(seen[1].data['waveform'], [0.1, 0.9]);
      expect(seen[1].data['durationSeconds'], 7.5);
    });
  });

  group('ChatAttachmentSender', () {
    test('creates the parent then uploads files in order', () async {
      final seen = <RequestOptions>[];
      final uploader = FakeUploader();
      final repo = ChatRepository(
        mockApi(
          (options) {
            if (options.path.endsWith('/messages')) {
              return {'data': messageJson('m9')};
            }
            if (options.path.endsWith('/presign')) {
              return {
                'data': {'storageKey': 'k', 'uploadUrl': 'https://up/x'}
              };
            }
            return {'data': attachmentJson('a-${seen.length}')};
          },
          seen: seen,
        ),
      );
      final sender = ChatAttachmentSender(repo, uploader);
      final attached = <String, List<MsgAttachment>>{};

      final created = await sender.send(
        conversationId: 'c1',
        placeholderBody: photoPlaceholder(2),
        files: [
          OutgoingAttachment(bytes: [1], mimeType: 'image/jpeg', sizeBytes: 1),
          OutgoingAttachment(bytes: [2], mimeType: 'image/jpeg', sizeBytes: 1),
        ],
        onAttachment: (messageId, attachment) =>
            attached.putIfAbsent(messageId, () => []).add(attachment),
      );

      expect(created?.id, 'm9');
      expect(attached['m9'], hasLength(2));
      expect(uploader.puts, hasLength(2));
      // Parent first, then sequential presign/complete pairs.
      expect(seen[0].path, '/conversations/c1/messages');
      expect(seen[0].data['body'], '📷 2 photos');
      expect(seen[1].path, contains('/presign'));
      expect(seen[2].path, contains('/complete'));
      expect(seen[3].path, contains('/presign'));
      expect(seen[4].path, contains('/complete'));
    });

    test('a missing parent fails before any upload', () async {
      final uploader = FakeUploader();
      final repo = ChatRepository(mockApi((_) => {'data': null}));
      final sender = ChatAttachmentSender(repo, uploader);

      expect(
        () => sender.send(
          conversationId: 'c1',
          placeholderBody: '📷 Photo',
          files: [
            OutgoingAttachment(
                bytes: [1], mimeType: 'image/jpeg', sizeBytes: 1),
          ],
          onAttachment: (_, __) {},
        ),
        throwsA(isA<Exception>()),
      );
      expect(uploader.puts, isEmpty);
    });
  });
}
