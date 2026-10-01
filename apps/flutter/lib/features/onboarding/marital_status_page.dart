import 'package:flutter/material.dart';

import 'onboarding_options.dart';
import 'single_select_list_page.dart';

/// Marital status: saves `maritalStatus`.
class MaritalStatusPage extends StatelessWidget {
  const MaritalStatusPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const SingleSelectListPage(
      stepKey: 'marital-status',
      title: "What's your marital status?",
      field: 'maritalStatus',
      options: maritalStatusOptions,
      nextKey: 'smoking',
    );
  }
}
