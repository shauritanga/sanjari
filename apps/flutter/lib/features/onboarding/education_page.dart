import 'package:flutter/material.dart';

import 'onboarding_options.dart';
import 'single_select_list_page.dart';

/// Education level: saves `educationLevel`.
class EducationPage extends StatelessWidget {
  const EducationPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const SingleSelectListPage(
      stepKey: 'education',
      title: "What's your education level?",
      field: 'educationLevel',
      options: educationOptions,
      nextKey: 'contacts-block',
    );
  }
}
