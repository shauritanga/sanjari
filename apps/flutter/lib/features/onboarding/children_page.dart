import 'package:flutter/material.dart';

import 'onboarding_options.dart';
import 'single_select_list_page.dart';

/// Children status: saves `childrenPreference`.
class ChildrenPage extends StatelessWidget {
  const ChildrenPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const SingleSelectListPage(
      stepKey: 'children',
      title: 'Do you have children?',
      field: 'childrenPreference',
      options: childrenOptions,
      nextKey: 'interests',
    );
  }
}
