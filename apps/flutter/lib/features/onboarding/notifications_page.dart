import 'dart:io';

import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/devices.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Push opt-in. Port of apps/mobile/app/onboarding/notifications.tsx:
/// requests permission, registers a 16+ character token best-effort (a
/// missing token still counts as enabled, e.g. simulators), and marks the
/// local flag. "Not now" skips straight to voice-intro.
class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  bool _requesting = false;
  String? _error;

  Future<void> _enable() async {
    setState(() {
      _requesting = true;
      _error = null;
    });
    try {
      final registrar = ref.read(pushRegistrarProvider);
      if (!await registrar.ensureAccess()) {
        setState(() {
          _error =
              'Notifications were not enabled. You can turn them on later in settings.';
        });
        return;
      }
      try {
        final token = await registrar.fetchToken();
        if (shouldRegisterPushToken(token)) {
          await ref.read(mediaRepositoryProvider).registerPushToken(
                token: token!,
                provider: pushProviderName(isIOS: Platform.isIOS),
              );
        }
      } catch (_) {
        // Token registration can fail on simulators without push setup;
        // the permission grant still counts.
      }
      ref.read(onboardingControllerProvider).setNotificationsEnabled(true);
      if (!mounted) return;
      context.push(pathForStep('voice-intro'));
    } catch (e) {
      setState(() {
        _error = e is ApiException
            ? e.message
            : 'Unable to enable notifications right now.';
      });
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('notifications'),
      title: 'Stay in the loop',
      subtitle: 'Get notified about new matches and messages.',
      primaryLabel: 'Enable notifications',
      primaryBusy: _requesting,
      onPrimary: _enable,
      secondaryLabel: 'Not now',
      onSecondary: () => context.push(pathForStep('voice-intro')),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 64),
          Container(
            width: 140,
            height: 140,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: scheme.surfaceContainerHighest,
            ),
            child: Icon(HugeIcons.strokeRoundedNotification01,
                color: scheme.primary, size: 56),
          ),
          if (_error != null) ...[
            const SizedBox(height: 24),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: scheme.error,
                fontSize: 14,
                height: 20 / 14,
              ),
            ),
          ],
          const SizedBox(height: 64),
        ],
      ),
    );
  }
}
