import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/devices.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Approximate-location opt-in. Port of
/// apps/mobile/app/onboarding/location.tsx: requests foreground permission,
/// posts the PostGIS point with the draft city, and marks the local flag.
/// Skip goes straight to privacy.
class LocationPage extends ConsumerStatefulWidget {
  const LocationPage({super.key});

  @override
  ConsumerState<LocationPage> createState() => _LocationPageState();
}

class _LocationPageState extends ConsumerState<LocationPage> {
  bool _requesting = false;
  String? _error;

  Future<void> _enable() async {
    setState(() {
      _requesting = true;
      _error = null;
    });
    try {
      final service = ref.read(locationServiceProvider);
      if (!await service.ensureAccess()) {
        setState(() {
          _error =
              'Location access was denied. You can enable it later from your device settings.';
        });
        return;
      }
      final fix = await service.current();
      final controller = ref.read(onboardingControllerProvider);
      await ref.read(mediaRepositoryProvider).postLocation(
            wkt: locationWkt(fix.longitude, fix.latitude),
            accuracyMeters: fix.accuracyMeters,
            approximateCity: controller.draft.cityName,
          );
      controller.setApproximateLocationSet(true);
      if (!mounted) return;
      context.push(pathForStep('privacy'));
    } on DeviceDenied catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() {
        _error = e is ApiException
            ? e.message
            : 'Unable to determine your location. Please try again.';
      });
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('location'),
      title: 'Enable location',
      subtitle:
          'We use your approximate area to show nearby matches — your exact address is never shared.',
      primaryLabel: 'Enable location',
      primaryBusy: _requesting,
      onPrimary: _enable,
      secondaryLabel: 'Skip for now',
      onSecondary: () => context.push(pathForStep('privacy')),
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
            child: Icon(HugeIcons.strokeRoundedLocation01,
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
