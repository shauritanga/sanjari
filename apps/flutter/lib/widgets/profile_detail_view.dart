import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/discover/candidate.dart';
import '../features/profile/profile_detail.dart';
import '../features/profile/profile_hub.dart';
import '../l10n/locale_controller.dart';
import 'verification_badge.dart';

/// Present only when this is someone else's profile — renders the
/// like/pass footer and Block/Report safety row. Omit for self-preview.
/// Ports the ProfileDetailActions interface from ProfileDetailView.tsx.
class ProfileDetailActions {
  const ProfileDetailActions({
    required this.busy,
    required this.onPass,
    required this.onSuperLike,
    required this.onLike,
    required this.onBlock,
    required this.onReport,
  });

  final bool busy;
  final VoidCallback onPass;
  final VoidCallback onSuperLike;
  final VoidCallback onLike;
  final VoidCallback onBlock;
  final VoidCallback onReport;
}

/// Full profile detail view. Ports ProfileDetailView.tsx: paging photo hero
/// with fullscreen viewer, name plate with badges and location, banner,
/// bio, member-since, voice intro playback, interests, languages, prompts,
/// and (when [actions] is supplied) the like/pass footer and Block/Report
/// safety row for someone else's profile.
class ProfileDetailView extends ConsumerStatefulWidget {
  const ProfileDetailView({
    super.key,
    required this.profile,
    required this.onBack,
    this.actions,
    this.banner,
    this.error,
  });

  final ProfileDetail profile;
  final VoidCallback onBack;
  final ProfileDetailActions? actions;
  final String? banner;
  final String? error;

  @override
  ConsumerState<ProfileDetailView> createState() =>
      _ProfileDetailViewState();
}

class _ProfileDetailViewState extends ConsumerState<ProfileDetailView> {
  late final PageController _photos;
  int _activePhoto = 0;

  @override
  void initState() {
    super.initState();
    _photos = PageController();
  }

  @override
  void dispose() {
    _photos.dispose();
    super.dispose();
  }

  void _openViewer() {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black,
      builder: (context) => _PhotoViewer(
        profile: widget.profile,
        initialIndex: _activePhoto,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final profile = widget.profile;
    final heroHeight = MediaQuery.sizeOf(context).height * 0.58;
    final location = [
      distanceLabel(profile.distanceCategory),
      if (profile.city != null) profile.city,
      if (profile.countryName != null) profile.countryName,
    ].join(', ');

    return Scaffold(
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: heroHeight,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (profile.photos.isNotEmpty)
                    PageView.builder(
                      controller: _photos,
                      itemCount: profile.photos.length,
                      onPageChanged: (index) =>
                          setState(() => _activePhoto = index),
                      itemBuilder: (context, index) {
                        final photo = profile.photos[index];
                        return GestureDetector(
                          onTap: _openViewer,
                          child: Image.network(
                            photo.url,
                            fit: BoxFit.cover,
                            errorBuilder: (context, _, __) =>
                                _InitialsHero(
                              profile: profile,
                            ),
                          ),
                        );
                      },
                    )
                  else
                    _InitialsHero(profile: profile),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.35),
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.72),
                        ],
                        stops: const [0.0, 0.5, 1.0],
                      ),
                    ),
                  ),
                  Positioned(
                    top: MediaQuery.paddingOf(context).top + 8,
                    left: 16,
                    child: IconButton(
                      tooltip: MaterialLocalizations.of(
                        context,
                      ).backButtonTooltip,
                      style: IconButton.styleFrom(
                        backgroundColor:
                            Colors.black.withValues(alpha: 0.35),
                      ),
                      icon: const Icon(
                        Icons.arrow_back,
                        color: Colors.white,
                      ),
                      onPressed: widget.onBack,
                    ),
                  ),
                  if (profile.photos.length > 1)
                    Positioned(
                      top:
                          MediaQuery.paddingOf(context).top + 58,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment:
                            MainAxisAlignment.center,
                        children: [
                          for (int i = 0;
                              i < profile.photos.length;
                              i++)
                            Container(
                              width: 6,
                              height: 6,
                              margin:
                                  const EdgeInsets.symmetric(
                                horizontal: 3,
                              ),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: i == _activePhoto
                                    ? Colors.white
                                    : Colors.white.withValues(
                                        alpha: 0.45,
                                      ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 16,
                    child: Column(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                profile.age != null
                                    ? '${profile.safeName}, ${profile.age}'
                                    : profile.safeName,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 28,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            VerificationBadge(
                              displayName: profile.safeName,
                              photoVerified: profile
                                  .verification.photoVerified,
                              ageVerified: profile
                                  .verification.ageVerified,
                              idVerified: profile
                                  .verification.idVerified,
                              tone: VerificationTone.overlay,
                              size: 30,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          location,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                        if (profile.countryName != null ||
                            profile.occupationCategory !=
                                null ||
                            profile.educationLevel != null ||
                            profile.heightCm != null) ...[
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              if (profile.countryName != null)
                                _Chip(profile.countryName!),
                              if (profile.occupationCategory !=
                                  null)
                                _Chip(
                                  profile.occupationCategory!,
                                ),
                              if (profile.educationLevel != null)
                                _Chip(profile.educationLevel!),
                              if (profile.heightCm != null)
                                _Chip('${profile.heightCm} cm'),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (widget.banner != null)
                    Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(widget.banner!),
                      ),
                    ),
                  if (widget.error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        widget.error!,
                        style: TextStyle(
                          color: Theme.of(context)
                              .colorScheme
                              .error,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  if (profile.biography != null &&
                      profile.biography!.isNotEmpty)
                    Padding(
                      padding:
                          const EdgeInsets.only(bottom: 12),
                      child: Text(
                        profile.biography!,
                        style: const TextStyle(fontSize: 16),
                      ),
                    ),
                  if (memberSinceLabel(profile.memberSince) !=
                      null)
                    Padding(
                      padding:
                          const EdgeInsets.only(bottom: 16),
                      child: Text(
                        memberSinceLabel(profile.memberSince)!,
                      ),
                    ),
                  if (profile.voiceIntroUrl != null &&
                      profile.voiceIntroUrl!.isNotEmpty)
                    Padding(
                      padding:
                          const EdgeInsets.only(bottom: 16),
                      child: _VoiceIntro(
                        url: profile.voiceIntroUrl!,
                      ),
                    ),
                  if (profile.interests.isNotEmpty) ...[
                    _SectionLabel(tr(locale, 'interests')),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final interest
                            in profile.interests)
                          _Chip(interest.label),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (profile.languages.isNotEmpty) ...[
                    _SectionLabel(tr(locale, 'languages')),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final language
                            in profile.languages)
                          _Chip(language.label),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (profile.prompts.isNotEmpty) ...[
                    _SectionLabel(tr(locale, 'promptsSection')),
                    for (final entry in profile.prompts)
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(
                                entry.prompt,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(entry.answer),
                            ],
                          ),
                        ),
                      ),
                  ],
                  if (widget.actions != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TextButton.icon(
                          onPressed: widget.actions!.onBlock,
                          icon: const Icon(
                            Icons.shield_outlined,
                            size: 16,
                          ),
                          label: Text(tr(locale, 'block')),
                        ),
                        const SizedBox(width: 16),
                        TextButton.icon(
                          onPressed: widget.actions!.onReport,
                          icon: const Icon(
                            Icons.flag_outlined,
                            size: 16,
                          ),
                          label: Text(tr(locale, 'report')),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: widget.actions == null
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _ProfileActionButton(
                    icon: Icons.close,
                    color: Theme.of(context).colorScheme.error,
                    disabled: widget.actions!.busy,
                    onPressed: widget.actions!.onPass,
                  ),
                  _ProfileActionButton(
                    icon: Icons.star,
                    color: Theme.of(context).colorScheme.secondary,
                    disabled: widget.actions!.busy,
                    onPressed: widget.actions!.onSuperLike,
                  ),
                  _ProfileActionButton(
                    icon: Icons.favorite,
                    color: Colors.white,
                    background: Theme.of(context).colorScheme.primary,
                    busy: widget.actions!.busy,
                    disabled: widget.actions!.busy,
                    onPressed: widget.actions!.onLike,
                  ),
                ],
              ),
            ),
    );
  }
}

class _ProfileActionButton extends StatelessWidget {
  const _ProfileActionButton({
    required this.icon,
    required this.color,
    this.background,
    this.busy = false,
    this.disabled = false,
    required this.onPressed,
  });

  final IconData icon;
  final Color color;
  final Color? background;
  final bool busy;
  final bool disabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final child = busy
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: color),
          )
        : Icon(icon, size: 26, color: color);
    if (background != null) {
      return FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: background,
          shape: const CircleBorder(),
          padding: const EdgeInsets.all(16),
        ),
        onPressed: disabled ? null : onPressed,
        child: child,
      );
    }
    return IconButton(
      style: IconButton.styleFrom(
        backgroundColor:
            Theme.of(context).colorScheme.surfaceContainerHighest,
        fixedSize: const Size(56, 56),
      ),
      onPressed: disabled ? null : onPressed,
      icon: child,
    );
  }
}

class _InitialsHero extends StatelessWidget {
  const _InitialsHero({required this.profile});

  final ProfileDetail profile;

  @override
  Widget build(BuildContext context) {
    return Container(
      color:
          Theme.of(context).colorScheme.surfaceContainerHighest,
      alignment: Alignment.center,
      child: Text(
        profile.initials(),
        style: const TextStyle(
          fontSize: 96,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text(label));
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
          color: Theme.of(context).colorScheme.secondary,
        ),
      ),
    );
  }
}

/// Voice intro playback. Ports the VoiceIntro player from
/// ProfileDetailView.tsx (play/pause toggle with status label).
class _VoiceIntro extends ConsumerStatefulWidget {
  const _VoiceIntro({required this.url});

  final String url;

  @override
  ConsumerState<_VoiceIntro> createState() => _VoiceIntroState();
}

class _VoiceIntroState extends ConsumerState<_VoiceIntro> {
  late final AudioPlayer _player;
  late final StreamSubscription<PlayerState> _subscription;
  bool _playing = false;

  @override
  void initState() {
    super.initState();
    _player = AudioPlayer();
    _subscription = _player.onPlayerStateChanged.listen((state) {
      if (mounted) setState(() => _playing = state == PlayerState.playing);
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    _player.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_playing) {
      await _player.pause();
    } else {
      await _player.play(UrlSource(widget.url));
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionLabel(tr(locale, 'voiceIntro')),
        InkWell(
          onTap: _toggle,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Icon(
                  _playing
                      ? Icons.pause_circle_filled
                      : Icons.play_circle_fill,
                  size: 36,
                ),
                const SizedBox(width: 8),
                Text(
                  _playing
                      ? tr(locale, 'playingVoice')
                      : tr(locale, 'playVoiceIntro'),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Fullscreen photo viewer with counter and close button.
/// Ports the viewer Modal (without the report action, which belongs to
/// the `actions` variant for someone else's profile).
class _PhotoViewer extends StatefulWidget {
  const _PhotoViewer({
    required this.profile,
    required this.initialIndex,
  });

  final ProfileDetail profile;
  final int initialIndex;

  @override
  State<_PhotoViewer> createState() => _PhotoViewerState();
}

class _PhotoViewerState extends State<_PhotoViewer> {
  late final PageController _controller;
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex;
    _controller = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog.fullscreen(
      backgroundColor: Colors.black,
      child: Stack(
        children: [
          PageView.builder(
            controller: _controller,
            itemCount: widget.profile.photos.length,
            onPageChanged: (index) =>
                setState(() => _index = index),
            itemBuilder: (context, index) {
              return Image.network(
                widget.profile.photos[index].url,
                fit: BoxFit.contain,
                errorBuilder: (context, _, __) => const SizedBox.shrink(),
              );
            },
          ),
          Positioned(
            top: MediaQuery.paddingOf(context).top + 8,
            left: 8,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 24),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
          if (widget.profile.photos.length > 1)
            Positioned(
              bottom: MediaQuery.paddingOf(context).bottom + 16,
              left: 0,
              right: 0,
              child: Text(
                '${_index + 1} / ${widget.profile.photos.length}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
    );
  }
}
