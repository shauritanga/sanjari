import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/devices.dart';
import 'onboarding_models.dart';
import 'media_repository.dart';
import 'photo_order.dart';

/// Photo grid with upload, reorder, and remove. Port of PhotoGrid.tsx:
/// 6 slots, gallery pick → presign → PUT → complete, busy overlays,
/// moderation pills, primary star, per-photo remove, and an action sheet
/// for replace / move / set-primary. Reorder persistence is best-effort.
class PhotoGrid extends StatefulWidget {
  const PhotoGrid({
    super.key,
    required this.photos,
    required this.onChanged,
    required this.picker,
    required this.media,
    this.slots = 6,
  });

  final List<OnboardingPhoto> photos;
  final ValueChanged<List<OnboardingPhoto>> onChanged;
  final MediaPicker picker;
  final MediaRepository media;
  final int slots;

  @override
  State<PhotoGrid> createState() => _PhotoGridState();
}

class _PhotoGridState extends State<PhotoGrid> {
  int? _uploadingSlot;
  String? _busyPhotoId;

  void _fail(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _pickAndUpload(int position) async {
    PickedMedia? picked;
    try {
      if (!await widget.picker.ensureGalleryAccess()) {
        _fail('Allow photo library access to manage profile photos.');
        return;
      }
      picked = await widget.picker.pickImage();
    } on DeviceDenied catch (e) {
      _fail(e.message);
      return;
    } catch (_) {
      _fail('Upload failed. Please try again.');
      return;
    }
    if (picked == null || !mounted) return;
    setState(() => _uploadingSlot = position);
    try {
      final completed = await widget.media.uploadPhoto(picked);
      if (!mounted) return;
      widget.onChanged([...widget.photos, completed]);
    } catch (e) {
      _fail(e is ApiException ? e.message : 'Upload failed. Please try again.');
    } finally {
      if (mounted) setState(() => _uploadingSlot = null);
    }
  }

  Future<void> _replace(OnboardingPhoto photo) async {
    PickedMedia? picked;
    try {
      if (!await widget.picker.ensureGalleryAccess()) {
        _fail('Allow photo library access to manage profile photos.');
        return;
      }
      picked = await widget.picker.pickImage();
    } on DeviceDenied catch (e) {
      _fail(e.message);
      return;
    } catch (_) {
      _fail('Replace failed. Please try again.');
      return;
    }
    if (picked == null || !mounted) return;
    setState(() => _busyPhotoId = photo.id);
    try {
      final completed = await widget.media.replacePhoto(photo.id, picked);
      if (!mounted) return;
      widget.onChanged([
        for (final item in widget.photos)
          if (item.id == photo.id) completed else item,
      ]);
    } catch (e) {
      _fail(e is ApiException ? e.message : 'Replace failed. Please try again.');
    } finally {
      if (mounted) setState(() => _busyPhotoId = null);
    }
  }

  Future<void> _remove(OnboardingPhoto photo) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove photo'),
        content: const Text('This photo will be deleted from your profile.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    // Fire-and-forget server delete like the Expo screen; the list updates
    // immediately.
    unawaited(widget.media.removePhoto(photo.id));
    widget.onChanged(
      widget.photos.where((item) => item.id != photo.id).toList(),
    );
  }

  Future<void> _persistOrder(List<OnboardingPhoto> next) async {
    widget.onChanged(next);
    try {
      await widget.media.reorderPhotos(
        [for (final photo in next) photo.id],
      );
    } catch (_) {
      // Best-effort — the next load resyncs the true order.
    }
  }

  void _showActions(OnboardingPhoto photo) {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.swap_horiz_outlined),
              title: const Text('Replace photo'),
              onTap: () {
                Navigator.of(context).pop();
                _replace(photo);
              },
            ),
            ListTile(
              leading: const Icon(Icons.arrow_back_outlined),
              title: const Text('Move earlier'),
              onTap: () {
                Navigator.of(context).pop();
                _persistOrder(
                  movePhotoInList(widget.photos, photo.id, -1),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.arrow_forward_outlined),
              title: const Text('Move later'),
              onTap: () {
                Navigator.of(context).pop();
                _persistOrder(
                  movePhotoInList(widget.photos, photo.id, 1),
                );
              },
            ),
            if (!photo.isPrimary)
              ListTile(
                leading: const Icon(Icons.star_outline),
                title: const Text('Set as main photo'),
                onTap: () {
                  Navigator.of(context).pop();
                  _persistOrder(primaryFirst(widget.photos, photo.id));
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final cells = List<OnboardingPhoto?>.generate(
      widget.slots,
      (index) => index < widget.photos.length ? widget.photos[index] : null,
    );
    return GridView.count(
      crossAxisCount: 3,
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        for (var index = 0; index < cells.length; index++)
          _Cell(
            photo: cells[index],
            uploading: _uploadingSlot == index,
            busy: cells[index] != null && _busyPhotoId == cells[index]!.id,
            onAdd: () => _pickAndUpload(index),
            onOpen: cells[index] == null
                ? null
                : () => _showActions(cells[index]!),
            onRemove: cells[index] == null
                ? null
                : () => _remove(cells[index]!),
            scheme: scheme,
          ),
      ],
    );
  }
}

class _Cell extends StatelessWidget {
  const _Cell({
    required this.photo,
    required this.uploading,
    required this.busy,
    required this.onAdd,
    required this.onOpen,
    required this.onRemove,
    required this.scheme,
  });

  final OnboardingPhoto? photo;
  final bool uploading;
  final bool busy;
  final VoidCallback onAdd;
  final VoidCallback? onOpen;
  final VoidCallback? onRemove;
  final ColorScheme scheme;

  String? _pillText(String status) {
    if (status == 'pending' || status == 'under_review') return 'In review';
    if (status == 'rejected') return 'Rejected';
    if (status == 'hidden') return 'Hidden';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final current = photo;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: scheme.outlineVariant),
        color: scheme.surfaceContainerHighest,
      ),
      clipBehavior: Clip.antiAlias,
      child: current == null
          ? uploading
              ? const Center(child: CircularProgressIndicator())
              : GestureDetector(
                  onTap: onAdd,
                  child: const Center(
                    child: Icon(Icons.add_a_photo_outlined, size: 28),
                  ),
                )
          : Stack(
              fit: StackFit.expand,
              children: [
                GestureDetector(onTap: busy ? null : onOpen, child: _Thumb(
                  photo: current,
                  scheme: scheme,
                )),
                if (busy)
                  Container(
                    color: Colors.black45,
                    child: const Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    ),
                  ),
                if (_pillText(current.moderationStatus) != null)
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        color: current.moderationStatus == 'rejected' ||
                                current.moderationStatus == 'hidden'
                            ? scheme.error
                            : Colors.black54,
                      ),
                      child: Text(
                        _pillText(current.moderationStatus)!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                Positioned(
                  top: 2,
                  right: 2,
                  child: IconButton(
                    iconSize: 14,
                    icon: const Icon(Icons.cancel, color: Colors.white),
                    onPressed: busy ? null : onRemove,
                  ),
                ),
                if (current.isPrimary)
                  Positioned(
                    bottom: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: scheme.primary,
                      ),
                      child: const Icon(
                        Icons.star,
                        color: Colors.white,
                        size: 11,
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.photo, required this.scheme});

  final OnboardingPhoto photo;
  final ColorScheme scheme;

  @override
  Widget build(BuildContext context) {
    final url = photo.url;
    if (url == null || url.isEmpty) {
      return Container(color: scheme.primary);
    }
    return Image.network(url, fit: BoxFit.cover);
  }
}
