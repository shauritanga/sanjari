import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/devices.dart';
import '../../core/theme.dart';
import '../../widgets/selectable_card.dart';
import 'media_repository.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Verification status + capture. Port of
/// apps/mobile/app/onboarding/verification.tsx: loads the cases, shows
/// per-type status cards, and captures via the camera seam (front for the
/// selfie check, rear for ID). Verification stays optional — Continue
/// always routes to notifications.
class VerificationPage extends ConsumerStatefulWidget {
  const VerificationPage({super.key});

  @override
  ConsumerState<VerificationPage> createState() => _VerificationPageState();
}

class _VerificationPageState extends ConsumerState<VerificationPage> {
  List<VerificationCase> _cases = [];
  bool _loading = true;
  String? _error;
  String? _requesting;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final cases =
          await ref.read(mediaRepositoryProvider).fetchVerificationCases();
      if (!mounted) return;
      setState(() => _cases = cases);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  VerificationCase? _latest(String type) {
    for (final item in _cases) {
      if (item.type == type) return item;
    }
    return null;
  }

  Future<void> _capture(String type) async {
    if (_requesting != null) return;
    final latest = _latest(type);
    if (latest?.status == 'approved') return;
    setState(() {
      _error = null;
      _requesting = type;
    });
    try {
      final picker = ref.read(mediaPickerProvider);
      if (!await picker.ensureCameraAccess()) {
        throw DeviceDenied('Camera access is needed to complete verification.');
      }
      final taken = await picker.takePhoto(
        front: type == 'selfie_liveness',
      );
      if (taken == null || !mounted) return;
      final submitted = await ref
          .read(mediaRepositoryProvider)
          .submitVerification(type, taken);
      if (!mounted) return;
      setState(() {
        _cases = [
          for (final item in _cases)
            if (item.type == type) submitted else item,
          if (_latest(type) == null) submitted,
        ];
      });
    } on DeviceDenied catch (e) {
      setState(() => _error = e.message);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Unable to submit verification.');
    } finally {
      if (mounted) setState(() => _requesting = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final selfie = _latest('selfie_liveness');
    final id = _latest('identity_document');
    return OnboardingScreen(
      step: stepNumber('verification'),
      title: 'Verify your profile',
      subtitle: 'Verified profiles get more matches and build trust.',
      primaryLabel: 'Continue',
      onPrimary: () => context.push(pathForStep('notifications')),
      footerNote:
          _error ?? 'You can complete verification later from your profile.',
      child: _loading
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(child: CircularProgressIndicator()),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _VerificationCard(
                  title: 'Selfie verification',
                  status: selfie?.status,
                  busy: _requesting == 'selfie_liveness',
                  onTap: () => _capture('selfie_liveness'),
                ),
                const SizedBox(height: 12),
                _VerificationCard(
                  title: 'ID verification',
                  status: id?.status,
                  busy: _requesting == 'identity_document',
                  onTap: () => _capture('identity_document'),
                ),
                const SizedBox(height: 12),
                Text(
                  'Tapping a card opens your camera to take a photo for that verification step. ID verification is optional and adds an extra layer of trust to your profile.',
                  style: TextStyle(
                    fontSize: 13,
                    height: 18 / 13,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
    );
  }
}

class _VerificationCard extends StatelessWidget {
  const _VerificationCard({
    required this.title,
    required this.status,
    required this.busy,
    required this.onTap,
  });

  final String title;
  final String? status;
  final bool busy;
  final VoidCallback onTap;

  Color _colorFor(ColorScheme scheme) {
    if (status == 'approved') return SanjariColors.success;
    if (status == 'rejected') return scheme.error;
    if (status != null) return scheme.primary;
    return scheme.onSurfaceVariant;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SelectableCard(
      title: title,
      description: busy ? 'Uploading…' : verificationStatusLabel(status),
      icon: busy
          ? const SizedBox(
              width: 26,
              height: 26,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(Icons.verified_outlined, color: _colorFor(scheme), size: 26),
      selected: status == 'approved',
      onTap: onTap,
    );
  }
}
