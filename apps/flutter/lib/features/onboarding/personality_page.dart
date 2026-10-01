import 'package:flutter/material.dart';

import 'min_max_chips_page.dart';
import 'onboarding_options.dart';

/// Personality traits: at least 1, at most 5. Saves `personalityTraits`.
class PersonalityPage extends StatelessWidget {
  const PersonalityPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const MinMaxChipsPage(
      stepKey: 'personality',
      title: 'How would you describe your personality?',
      subtitle: 'Select up to 5 traits to show off your personality!',
      field: 'personalityTraits',
      options: personalityOptions,
      min: 1,
      max: 5,
      nextKey: 'bio',
      counterLabel: 'max 5',
    );
  }
}
