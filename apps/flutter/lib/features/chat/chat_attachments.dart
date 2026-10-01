import 'dart:io';
import 'dart:math';

import '../../core/api_client.dart';
import '../../core/devices.dart';
import 'chat_message.dart';
import 'chat_repository.dart';

/// Attachment rules and send pipeline for the chat screen. Pure-Dart port
/// of the attachment half of apps/mobile/app/conversation/[id].tsx.
///
/// Two deliberate simplifications vs Expo: live metering is unavailable
/// (the record plugin exposes no amplitude stream), so voice notes send
/// without a waveform and render the fallback bars — the same path as
/// pre-waveform legacy messages. And photo picking caps at 10 through
/// the picker seam instead of the OS sheet limit.
const int waveformBarCount = 40;
const int maxVoiceNoteMs = 120 * 1000;
const int maxPhotosPerMessage = 10;

/// Averages metering samples down to a fixed bar count for display.
List<double> downsampleWaveform(List<double> samples, {int bars = 40}) {
  if (samples.isEmpty) return [];
  final result = <double>[];
  final chunkSize = samples.length / bars;
  for (var i = 0; i < bars; i++) {
    final start = (i * chunkSize).floor();
    final end = max(start + 1, ((i + 1) * chunkSize).floor());
    final chunk = samples.sublist(start, min(end, samples.length));
    final average = chunk.reduce((a, b) => a + b) / chunk.length;
    result.add(double.parse(average.toStringAsFixed(3)));
  }
  return result;
}

/// Bars for voice notes without captured waveforms (legacy messages and
/// recordings made without metering).
List<double> fallbackWaveform({int bars = 40}) {
  return [
    for (var i = 0; i < bars; i++) 0.35 + 0.3 * (sin(i * 0.9)).abs(),
  ];
}

/// m:ss duration label.
String formatAttachmentDuration(double seconds) {
  final total = max(0, seconds.round());
  final minutes = total ~/ 60;
  final secs = (total % 60).toString().padLeft(2, '0');
  return '$minutes:$secs';
}

/// dBFS metering (-60..0) normalized to 0..1 for waveform capture.
double normalizeMetering(double db) => max(0, min(1, (db + 60) / 60));

/// Recorder counter, capped at the 120s voice-note limit.
int voiceNoteSeconds(int durationMs) => min(120, (durationMs / 1000).round());

/// Placeholder bodies, matching the Expo literals (the bubble hides them
/// when attachments are present).
String photoPlaceholder(int count) =>
    count > 1 ? '📷 $count photos' : '📷 Photo';

const String voicePlaceholder = '🎤 Voice note';

/// One file queued for upload.
class OutgoingAttachment {
  OutgoingAttachment({
    required this.bytes,
    required this.mimeType,
    required this.sizeBytes,
    this.waveform,
    this.durationSeconds,
  });

  final List<int> bytes;
  final String mimeType;
  final int sizeBytes;
  final List<double>? waveform;
  final double? durationSeconds;
}

/// Sequential attachment upload. Ports sendAttachmentMessage(): creates
/// the parent message first, then presigns → PUTs → completes each file
/// in order so a mid-batch failure keeps earlier photos attached. Each
/// completed attachment is reported with its parent id through
/// [onAttachment] for the live list merge; the created parent returns
/// for the safety-net append.
class ChatAttachmentSender {
  ChatAttachmentSender(this._repository, this._uploader);

  final ChatRepository _repository;
  final BinaryUploader _uploader;

  Future<ChatMessage?> send({
    required String conversationId,
    required String placeholderBody,
    required List<OutgoingAttachment> files,
    required void Function(String messageId, MsgAttachment attachment)
        onAttachment,
    String? replyToMessageId,
  }) async {
    final created = await _repository.sendMessage(
      conversationId,
      placeholderBody,
      replyToMessageId: replyToMessageId,
    );
    if (created == null) throw ApiException('Unable to send attachment.');
    final messageId = created.id;
    for (final file in files) {
      final ticket = await _repository.presignAttachment(
        conversationId,
        messageId,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      );
      await _uploader.put(ticket.uploadUrl, file.bytes, file.mimeType);
      final completed = await _repository.completeAttachment(
        conversationId,
        messageId,
        storageKey: ticket.storageKey,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        waveform: file.waveform,
        durationSeconds: file.durationSeconds,
      );
      if (completed != null) onAttachment(messageId, completed);
    }
    return created;
  }
}

/// Reads a recorded voice file into an uploadable attachment.
Future<OutgoingAttachment> voiceFileAttachment(
  String path,
  double durationSeconds,
) async {
  final bytes = await File(path).readAsBytes();
  return OutgoingAttachment(
    bytes: bytes,
    mimeType: 'audio/m4a',
    sizeBytes: bytes.length,
    durationSeconds: durationSeconds,
  );
}
