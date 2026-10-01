import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import 'discover_controller.dart';
import 'discovery_repository.dart';
import 'filter_options.dart';

/// Discovery filters. Ports apps/mobile/app/filters.tsx: server-backed
/// discovery preferences (age range, distance, genders, intentions,
/// languages, interests, verified-only, show-distance) plus the
/// client-side recently-active / new-members toggles.
class FiltersPage extends ConsumerStatefulWidget {
  const FiltersPage({super.key});

  @override
  ConsumerState<FiltersPage> createState() => _FiltersPageState();
}

class _FiltersPageState extends ConsumerState<FiltersPage> {
  DiscoveryPreference _preference = const DiscoveryPreference();
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    final strings = ref.read(localeProvider);
    try {
      final preference =
          await ref.read(discoveryRepositoryProvider).getPreferences();
      if (!mounted) return;
      setState(() {
        _preference = preference;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = tr(strings.value, 'unableToLoadFilters');
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    final strings = ref.read(localeProvider);
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(discoveryRepositoryProvider).savePreferences(_preference);
      if (!mounted) return;
      context.pop();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = tr(strings.value, 'unableToSaveFilters'));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _update(DiscoveryPreference next) => setState(() => _preference = next);

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final filters = ref.watch(discoveryFiltersProvider);
    final preference = _preference;

    return Scaffold(
      appBar: AppBar(title: Text(tr(locale, 'filters'))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(SanjariSpacing.lg),
              children: [
                if (_error != null) ...[
                  Text(
                    _error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                  const SizedBox(height: SanjariSpacing.md),
                ],
                Text(
                  '${tr(locale, 'minAge')} – ${tr(locale, 'maxAge')}: '
                  '${preference.minAge} – ${preference.maxAge}',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                RangeSlider(
                  values: RangeValues(
                    preference.minAge.toDouble(),
                    preference.maxAge.toDouble(),
                  ),
                  min: 18,
                  max: 80,
                  divisions: 62,
                  labels: RangeLabels(
                    '${preference.minAge}',
                    '${preference.maxAge}',
                  ),
                  onChanged: (values) => _update(
                    preference.copyWith(
                      minAge: values.start.round(),
                      maxAge: values.end.round(),
                    ),
                  ),
                ),
                const SizedBox(height: SanjariSpacing.md),
                Text(
                  '${tr(locale, 'maxDistance')}: '
                  '${preference.maxDistanceKm} ${tr(locale, 'km')}',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Slider(
                  value: preference.maxDistanceKm.toDouble(),
                  min: 5,
                  max: 200,
                  divisions: 39,
                  label: '${preference.maxDistanceKm}',
                  onChanged: (value) => _update(
                    preference.copyWith(maxDistanceKm: value.round()),
                  ),
                ),
                const SizedBox(height: SanjariSpacing.md),
                _MultiSelect(
                  title: tr(locale, 'genders'),
                  options: whoToMeetOptions,
                  selected: preference.genders,
                  onChanged: (next) =>
                      _update(preference.copyWith(genders: next)),
                ),
                _MultiSelect(
                  title: tr(locale, 'intentions'),
                  options: intentionOptions,
                  selected: preference.intentions,
                  onChanged: (next) =>
                      _update(preference.copyWith(intentions: next)),
                ),
                _MultiSelect(
                  title: tr(locale, 'languages'),
                  options: languageOptions,
                  selected: preference.languages,
                  onChanged: (next) =>
                      _update(preference.copyWith(languages: next)),
                ),
                _MultiSelect(
                  title: tr(locale, 'interests'),
                  options: interestOptions,
                  selected: preference.interests,
                  onChanged: (next) =>
                      _update(preference.copyWith(interests: next)),
                ),
                SwitchListTile(
                  title: Text(tr(locale, 'verifiedOnly')),
                  value: preference.verifiedOnly,
                  onChanged: (value) => _update(
                    preference.copyWith(verifiedOnly: value),
                  ),
                ),
                SwitchListTile(
                  title: Text(tr(locale, 'showDistance')),
                  value: preference.showDistance,
                  onChanged: (value) => _update(
                    preference.copyWith(showDistance: value),
                  ),
                ),
                const Divider(),
                SwitchListTile(
                  title: Text(tr(locale, 'recentlyActive')),
                  value: filters.recentlyActive,
                  onChanged:
                      ref.read(discoveryFiltersProvider).setRecentlyActive,
                ),
                SwitchListTile(
                  title: Text(tr(locale, 'newMembers')),
                  value: filters.newMembers,
                  onChanged: ref.read(discoveryFiltersProvider).setNewMembers,
                ),
                const SizedBox(height: SanjariSpacing.lg),
                AppButton(
                  label: tr(locale, _saving ? 'saving' : 'save'),
                  busy: _saving,
                  onPressed: _save,
                ),
              ],
            ),
    );
  }
}

class _MultiSelect extends StatelessWidget {
  const _MultiSelect({
    required this.title,
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  final String title;
  final List<FilterOption> options;
  final List<String> selected;
  final void Function(List<String> next) onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: SanjariSpacing.md),
        Text(title, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: SanjariSpacing.xs),
        Wrap(
          spacing: 8,
          children: [
            for (final option in options)
              FilterChip(
                label: Text(option.label),
                selected: selected.contains(option.value),
                onSelected: (active) {
                  final next = [...selected];
                  if (active) {
                    next.add(option.value);
                  } else {
                    next.remove(option.value);
                  }
                  onChanged(next);
                },
              ),
          ],
        ),
      ],
    );
  }
}
