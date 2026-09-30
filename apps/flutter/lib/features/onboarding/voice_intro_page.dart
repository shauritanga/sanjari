import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/devices.dart';
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Voice intro recorder. Port of
/// apps/mobile/app/onboarding/voice-intro.tsx: 60s capped recording with
/// auto-stop, presign → PUT → complete upload, playback of the take,
/// re-record/remove, and Continue/Skip both routing to review (the step is
/// optional).
class VoiceIntroPage extends ConsumerStatefulWidget {
  const VoiceIntroPage({super.key});

  @override
  ConsumerState<VoiceIntroPage> createState() => _VoiceIntroPageState();
}

class _VoiceIntroPageState extends ConsumerState<VoiceIntroPage> {
  bool _recording = false;
  int _durationMs = 0;
  String? _recordingPath;
  bool _uploading = false;
  bool _uploaded = false;
  bool _playing = false;
  String? _error;
  StreamSubscription<Duration>? _progressSub;
  StreamSubscription<bool>? _playingSub;
  bool _stopArmed = false;

  @override
  void initState() {
    super.initState();
    _uploaded = ref.read(onboardingControllerProvider).draft.voiceIntroKey !=
        null;
  }

  @override
  void dispose() {
    _progressSub?.cancel();
    _playingSub?.cancel();
    super.dispose();
  }

  void _watchRecorder() {
    _progressSub?.cancel();
    _progressSub =
        ref.read(voiceRecorderProvider).progress.listen((elapsed) {
      if (!mounted) return;
      setState(() => _durationMs = elapsed.inMilliseconds);
      if (elapsed.inMilliseconds >= maxVoiceMillis && !_stopArmed) {
        _stopArmed = true;
        _stop();
      }
    });
  }

  Future<void> _startRecording() async {
    setState(() => _error = null);
    try {
      final recorder = ref.read(voiceRecorderProvider);
      if (!await recorder.ensureMicAccess()) {
        setState(() {
          _error = 'Microphone access is needed to record a voice intro.';
        });
        return;
      }
      setState(() {
        _recordingPath = null;
        _uploaded = false;
        _recording = true;
        _durationMs = 0;
        _stopArmed = false;
      });
      _watchRecorder();
      await recorder.start();
    } on DeviceDenied catch (e) {
      setState(() {
        _error = e.message;
        _recording = false;
      });
    } catch (_) {
      setState(() {
        _error = 'Unable to start recording.';
        _recording = false;
      });
    }
  }

  Future<void> _stop() async {
    try {
      final take = await ref.read(voiceRecorderProvider).stop();
      if (!mounted) return;
      setState(() {
        _recording = false;
        _recordingPath = take.path;
      });
      await _upload(take.path);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _stopArmed = false;
        _recording = false;
        _error = 'Unable to stop recording.';
      });
    }
  }

  Future<void> _upload(String path) async {
    setState(() {
      _uploading = true;
      _error = null;
    });
    try {
      final key = await ref
          .read(mediaRepositoryProvider)
          .uploadVoiceRecording(path);
      ref.read(onboardingControllerProvider).setVoiceIntroKey(key);
      if (!mounted) return;
      setState(() => _uploaded = true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Upload failed. Please try again.');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _remove() async {
    setState(() => _error = null);
    try {
      await ref.read(mediaRepositoryProvider).removeVoiceRecording();
      ref.read(onboardingControllerProvider).setVoiceIntroKey(null);
      if (!mounted) return;
      setState(() {
        _recordingPath = null;
        _uploaded = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Unable to remove your recording.');
    }
  }

  Future<void> _togglePlayback() async {
    final path = _recordingPath;
    if (path == null) return;
    final player = ref.read(soundPlayerProvider);
    if (_playing) {
      await player.pause();
      return;
    }
    _playingSub?.cancel();
    _playingSub = player.playing.listen((playing) {
      if (mounted) setState(() => _playing = playing);
    });
    await player.play(path);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final hasRecording = _uploaded || _recordingPath != null;
    return OnboardingScreen(
      step: stepNumber('voice-intro'),
      title: 'Add a voice intro',
      subtitle: 'Let your personality shine — optional but boosts your profile.',
      primaryLabel: 'Continue',
      onPrimary: () => context.push(pathForStep('review')),
      secondaryLabel: 'Skip',
      onSecondary: () => context.push(pathForStep('review')),
      footerNote: _error,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 48),
          if (!hasRecording) ...[
            GestureDetector(
              onTap: () => _recording ? _stop() : _startRecording(),
              child: Container(
                width: 120,
                height: 120,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _recording ? scheme.error : scheme.primary,
                ),
                child: Icon(
                  _recording ? Icons.stop_circle_outlined : Icons.mic_outlined,
                  color: scheme.onPrimary,
                  size: 44,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              _recording
                  ? 'Recording… ${voiceSeconds(_durationMs)}s / 60s'
                  : 'Tap to record up to 60 seconds',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
          ] else ...[
            if (_uploading)
              Text(
                'Uploading your recording…',
                style: TextStyle(color: scheme.onSurfaceVariant),
              )
            else ...[
              GestureDetector(
                onTap: _togglePlayback,
                child: Container(
                  width: 120,
                  height: 120,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: scheme.primary,
                  ),
                  child: Icon(
                    _playing
                        ? Icons.pause_circle_outlined
                        : Icons.play_circle_outlined,
                    color: scheme.onPrimary,
                    size: 44,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Recording saved',
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton(
                    onPressed: _startRecording,
                    child: const Text('Re-record'),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: _remove,
                    child: Text(
                      'Remove',
                      style: TextStyle(color: scheme.error),
                    ),
                  ),
                ],
              ),
            ],
          ],
          const SizedBox(height: 48),
        ],
      ),
    );
  }
}
