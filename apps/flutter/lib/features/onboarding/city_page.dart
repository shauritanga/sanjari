import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../widgets/app_text_field.dart';
import 'locations_repository.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// City picker for the country chosen on the previous step. Port of
/// apps/mobile/app/onboarding/city.tsx: the country code arrives as a
/// query param (falling back to the draft), cities come from the matching
/// GET /catalog/locations entry, and save sends `{cityId, city}`.
class CityPage extends ConsumerStatefulWidget {
  const CityPage({super.key, required this.countryCode});

  final String countryCode;

  @override
  ConsumerState<CityPage> createState() => _CityPageState();
}

class _CityPageState extends ConsumerState<CityPage> {
  final _query = TextEditingController();
  List<CatalogCity> _cities = [];
  bool _loading = true;
  String? _error;
  CatalogCity? _selected;
  bool _saving = false;
  late final String _code;

  @override
  void initState() {
    super.initState();
    // Expo falls back to the stored country when no param is passed.
    _code = widget.countryCode.isEmpty
        ? ref.read(onboardingControllerProvider).draft.countryCode
        : widget.countryCode;
    _query.addListener(() => setState(() {}));
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final countries =
          await ref.read(locationsRepositoryProvider).fetchCountries();
      if (!mounted) return;
      final match = countries
          .where((country) => country.code == _code)
          .toList();
      setState(() {
        _cities = match.isEmpty ? const [] : match.first.cities;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    final selected = _selected;
    if (selected == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {'cityId': selected.id, 'city': selected.name},
        stepNumber('city'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('bio'));
      } else {
        setState(() => _error = controller.error ?? 'unableToSave');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final normalized = _query.text.trim().toLowerCase();
    final filtered = normalized.isEmpty
        ? _cities
        : _cities
            .where((city) => city.name.toLowerCase().contains(normalized))
            .toList();
    return OnboardingScreen(
      step: stepNumber('city'),
      title: 'Which city?',
      subtitle: 'Pin down your city so we can surface nearby matches.',
      primaryLabel: 'Continue',
      primaryDisabled: _selected == null,
      primaryBusy: _saving,
      onPrimary: _save,
      child: _code.isEmpty
          ? Text(
              "We couldn't tell which country you picked. Go back and choose one.",
              style: TextStyle(color: scheme.error),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppTextField(
                  label: 'Search cities',
                  controller: _query,
                  hint: 'Type a city name',
                ),
                const SizedBox(height: 12),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_error != null && _cities.isEmpty)
                  Text(_error!, style: TextStyle(color: scheme.error))
                else if (filtered.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Center(
                      child: Text(
                        'No cities match your search.',
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      ),
                    ),
                  )
                else
                  for (final city in filtered) ...[
                    GestureDetector(
                      onTap: () => setState(() => _selected = city),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            width: 1.5,
                            color: _selected?.id == city.id
                                ? scheme.primary
                                : scheme.outline,
                          ),
                          color: _selected?.id == city.id
                              ? scheme.primaryContainer
                              : scheme.surface,
                        ),
                        child: Text(
                          city.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
              ],
            ),
    );
  }
}
