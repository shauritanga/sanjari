import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';

import '../../core/theme.dart';

class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

  static const _plum = SanjariColors.coral;
  static const _pink = Color(0xFFF8E5F3);
  static const _muted = Color(0xFF8D858D);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 44, 24, 20),
          child: Column(
            children: [
              const SizedBox(height: 4),
              const SizedBox(height: 338, child: _OrbitIllustration()),
              const SizedBox(height: 84),
              Text(
                'Let’s meet new people\naround you',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: const Color(0xFF17121A),
                      fontSize: 31,
                      height: 1.12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.8,
                    ),
              ),
              const SizedBox(height: 32),
              _AuthButton(
                background: _plum,
                foreground: Colors.white,
                icon: HugeIcons.strokeRoundedCall,
                label: 'Login with Phone',
                onPressed: () => context.push('/auth/phone'),
              ),
              const SizedBox(height: 12),
              _AuthButton(
                background: _pink,
                foreground: _plum,
                iconWidget: const _GoogleMark(),
                label: 'Login with Google',
                onPressed: () => ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(const SnackBar(
                    content: Text('Google sign-in is coming soon.'),
                  )),
              ),
              const SizedBox(height: 24),
              Wrap(
                alignment: WrapAlignment.center,
                children: [
                  const Text('Don’t have an account? ',
                      style: TextStyle(color: _muted, fontSize: 16)),
                  GestureDetector(
                    onTap: () => context.push('/onboarding/age'),
                    child: const Text('Sign Up',
                        style: TextStyle(
                            color: Color(0xFFD36BC4),
                            fontSize: 16,
                            fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuthButton extends StatelessWidget {
  const _AuthButton(
      {required this.background,
      required this.foreground,
      required this.label,
      required this.onPressed,
      this.icon,
      this.iconWidget});
  final Color background;
  final Color foreground;
  final String label;
  final VoidCallback onPressed;
  final dynamic icon;
  final Widget? iconWidget;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 58,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
            backgroundColor: background,
            foregroundColor: foreground,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30))),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .95),
                  shape: BoxShape.circle),
              child:
                  iconWidget ?? Icon(icon, color: WelcomePage._plum, size: 22),
            ),
            Expanded(
                child: Text(label,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800))),
            const SizedBox(width: 42),
          ],
        ),
      ),
    );
  }
}

class _GoogleMark extends StatelessWidget {
  const _GoogleMark();
  @override
  Widget build(BuildContext context) => const Icon(
        HugeIcons.strokeRoundedGoogle,
        color: Color(0xFF4285F4),
        size: 24,
      );
}

class _OrbitIllustration extends StatelessWidget {
  const _OrbitIllustration();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = constraints.maxWidth.clamp(280.0, 360.0).toDouble();
        final center = size / 2;
        return Center(
          child: SizedBox(
            width: size,
            height: size,
            child: Stack(
              alignment: Alignment.center,
              clipBehavior: Clip.none,
              children: [
                Container(
                    width: size * .94,
                    height: size * .94,
                    decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: const Color(0xFFF8F4F8), width: 2))),
                Container(
                    width: size * .68,
                    height: size * .68,
                    decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFFF9E6F5),
                        border: Border.all(
                            color: const Color(0xFFFBEFF9), width: 22))),
                _avatar(center - 36, center - 36, 72,
                    'assets/images/onboarding/avatar_light_woman.png'),
                _avatar(center - 19, 20, 38,
                    'assets/images/onboarding/avatar_black_man_1.png'),
                _avatar(26, center + 34, 44,
                    'assets/images/onboarding/avatar_black_woman_1.png'),
                _avatar(size - 70, center + 28, 44,
                    'assets/images/onboarding/avatar_light_man.png'),
                _avatar(center + 4, size - 52, 48,
                    'assets/images/onboarding/avatar_black_man_2.png'),
                _avatar(center + 58, center + 16, 32,
                    'assets/images/onboarding/avatar_black_woman_2.png'),
                const Positioned(
                    top: 18,
                    right: 36,
                    child: Icon(HugeIcons.strokeRoundedLocation01,
                        color: Color(0xFFD45CC2), size: 31)),
                const Positioned(
                    left: 54,
                    bottom: 54,
                    child: Icon(HugeIcons.strokeRoundedMessage01,
                        color: Color(0xFFD45CC2), size: 31)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _avatar(double left, double top, double diameter, String asset) {
    return Positioned(
      left: left,
      top: top,
      child: Container(
        width: diameter,
        height: diameter,
        alignment: Alignment.center,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
        ),
        child: Image.asset(asset,
            fit: BoxFit.cover, width: diameter, height: diameter),
      ),
    );
  }
}
