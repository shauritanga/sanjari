import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/option_row.dart';
import 'locations_repository.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

const _maxNationalities = 2;

/// Nationality/citizenship: searchable multi-select (up to 2 countries),
/// saves `nationalities` as a list of ISO country codes.
class NationalityPage extends ConsumerStatefulWidget {
  const NationalityPage({super.key});

  @override
  ConsumerState<NationalityPage> createState() => _NationalityPageState();
}

class _NationalityPageState extends ConsumerState<NationalityPage> {
  final _query = TextEditingController();
  List<CatalogCountry> _countries = [];
  List<String> _selected = [];
  bool _loading = true;
  bool _saving = false;
  String? _error;
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

  void _toggle(String code) {
    setState(() {
      if (_selected.contains(code)) {
        _selected = _selected.where((item) => item != code).toList();
      } else if (_selected.length < _maxNationalities) {
        _selected = [..._selected, code];
      }
    });
  }

  Future<void> _save() async {
    if (_selected.isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final controller = ref.read(onboardingControllerProvider);
      final ok = await controller.save(
        {'nationalities': _selected},
        stepNumber('nationality'),
      );
      if (!mounted) return;
      if (ok) {
        context.push(pathForStep('ethnicity'));
      } else {
        setState(() => _error = controller.error ?? 'unableToSave');
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_seeded) {
      _seeded = true;
      _selected = List.of(
        ref.read(onboardingControllerProvider).draft.nationalities,
      );
    }
    final scheme = Theme.of(context).colorScheme;
    final normalized = _query.text.trim().toLowerCase();
    final filtered = normalized.isEmpty
        ? _countries
        : _countries
            .where((country) => country.name.toLowerCase().contains(normalized))
            .toList();
    return OnboardingScreen(
      step: stepNumber('nationality'),
      title: "What's your nationality?",
      subtitle: 'Please tell us up to $_maxNationalities countries you hold citizenship with.',
      primaryLabel: 'Confirm (${_selected.length})',
      primaryDisabled: _selected.isEmpty,
      primaryBusy: _saving,
      onPrimary: _save,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            label: 'Search for nationalities',
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
          else
            for (final country in filtered) ...[
              CheckRow(
                label: country.name,
                checked: _selected.contains(country.code),
                onTap: () => _toggle(country.code),
              ),
              const SizedBox(height: 4),
            ],
        ],
      ),
    );
  }
}
