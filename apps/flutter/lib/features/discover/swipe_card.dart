import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import 'candidate.dart';

/// Draggable profile card. Ports SwipeCard from discover.tsx: 120px
/// threshold, rotation up to ~12 degrees, LIKE/PASS stamps, tap to view.
class SwipeCard extends ConsumerStatefulWidget {
  const SwipeCard({
    super.key,
    required this.candidate,
    required this.onSwipeLeft,
    required this.onSwipeRight,
    required this.onTap,
  });

  final Candidate candidate;
  final VoidCallback onSwipeLeft;
  final VoidCallback onSwipeRight;
  final VoidCallback onTap;

  @override
  ConsumerState<SwipeCard> createState() => _SwipeCardState();
}

class _SwipeCardState extends ConsumerState<SwipeCard> {
  static const threshold = 120.0;

  Offset _drag = Offset.zero;
  int _fling = 0; // -1 = pass, 1 = like, 0 = idle
  double _width = 400;

  void _onPanUpdate(DragUpdateDetails details) {
    if (_fling != 0) return;
    setState(() {
      _drag += Offset(details.delta.dx, details.delta.dy);
    });
  }

  void _onPanEnd(DragEndDetails details) {
    if (_fling != 0) return;
    if (_drag.dx > threshold) {
      setState(() {
        _fling = 1;
        _drag = Offset(_width * 1.5, _drag.dy);
      });
    } else if (_drag.dx < -threshold) {
      setState(() {
        _fling = -1;
        _drag = Offset(-_width * 1.5, _drag.dy);
      });
    } else {
      setState(() => _drag = Offset.zero);
    }
  }

  void _onAnimationEnd() {
    if (_fling == 1) {
      widget.onSwipeRight();
    } else if (_fling == -1) {
      widget.onSwipeLeft();
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final candidate = widget.candidate;
    _width = MediaQuery.sizeOf(context).width;

    final likeOpacity = (_drag.dx / threshold).clamp(0.0, 1.0);
    final passOpacity = (-_drag.dx / threshold).clamp(0.0, 1.0);
    final angle = (_drag.dx / _width) * 12 * math.pi / 180;

    final initial = candidate.safeName.trim().isEmpty
        ? 'S'
        : candidate.safeName.trim()[0].toUpperCase();

    return GestureDetector(
      onPanUpdate: _onPanUpdate,
      onPanEnd: _onPanEnd,
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: Duration(milliseconds: _fling == 0 ? 200 : 220),
        onEnd: _onAnimationEnd,
        transform: Matrix4.identity()
          ..translateByDouble(_drag.dx, _drag.dy, 0.0, 1.0)
          ..rotateZ(angle),
        child: Card(
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(SanjariRadius.lg),
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Container(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: candidate.primaryPhoto?.url.isNotEmpty == true
                    ? Image.network(
                        candidate.primaryPhoto!.url,
                        fit: BoxFit.cover,
                        errorBuilder: (context, _, __) => Center(
                          child: Text(
                            initial,
                            style: const TextStyle(
                              fontSize: 96,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      )
                    : Center(
                        child: Text(
                          initial,
                          style: const TextStyle(
                            fontSize: 96,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
              ),
              if (likeOpacity > 0)
                Positioned(
                  top: 24,
                  left: 24,
                  child: Opacity(
                    opacity: likeOpacity,
                    child: _Stamp(
                      label: tr(locale, 'likeStamp'),
                      color: SanjariColors.success,
                    ),
                  ),
                ),
              if (passOpacity > 0)
                Positioned(
                  top: 24,
                  right: 24,
                  child: Opacity(
                    opacity: passOpacity,
                    child: _Stamp(
                      label: tr(locale, 'passStamp'),
                      color: SanjariColors.error,
                    ),
                  ),
                ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.all(SanjariSpacing.lg),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.72),
                      ],
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              candidate.age != null
                                  ? '${candidate.safeName}, ${candidate.age}'
                                  : candidate.safeName,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 26,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          if (candidate.verification.anyVerified)
                            const Padding(
                              padding: EdgeInsets.only(left: 8),
                              child: Icon(
                                Icons.verified,
                                color: Colors.white,
                                size: 26,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [
                          distanceLabel(candidate.distanceCategory),
                          if (candidate.city != null) candidate.city,
                          if (candidate.countryName != null)
                            candidate.countryName,
                        ].join(', '),
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                      if (candidate.countryName != null ||
                          candidate.occupationCategory != null) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: [
                            if (candidate.countryName != null)
                              Chip(label: Text(candidate.countryName!)),
                            if (candidate.occupationCategory != null)
                              Chip(
                                label:
                                    Text(candidate.occupationCategory!),
                              ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Stamp extends StatelessWidget {
  const _Stamp({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        border: Border.all(color: color, width: 3),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 22,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
