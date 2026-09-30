import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../widgets/app_text_field.dart';
import 'locations_repository.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Country picker over GET /catalog/locations with search. Port of
/// apps/mobile/app/onboarding/country.tsx: saves `{countryCode}` and
/// forwards it as the city screen's query param.
class CountryPage extends ConsumerStatefulWidget {
  const CountryPage({super.key});

  @override
  ConsumerState<CountryPage> createState() => _CountryPageState();
}

class _CountryPageState extends ConsumerState<CountryPage> {
  final _query = TextEditingController();
  List<CatalogCountry> _countries = [];
  bool _loading = true;
  String? _error;
  String _selectedCode = '';
  bool _saving = false;
  bool _seeded = false;

  @override
  void initState() {
    super.initState();
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
      setState(() {
        _countries = countries;
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
    if (_selectedCode.isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {'countryCode': _selectedCode},
        stepNumber('country'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(
          "${pathForStep('city')}?countryCode=$_selectedCode",
        );
      } else {
        setState(() => _error = controller.error ?? 'unableToSave');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(onboardingControllerProvider).draft;
    if (!_seeded) {
      _seeded = true;
      _selectedCode = draft.countryCode;
    }
    final scheme = Theme.of(context).colorScheme;
    final normalized = _query.text.trim().toLowerCase();
    final filtered = normalized.isEmpty
        ? _countries
        : _countries
            .where((country) => country.name.toLowerCase().contains(normalized))
            .toList();
    return OnboardingScreen(
      step: stepNumber('country'),
      title: 'Where are you based?',
      subtitle: 'This helps us find matches near you.',
      primaryLabel: 'Continue',
      primaryDisabled: _selectedCode.isEmpty,
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Search countries',
            controller: _query,
            hint: 'Type a country name',
          ),
          const SizedBox(height: 12),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null && _countries.isEmpty)
            Text(_error!, style: TextStyle(color: scheme.error))
          else if (filtered.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Text(
                  'No countries match your search.',
                  style: TextStyle(color: scheme.onSurfaceVariant),
                ),
              ),
            )
          else
            for (final country in filtered) ...[
              _OptionRow(
                label: country.name,
                active: country.code == _selectedCode,
                onTap: () => setState(() => _selectedCode = country.code),
              ),
              const SizedBox(height: 8),
            ],
        ],
      ),
    );
  }
}

class _OptionRow extends StatelessWidget {
  const _OptionRow({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            width: 1.5,
            color: active ? scheme.primary : scheme.outline,
          ),
          color: active ? scheme.primaryContainer : scheme.surface,
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
