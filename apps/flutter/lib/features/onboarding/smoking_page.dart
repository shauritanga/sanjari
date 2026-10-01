import 'package:flutter/material.dart';

import 'onboarding_options.dart';
import 'single_select_list_page.dart';

/// Smoking habits: saves `smokingPreference`.
class SmokingPage extends StatelessWidget {
  const SmokingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const SingleSelectListPage(
      stepKey: 'smoking',
      title: 'Do you smoke?',
      field: 'smokingPreference',
      options: smokingOptions,
      nextKey: 'drinking',
    );
  }
}
