import 'package:flutter/material.dart';

import 'onboarding_options.dart';
import 'single_select_list_page.dart';

/// Drinking habits: saves `drinkingPreference`.
class DrinkingPage extends StatelessWidget {
  const DrinkingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const SingleSelectListPage(
      stepKey: 'drinking',
      title: 'Do you drink alcohol?',
      field: 'drinkingPreference',
      options: drinkingOptions,
      nextKey: 'children',
    );
  }
}
