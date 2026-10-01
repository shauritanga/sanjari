import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/devices.dart';
import '../../core/permission_prompt.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import 'chat_attachments.dart';
import 'chat_controller.dart';
import 'chat_message.dart';

/// One-to-one chat screen. Ports conversation/[id].tsx: history with
/// older pagination, socket send with REST fallback and offline queue,
/// photo (up to 10) and voice-note (120s) attachments, delivered/read
/// ticks, reactions, reply, typing indicator, presence subtitle, delete
/// and report.
class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final _composer = TextEditingController();
  final _scroll = ScrollController();

  ChatController get _controller =>
      ref.read(chatControllerProvider(widget.conversationId));

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    Future.microtask(() async {
      if (!mounted) return;
      await _controller.attach(ref.read(chatRealtimeProvider));
    });
  }

  @override
  void dispose() {
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    _composer.dispose();
    _controller.detach();
    super.dispose();
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 300) {
      _controller.loadOlder();
    }
  }

  Future<void> _send() async {
    final text = _composer.text;
    await _controller.send(text);
    _composer.clear();
  }

  void _deny(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _sendPhotos() async {
    try {
      await _controller.sendPhotosFlow();
    } on DeviceDenied {
      if (!mounted) return;
      await showPhotoAccessDialog(
        context: context,
        onOpenSettings: _controller.openSettings,
      );
    }
  }

  Future<void> _startVoice() async {
    try {
      await _controller.startVoiceNote();
    } on DeviceDenied catch (e) {
      _deny(e.message);
    }
  }

  void _openAttachmentSheet() {
    final controller = _controller;
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => _AttachmentSheet(
        controller: controller,
        onPhoto: () {
          Navigator.of(sheetContext).pop();
          _sendPhotos();
        },
        onVoice: () {
          Navigator.of(sheetContext).pop();
          _startVoice();
        },
      ),
    );
  }

  void _openPhotoViewer(List<MsgAttachment> photos, int index) {
    showDialog<void>(
      context: context,
      builder: (context) => _PhotoViewer(photos: photos, index: index),
    );
  }

  void _openOptions(ChatMessage message) {
    final locale = ref.read(localeProvider).value;
    final controller = _controller;
    final mine = controller.isMine(message);
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(SanjariSpacing.md),
              child: Text(
                tr(locale, 'messageOptions'),
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                for (final reaction in reactionOptions)
                  IconButton(
                    iconSize: 28,
                    onPressed: () {
                      Navigator.of(context).pop();
                      controller.reactTo(message, reaction);
                    },
                    icon: Text(reaction),
                  ),
              ],
            ),
            ListTile(
              leading: const Icon(HugeIcons.strokeRoundedMailReply01),
              title: Text(tr(locale, 'replyAction')),
              onTap: () {
                Navigator.of(context).pop();
                controller.setReplyTo(
                  ReplyPreview(
                    id: message.id,
                    senderId: message.senderId,
                    body: message.body,
                  ),
                );
              },
            ),
            if (mine)
              ListTile(
                leading: const Icon(HugeIcons.strokeRoundedDelete01),
                title: Text(tr(locale, 'deleteAction')),
                onTap: () {
                  Navigator.of(context).pop();
                  controller.delete(message);
                },
              )
            else
              ListTile(
                leading: const Icon(HugeIcons.strokeRoundedFlag01),
                title: Text(tr(locale, 'report')),
                onTap: () {
                  Navigator.of(context).pop();
                  controller.report(message);
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(chatControllerProvider(widget.conversationId));
    final name = controller.otherUserName.isNotEmpty
        ? controller.otherUserName
        : tr(locale, 'sanjariMember');
    final subtitle = controller.typingActive
        ? tr(locale, 'typingNow')
        : controller.otherOnline
            ? tr(locale, 'onlineNow')
            : formatLastSeen(
                controller.otherLastActiveAt,
                DateTime.now(),
              );

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(HugeIcons.strokeRoundedArrowLeft01),
          onPressed: () => context.go('/home/messages'),
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              child: Text(
                name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase(),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (subtitle != null && subtitle.isNotEmpty)
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (controller.error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                color: Theme.of(context).colorScheme.errorContainer,
                child: Text(tr(locale, controller.error!)),
              ),
            if (controller.notice != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                color: Theme.of(context).colorScheme.secondaryContainer,
                child: Row(
                  children: [
                    Expanded(
                      child: Text(tr(locale, controller.notice!)),
                    ),
                    IconButton(
                      icon:
                          const Icon(HugeIcons.strokeRoundedCancel01, size: 18),
                      onPressed: controller.clearNotice,
                    ),
                  ],
                ),
              ),
            Expanded(
              child: Builder(
                builder: (context) {
                  if (controller.loadingInitial) {
                    return const Center(
                      child: CircularProgressIndicator(),
                    );
                  }
                  if (controller.messages.isEmpty) {
                    return Center(
                      child: Text(tr(locale, 'sayHello')),
                    );
                  }
                  return ListView.builder(
                    controller: _scroll,
                    reverse: true,
                    padding: const EdgeInsets.all(SanjariSpacing.md),
                    itemCount: controller.messages.length +
                        (controller.nextCursor != null ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == controller.messages.length) {
                        return const Padding(
                          padding: EdgeInsets.all(8),
                          child: Center(
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            ),
                          ),
                        );
                      }
                      final message = controller.messages[index];
                      return _MessageBubble(
                        message: message,
                        mine: controller.isMine(message),
                        selfId: controller.selfId,
                        onLongPress: () => _openOptions(message),
                        playingId: controller.playingId,
                        onToggleVoice: controller.toggleVoice,
                        onOpenViewer: _openPhotoViewer,
                      );
                    },
                  );
                },
              ),
            ),
            if (controller.replyTo != null)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: SanjariSpacing.md,
                  vertical: SanjariSpacing.xs,
                ),
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        controller.replyTo!.body ??
                            tr(locale, 'messageRemoved'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon:
                          const Icon(HugeIcons.strokeRoundedCancel01, size: 18),
                      onPressed: () => controller.setReplyTo(null),
                    ),
                  ],
                ),
              ),
            if (controller.attachmentBusy != null)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: SanjariSpacing.md,
                  vertical: SanjariSpacing.xs,
                ),
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Row(
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      controller.attachmentBusy!.startsWith('📷')
                          ? 'Sending photo…'
                          : 'Sending voice note…',
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                SanjariSpacing.sm,
                SanjariSpacing.xs,
                SanjariSpacing.sm,
                SanjariSpacing.sm,
              ),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Add attachment',
                    icon: const Icon(HugeIcons.strokeRoundedAttachment01),
                    onPressed: _openAttachmentSheet,
                  ),
                  Expanded(
                    child: TextField(
                      controller: _composer,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onChanged: controller.onComposerChanged,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: tr(locale, 'typeMessage'),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    tooltip: tr(locale, 'send'),
                    icon: controller.sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(HugeIcons.strokeRoundedSent),
                    onPressed: controller.sending ? null : _send,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.mine,
    required this.selfId,
    required this.onLongPress,
    required this.playingId,
    required this.onToggleVoice,
    required this.onOpenViewer,
  });

  final ChatMessage message;
  final bool mine;
  final String selfId;
  final VoidCallback onLongPress;
  final String? playingId;
  final ValueChanged<MsgAttachment> onToggleVoice;
  final void Function(List<MsgAttachment> photos, int index) onOpenViewer;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final read = message.receipts.any(
      (r) => r.type == 'read' && r.userId != selfId,
    );
    final delivered = read ||
        message.receipts.any(
          (r) => r.type == 'delivered' && r.userId != selfId,
        );
    final body = message.body;
    final showPlaceholderText =
        (body == null || isAttachmentPlaceholderBody(body)) &&
            message.attachments.isEmpty;

    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: onLongPress,
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 3),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.75,
          ),
          decoration: BoxDecoration(
            color: mine ? scheme.primary : scheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(SanjariRadius.lg),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (message.replyTo != null) ...[
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: (mine ? Colors.white : scheme.primary)
                        .withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(SanjariRadius.sm),
                  ),
                  child: Text(
                    message.replyTo!.body ?? '',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color: mine ? Colors.white70 : null,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
              ],
              _PhotoAttachments(
                message: message,
                onOpen: onOpenViewer,
              ),
              for (final attachment in message.attachments)
                if (!isImageAttachment(attachment.mimeType))
                  _VoiceNote(
                    attachment: attachment,
                    mine: mine,
                    playing: playingId == attachment.id,
                    onToggle: () => onToggleVoice(attachment),
                  ),
              if (body != null && !isAttachmentPlaceholderBody(body))
                Text(
                  body,
                  style: TextStyle(
                    color: mine ? Colors.white : null,
                  ),
                )
              else if (showPlaceholderText)
                Text(
                  '…',
                  style: TextStyle(
                    fontStyle: FontStyle.italic,
                    color: mine ? Colors.white70 : null,
                  ),
                ),
              if (message.reactions.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Wrap(
                    spacing: 4,
                    children: [
                      for (final reaction in message.reactions)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: (mine ? Colors.white : scheme.primary)
                                .withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            reaction.reaction,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                    ],
                  ),
                ),
              const SizedBox(height: 2),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    formatClockTime(message.createdAt),
                    style: TextStyle(
                      fontSize: 10,
                      color: mine ? Colors.white70 : scheme.outline,
                    ),
                  ),
                  if (mine) ...[
                    const SizedBox(width: 4),
                    Icon(
                      delivered
                          ? HugeIcons.strokeRoundedCheckmarkCircle02
                          : HugeIcons.strokeRoundedCheckmarkCircle01,
                      size: 14,
                      color: read
                          ? const Color(0xFF34B7F1)
                          : mine
                              ? Colors.white70
                              : scheme.outline,
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Attachment picker sheet. Ports the composer sheet: photo pick,
/// voice-note recording with the 120s counter and stop-and-send, and
/// cancel. The backdrop stays locked while recording, like Expo.
class _AttachmentSheet extends StatelessWidget {
  const _AttachmentSheet({
    required this.controller,
    required this.onPhoto,
    required this.onVoice,
  });

  final ChatController controller;
  final VoidCallback onPhoto;
  final VoidCallback onVoice;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final recording = controller.recordingVoice;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(SanjariSpacing.md),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  recording
                      ? 'Recording… '
                          '${voiceNoteSeconds(controller.recordingMs)}s / 120s'
                      : 'Add to your message',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 12),
                if (recording)
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: scheme.error,
                    ),
                    onPressed: controller.stopAndSendVoiceNote,
                    icon:
                        const Icon(HugeIcons.strokeRoundedStopCircle, size: 20),
                    label: const Text('Stop and send'),
                  )
                else ...[
                  ListTile(
                    leading:
                        const Icon(HugeIcons.strokeRoundedImage01, size: 20),
                    title: const Text('Photo'),
                    onTap: onPhoto,
                  ),
                  ListTile(
                    leading:
                        const Icon(HugeIcons.strokeRoundedCircle, size: 20),
                    title: const Text('Voice note'),
                    onTap: onVoice,
                  ),
                  ListTile(
                    title: Text(
                      'Cancel',
                      style: TextStyle(color: scheme.onSurfaceVariant),
                    ),
                    onTap: () => Navigator.of(context).pop(),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Photo attachments: single thumbnail, or a 220px wrap grid for
/// several. Tapping opens the full-screen viewer at that index.
class _PhotoAttachments extends StatelessWidget {
  const _PhotoAttachments({
    required this.message,
    required this.onOpen,
  });

  final ChatMessage message;
  final void Function(List<MsgAttachment> photos, int index) onOpen;

  @override
  Widget build(BuildContext context) {
    final images = message.attachments
        .where(
          (attachment) =>
              isImageAttachment(attachment.mimeType) &&
              attachment.url.isNotEmpty,
        )
        .toList();
    if (images.isEmpty) return const SizedBox.shrink();
    if (images.length == 1) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: GestureDetector(
          onTap: () => onOpen(images, 0),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(SanjariRadius.sm),
            child: Image.network(
              images.single.url,
              width: 180,
              errorBuilder: (context, _, __) => const SizedBox.shrink(),
            ),
          ),
        ),
      );
    }
    return Container(
      width: 220,
      padding: const EdgeInsets.only(bottom: 4),
      child: Wrap(
        spacing: 4,
        runSpacing: 4,
        children: [
          for (var i = 0; i < images.length; i++)
            GestureDetector(
              onTap: () => onOpen(images, i),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(SanjariRadius.sm),
                child: Image.network(
                  images[i].url,
                  width: 108,
                  height: 108,
                  fit: BoxFit.cover,
                  errorBuilder: (context, _, __) =>
                      const SizedBox(width: 108, height: 108),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Voice-note bubble. Ports VoiceMessagePlayer: play/pause, 40
/// waveform bars (captured or fallback), and the m:ss duration.
class _VoiceNote extends StatelessWidget {
  const _VoiceNote({
    required this.attachment,
    required this.mine,
    required this.playing,
    required this.onToggle,
  });

  final MsgAttachment attachment;
  final bool mine;
  final bool playing;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bars = attachment.waveform?.isNotEmpty == true
        ? attachment.waveform!
        : fallbackWaveform();
    final tint = mine ? Colors.white : scheme.primary;
    final soft = mine ? Colors.white70 : scheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            tooltip: playing ? 'Pause voice note' : 'Play voice note',
            iconSize: 28,
            color: tint,
            icon: Icon(
              playing
                  ? HugeIcons.strokeRoundedPauseCircle
                  : HugeIcons.strokeRoundedPlayCircle,
            ),
            onPressed: onToggle,
          ),
          const SizedBox(width: 4),
          Flexible(
            child: SizedBox(
              height: 24,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  for (final bar in bars)
                    Expanded(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 1),
                        height: 4 + bar * 20,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(2),
                          color: tint.withValues(alpha: 0.85),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            formatAttachmentDuration(attachment.durationSeconds ?? 0),
            style: TextStyle(fontSize: 12, color: soft),
          ),
        ],
      ),
    );
  }
}

/// Full-screen swipeable photo viewer. Ports the photoViewer modal.
class _PhotoViewer extends StatefulWidget {
  const _PhotoViewer({required this.photos, required this.index});

  final List<MsgAttachment> photos;
  final int index;

  @override
  State<_PhotoViewer> createState() => _PhotoViewerState();
}

class _PhotoViewerState extends State<_PhotoViewer> {
  late final PageController _pages;

  @override
  void initState() {
    super.initState();
    _pages = PageController(initialPage: widget.index);
  }

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog.fullscreen(
      backgroundColor: Colors.black,
      child: Stack(
        children: [
          PageView.builder(
            controller: _pages,
            itemCount: widget.photos.length,
            itemBuilder: (context, index) => InteractiveViewer(
              child: Center(
                child: Image.network(
                  widget.photos[index].url,
                  fit: BoxFit.contain,
                  errorBuilder: (context, _, __) => const Icon(
                    HugeIcons.strokeRoundedCircle,
                    color: Colors.white54,
                    size: 48,
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            top: 8,
            right: 8,
            child: IconButton(
              tooltip: 'Close',
              icon: const Icon(HugeIcons.strokeRoundedCancel01,
                  color: Colors.white),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
        ],
      ),
    );
  }
}
