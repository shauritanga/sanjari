import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/chip_group.dart';
import '../../widgets/searchable_select.dart';
import '../../widgets/selectable_card.dart';
import '../../widgets/toggle_row.dart';
import '../../widgets/verification_badge.dart';
import '../onboarding/onboarding_controller.dart';
import '../onboarding/onboarding_options.dart';
import '../onboarding/photo_grid.dart';
import 'profile_edit_controller.dart';
import 'profile_editor.dart';

/// Full profile editor. Port of the edit branch of
/// apps/mobile/app/(tabs)/profile.tsx: hero with status pill, completion
/// progress, photos, about, lifestyle, location pickers, looking-for
/// chips, privacy toggles with discovery pause, camera verification
/// cards, and the save/publish footer.
class ProfileEditPage extends ConsumerStatefulWidget {
  const ProfileEditPage({super.key});

  @override
  ConsumerState<ProfileEditPage> createState() => _ProfileEditPageState();
}

class _ProfileEditPageState extends ConsumerState<ProfileEditPage> {
  final _name = TextEditingController();
  final _pronouns = TextEditingController();
  final _bio = TextEditingController();
  final _occupation = TextEditingController();
  final _education = TextEditingController();
  final _height = TextEditingController();
  final _cultural = TextEditingController();
  bool _seeded = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(profileEditControllerProvider).load(),
    );
  }

  @override
  void dispose() {
    _name.dispose();
    _pronouns.dispose();
    _bio.dispose();
    _occupation.dispose();
    _education.dispose();
    _height.dispose();
    _cultural.dispose();
    super.dispose();
  }

  void _seed(EditableProfile draft) {
    _name.text = draft.displayName ?? '';
    _pronouns.text = draft.pronouns ?? '';
    _bio.text = draft.biography ?? '';
    _occupation.text = draft.occupationCategory ?? '';
    _education.text = draft.educationLevel ?? '';
    _height.text = draft.heightCm?.toString() ?? '';
    _cultural.text = draft.culturalPreference ?? '';
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(profileEditControllerProvider);
    final scheme = Theme.of(context).colorScheme;
    if (!controller.loading && !_seeded) {
      _seeded = true;
      _seed(controller.profile);
    }
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Edit profile'),
        actions: [
          TextButton.icon(
            onPressed: () => context.push('/profile/preview'),
            icon: const Icon(Icons.visibility_outlined, size: 16),
            label: const Text('Preview'),
          ),
        ],
      ),
      body: controller.loading
          ? const Center(child: CircularProgressIndicator())
          : _Body(
              controller: controller,
              scheme: scheme,
              fields: _Fields(
                name: _name,
                pronouns: _pronouns,
                bio: _bio,
                occupation: _occupation,
                education: _education,
                height: _height,
                cultural: _cultural,
              ),
            ),
      bottomNavigationBar: controller.loading
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(SanjariSpacing.md),
                child: Row(
                  children: [
                    Expanded(
                      child: AppButton(
                        label: controller.saving
                            ? 'Saving...'
                            : 'Save changes',
                        onPressed: controller.saving
                            ? null
                            : () => ref
                                .read(profileEditControllerProvider)
                                .save(),
                        busy: controller.saving,
                      ),
                    ),
                    if (controller.onboardingStatus != 'published') ...[
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: controller.publishing
                              ? null
                              : () => ref
                                  .read(profileEditControllerProvider)
                                  .publish(),
                          child: controller.publishing
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Publish profile'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
    );
  }
}

class _Fields {
  _Fields({
    required this.name,
    required this.pronouns,
    required this.bio,
    required this.occupation,
    required this.education,
    required this.height,
    required this.cultural,
  });

  final TextEditingController name;
  final TextEditingController pronouns;
  final TextEditingController bio;
  final TextEditingController occupation;
  final TextEditingController education;
  final TextEditingController height;
  final TextEditingController cultural;
}

class _Body extends ConsumerWidget {
  const _Body({
    required this.controller,
    required this.scheme,
    required this.fields,
  });

  final ProfileEditController controller;
  final ColorScheme scheme;
  final _Fields fields;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final draft = controller.profile;
    final selfie = controller.latestFor('selfie_liveness');
    final id = controller.latestFor('identity_document');
    final primary = draft.photos.where((p) => p.isPrimary).toList();
    final heroPhoto = primary.isEmpty
        ? (draft.photos.isEmpty ? null : draft.photos.first)
        : primary.first;
    final initial = ((draft.displayName ?? 'S').trim().isEmpty
            ? 'S'
            : (draft.displayName ?? 'S').trim()[0])
        .toUpperCase();
    final published = controller.onboardingStatus == 'published';
    return ListView(
      padding: const EdgeInsets.all(SanjariSpacing.lg),
      children: [
        _Hero(
          draft: draft,
          heroPhotoUrl: heroPhoto?.url,
          initial: initial,
          age: controller.age,
          published: published,
          selfieApproved: selfie?.status == 'approved',
          idApproved: id?.status == 'approved',
        ),
        const SizedBox(height: 12),
        _ProgressCard(score: controller.score),
        if (controller.error.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(
            controller.error,
            style: TextStyle(color: scheme.error),
          ),
        ],
        if (controller.saved) ...[
          const SizedBox(height: 12),
          const Text(
            'Saved',
            style: TextStyle(
              color: SanjariColors.success,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
        _Section(
          title: 'Photos',
          hint: 'Lead with a clear photo that feels like you. '
              'Tap a photo for more options.',
          child: PhotoGrid(
            photos: draft.photos,
            onChanged: (photos) => ref
                .read(profileEditControllerProvider)
                .setPhotos(photos),
            picker: ref.watch(mediaPickerProvider),
            media: ref.watch(mediaRepositoryProvider),
          ),
        ),
        _Section(
          title: 'About you',
          hint: 'Share the details people need to get to know you.',
          child: _AboutSection(
            controller: controller,
            draft: draft,
            fields: fields,
          ),
        ),
        _Section(
          title: 'Lifestyle',
          hint: "All optional — share as much or as little as you'd like.",
          child: _LifestyleSection(
            controller: controller,
            draft: draft,
            heightController: fields.height,
            culturalController: fields.cultural,
          ),
        ),
        _Section(
          title: 'Location',
          hint: 'Choose a broad area. Your exact address is never required.',
          child: _LocationSection(controller: controller),
        ),
        _Section(
          title: "What you're looking for",
          hint: 'Tap to update any of these anytime.',
          child: _LookingForSection(
            controller: controller,
            draft: draft,
          ),
        ),
        _Section(
          title: 'Privacy',
          hint: 'Choose what other members can see on your profile.',
          child: _PrivacySection(
            controller: controller,
            draft: draft,
          ),
        ),
        _Section(
          title: 'Verification',
          hint: 'Verification badges describe the check performed, not '
              "someone's character or safety.",
          child: _VerificationSection(controller: controller),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({
    required this.draft,
    required this.heroPhotoUrl,
    required this.initial,
    required this.age,
    required this.published,
    required this.selfieApproved,
    required this.idApproved,
  });

  final EditableProfile draft;
  final String? heroPhotoUrl;
  final String initial;
  final int? age;
  final bool published;
  final bool selfieApproved;
  final bool idApproved;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final url = heroPhotoUrl;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(SanjariSpacing.md),
        child: Row(
          children: [
            Container(
              width: 72,
              height: 72,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: scheme.surfaceContainerHighest,
              ),
              clipBehavior: Clip.antiAlias,
              child: url != null && url.isNotEmpty
                  ? Image.network(url, fit: BoxFit.cover)
                  : Text(
                      initial,
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: scheme.primary,
                      ),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${draft.displayName?.isNotEmpty == true ? draft.displayName : 'Add your name'}${age != null ? ', $age' : ''}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      VerificationBadge(
                        displayName: draft.displayName ?? 'You',
                        size: 18,
                        photoVerified: selfieApproved,
                        ageVerified: idApproved,
                        idVerified: idApproved,
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color: published
                          ? SanjariColors.success
                          : scheme.surfaceContainerHighest,
                    ),
                    child: Text(
                      publishStatusLabel(
                        published ? 'published' : 'in_progress',
                      ),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: published
                            ? Colors.white
                            : scheme.onSurfaceVariant,
                      ),
                    ),
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

class _ProgressCard extends StatelessWidget {
  const _ProgressCard({required this.score});

  final int score;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(SanjariSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: SizedBox(
                      height: 6,
                      child: LinearProgressIndicator(
                        value: (score / 100).clamp(0.0, 1.0),
                        backgroundColor: scheme.outlineVariant,
                        color: scheme.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '$score%',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              score >= 100
                  ? 'Your profile is complete.'
                  : 'Fill in a few more details to stand out.',
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.hint,
    required this.child,
  });

  final String title;
  final String hint;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 2),
          Text(
            hint,
            style: TextStyle(
              fontSize: 13,
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _Labeled extends StatelessWidget {
  const _Labeled({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 6),
          child,
        ],
      ),
    );
  }
}

List<String> _single(String? value) =>
    value == null || value.isEmpty ? const [] : [value];

String _firstOrEmpty(List<String> next) =>
    next.isEmpty ? '' : next.first;

String? _firstOrNull(List<String> next) =>
    next.isEmpty ? null : next.first;

class _AboutSection extends ConsumerWidget {
  const _AboutSection({
    required this.controller,
    required this.draft,
    required this.fields,
  });

  final ProfileEditController controller;
  final EditableProfile draft;
  final _Fields fields;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void edit(void Function(EditableProfile) mutate) =>
        ref.read(profileEditControllerProvider).edit(mutate);
    return Column(
      children: [
        AppTextField(
          label: 'Display name',
          controller: fields.name,
          onChanged: (value) =>
              edit((d) => d.displayName = value),
        ),
        const SizedBox(height: 12),
        _Labeled(
          label: 'Gender',
          child: ChipGroup(
            options: [
              for (final option in genderOptions)
                ChipOption(value: option.value, label: option.label),
            ],
            selected: _single(draft.gender),
            multiple: false,
            onChanged: (next) =>
                edit((d) => d.gender = _firstOrEmpty(next)),
          ),
        ),
        AppTextField(
          label: 'Pronouns',
          controller: fields.pronouns,
          hint: 'e.g. she/her, he/him, they/them',
          maxLength: 40,
          onChanged: (value) => edit((d) => d.pronouns = value),
        ),
        const SizedBox(height: 12),
        AppTextField(
          label: 'Biography',
          controller: fields.bio,
          maxLength: 500,
          minLines: 4,
          onChanged: (value) => edit((d) => d.biography = value),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: AppTextField(
                label: 'Occupation',
                controller: fields.occupation,
                onChanged: (value) =>
                    edit((d) => d.occupationCategory = value),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AppTextField(
                label: 'Education',
                controller: fields.education,
                onChanged: (value) =>
                    edit((d) => d.educationLevel = value),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SingleChips extends ConsumerWidget {
  const _SingleChips({
    required this.label,
    required this.options,
    required this.value,
    required this.onPick,
  });

  final String label;
  final List<SelectOption> options;
  final String? value;
  final ValueChanged<String?> onPick;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _Labeled(
      label: label,
      child: ChipGroup(
        options: [
          for (final option in options)
            ChipOption(value: option.value, label: option.label),
        ],
        selected: _single(value),
        multiple: false,
        onChanged: (next) => onPick(_firstOrNull(next)),
      ),
    );
  }
}

class _LifestyleSection extends ConsumerWidget {
  const _LifestyleSection({
    required this.controller,
    required this.draft,
    required this.heightController,
    required this.culturalController,
  });

  final ProfileEditController controller;
  final EditableProfile draft;
  final TextEditingController heightController;
  final TextEditingController culturalController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void edit(void Function(EditableProfile) mutate) =>
        ref.read(profileEditControllerProvider).edit(mutate);
    return Column(
      children: [
        AppTextField(
          label: 'Height (cm)',
          controller: heightController,
          keyboardType: TextInputType.number,
          hint: 'e.g. 170',
          maxLength: 3,
          onChanged: (value) =>
              edit((d) => d.heightCm = sanitizeHeightInput(value)),
        ),
        const SizedBox(height: 12),
        _SingleChips(
          label: 'Drinking',
          options: drinkingOptions,
          value: draft.drinkingPreference,
          onPick: (value) => edit((d) => d.drinkingPreference = value),
        ),
        _SingleChips(
          label: 'Smoking',
          options: smokingOptions,
          value: draft.smokingPreference,
          onPick: (value) => edit((d) => d.smokingPreference = value),
        ),
        _SingleChips(
          label: 'Exercise',
          options: exerciseOptions,
          value: draft.exercisePreference,
          onPick: (value) => edit((d) => d.exercisePreference = value),
        ),
        _SingleChips(
          label: 'Children',
          options: childrenOptions,
          value: draft.childrenPreference,
          onPick: (value) => edit((d) => d.childrenPreference = value),
        ),
        AppTextField(
          label: 'Religious or cultural preference (optional)',
          controller: culturalController,
          hint: "Share only if you'd like to",
          maxLength: 80,
          onChanged: (value) =>
              edit((d) => d.culturalPreference = value),
        ),
      ],
    );
  }
}

class _DropdownRow extends StatelessWidget {
  const _DropdownRow({
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: scheme.outline),
          ),
          child: Row(
            children: [
              Icon(
                Icons.location_on_outlined,
                color: scheme.primary,
                size: 18,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 15),
                ),
              ),
              Icon(
                Icons.keyboard_arrow_down,
                color: scheme.onSurfaceVariant,
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LocationSection extends ConsumerWidget {
  const _LocationSection({required this.controller});

  final ProfileEditController controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final draft = controller.profile;
    final country = controller.selectedCountry;
    void openCountry() {
      SearchableSelect.show(
        context,
        title: 'Choose your country',
        placeholder: 'Search countries',
        options: [
          for (final entry in controller.countries)
            SearchSelectOption(value: entry.code, label: entry.name),
        ],
        selectedValue: draft.countryCode,
        onSelect: (value) =>
            ref.read(profileEditControllerProvider).selectCountry(value),
        emptyLabel: 'No countries match your search.',
      );
    }

    void openCity() {
      final cities = country?.cities ?? const [];
      SearchableSelect.show(
        context,
        title: 'Choose your city',
        placeholder: 'Search cities',
        options: [
          for (final city in cities)
            SearchSelectOption(value: city.id, label: city.name),
        ],
        selectedValue: draft.cityId,
        onSelect: (value) =>
            ref.read(profileEditControllerProvider).selectCity(value),
        emptyLabel: 'No cities match your search.',
      );
    }

    return Column(
      children: [
        _DropdownRow(
          label: country?.name ?? 'Choose a country',
          onTap: openCountry,
        ),
        if (country != null)
          _DropdownRow(
            label: draft.cityName ?? draft.city ?? 'Choose a city',
            onTap: openCity,
          ),
      ],
    );
  }
}

class _LookingForSection extends ConsumerWidget {
  const _LookingForSection({
    required this.controller,
    required this.draft,
  });

  final ProfileEditController controller;
  final EditableProfile draft;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void edit(void Function(EditableProfile) mutate) =>
        ref.read(profileEditControllerProvider).edit(mutate);
    return Column(
      children: [
        _Labeled(
          label: 'Interested in',
          child: ChipGroup(
            options: [
              for (final option in whoToMeetOptions)
                ChipOption(value: option.value, label: option.label),
            ],
            selected: draft.interestedIn,
            onChanged: (next) => edit((d) => d.interestedIn = next),
          ),
        ),
        _Labeled(
          label: 'Relationship intentions',
          child: ChipGroup(
            options: [
              for (final option in intentionOptions)
                ChipOption(value: option.value, label: option.label),
            ],
            selected: draft.relationshipIntentions,
            max: 3,
            onChanged: (next) =>
                edit((d) => d.relationshipIntentions = next),
          ),
        ),
        _Labeled(
          label: 'Interests',
          child: ChipGroup(
            options: [
              for (final option in interestOptions)
                ChipOption(value: option.value, label: option.label),
            ],
            selected: draft.interests,
            max: 20,
            onChanged: (next) => edit((d) => d.interests = next),
          ),
        ),
        _Labeled(
          label: 'Languages',
          child: ChipGroup(
            options: [
              for (final option in languageOptions)
                ChipOption(value: option.value, label: option.label),
            ],
            selected: draft.languages,
            max: 10,
            onChanged: (next) => edit((d) => d.languages = next),
          ),
        ),
      ],
    );
  }
}

class _PrivacySection extends ConsumerWidget {
  const _PrivacySection({
    required this.controller,
    required this.draft,
  });

  final ProfileEditController controller;
  final EditableProfile draft;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void edit(void Function(EditableProfile) mutate) =>
        ref.read(profileEditControllerProvider).edit(mutate);
    final visibility = draft.visibility;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hide from other members',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        ToggleRow(
          title: 'Age',
          value: visibility.hideAge,
          onChanged: (value) =>
              edit((d) => d.visibility.hideAge = value),
        ),
        ToggleRow(
          title: 'City',
          value: visibility.hideCity,
          onChanged: (value) =>
              edit((d) => d.visibility.hideCity = value),
        ),
        ToggleRow(
          title: 'Occupation',
          value: visibility.hideOccupation,
          onChanged: (value) =>
              edit((d) => d.visibility.hideOccupation = value),
        ),
        ToggleRow(
          title: 'Education',
          value: visibility.hideEducation,
          onChanged: (value) =>
              edit((d) => d.visibility.hideEducation = value),
        ),
        ToggleRow(
          title: 'Height',
          value: visibility.hideHeight,
          onChanged: (value) =>
              edit((d) => d.visibility.hideHeight = value),
        ),
        const SizedBox(height: 8),
        Text(
          'Activity visibility',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        ToggleRow(
          title: 'Online status',
          description: "Hide the green dot and 'Online' label in chat.",
          value: visibility.hideOnlineStatus,
          onChanged: (value) =>
              edit((d) => d.visibility.hideOnlineStatus = value),
        ),
        ToggleRow(
          title: 'Read receipts',
          description:
              "You also won't see when others have read your messages.",
          value: visibility.hideReadReceipts,
          onChanged: (value) =>
              edit((d) => d.visibility.hideReadReceipts = value),
        ),
        const SizedBox(height: 8),
        Center(
          child: TextButton(
            onPressed: () =>
                ref.read(profileEditControllerProvider).togglePause(),
            child: Text(
              controller.paused ? 'Resume discovery' : 'Pause discovery',
              style: TextStyle(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _VerificationSection extends ConsumerWidget {
  const _VerificationSection({required this.controller});

  final ProfileEditController controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selfie = controller.latestFor('selfie_liveness');
    final id = controller.latestFor('identity_document');
    return Column(
      children: [
        _VerifyCard(
          title: 'Selfie verification',
          status: selfie?.status,
          busy: controller.requesting == 'selfie_liveness',
          onTap: () => ref
              .read(profileEditControllerProvider)
              .requestVerification('selfie_liveness'),
        ),
        const SizedBox(height: 12),
        _VerifyCard(
          title: 'ID verification',
          status: id?.status,
          busy: controller.requesting == 'identity_document',
          onTap: () => ref
              .read(profileEditControllerProvider)
              .requestVerification('identity_document'),
        ),
      ],
    );
  }
}

class _VerifyCard extends StatelessWidget {
  const _VerifyCard({
    required this.title,
    required this.status,
    required this.busy,
    required this.onTap,
  });

  final String title;
  final String? status;
  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    Color iconColor() {
      if (status == 'approved') return SanjariColors.success;
      if (status == 'rejected') return scheme.error;
      if (status != null) return scheme.primary;
      return scheme.onSurfaceVariant;
    }

    return SelectableCard(
      title: title,
      description:
          busy ? 'Uploading…' : profileStatusLabel(status),
      icon: busy
          ? const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(
              Icons.verified_outlined,
              color: iconColor(),
              size: 24,
            ),
      selected: status == 'approved',
      onTap: onTap,
    );
  }
}
