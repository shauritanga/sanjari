import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../l10n/locale_controller.dart';
import '../../widgets/app_button.dart';
import '../auth/session_provider.dart';
import 'safety_controller.dart';

/// Icon mapping for guidance sections. Ports GUIDANCE_ICONS from safety.tsx.
IconData guidanceIconFor(String key) {
  switch (key) {
    case 'scams':
      return HugeIcons.strokeRoundedMoney01;
    case 'privacy':
      return HugeIcons.strokeRoundedViewOff;
    case 'meetings':
      return HugeIcons.strokeRoundedLocation01;
    case 'guidelines':
      return HugeIcons.strokeRoundedCheckmarkCircle01;
    case 'verification':
      return HugeIcons.strokeRoundedUserShield01;
    case 'emergency':
      return HugeIcons.strokeRoundedAlert02;
    case 'data':
      return HugeIcons.strokeRoundedFolderFileStorage;
    default:
      return HugeIcons.strokeRoundedAlert02;
  }
}

/// Safety Centre. Ports apps/mobile/app/safety.tsx: reminder card,
/// locale-aware guidance sections, data export, appeal submission for open
/// moderation cases, and the deactivate / delete account flows (deactivate
/// signs out afterwards, like Expo).
class SafetyPage extends ConsumerStatefulWidget {
  const SafetyPage({super.key});

  @override
  ConsumerState<SafetyPage> createState() => _SafetyPageState();
}

class _SafetyPageState extends ConsumerState<SafetyPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref
          .read(safetyControllerProvider)
          .load(ref.read(localeProvider).value.languageCode),
    );
    ref.listenManual(
      localeProvider,
      (previous, next) {
        if (previous?.value != next.value) {
          ref.read(safetyControllerProvider).load(next.value.languageCode);
        }
      },
    );
  }

  Future<void> _confirmDeactivate() async {
    final locale = ref.read(localeProvider).value;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tr(locale, 'deactivateTitle')),
        content: Text(tr(locale, 'deactivateCopy')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(tr(locale, 'cancel')),
          ),
          TextButton(
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(tr(locale, 'deactivateAction')),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final deactivated = await ref.read(safetyControllerProvider).deactivate();
    if (deactivated && mounted) {
      await ref.read(sessionProvider).logout();
    }
  }

  Future<void> _confirmDeletion() async {
    final locale = ref.read(localeProvider).value;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tr(locale, 'deleteTitle')),
        content: Text(
            '${tr(locale, 'deleteCopy')}\n\n${tr(locale, 'deleteCoolingOffCopy')}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(tr(locale, 'cancel')),
          ),
          TextButton(
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(tr(locale, 'deleteMyAccount')),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final controller = ref.read(safetyControllerProvider);
    final finalConfirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        final input = TextEditingController();
        return StatefulBuilder(
          builder: (context, setState) => AlertDialog(
            title: Text(tr(locale, 'confirmDeletionTitle')),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tr(locale, 'confirmDeletionCopy')),
                const SizedBox(height: 12),
                TextField(
                  controller: input,
                  autofocus: true,
                  textCapitalization: TextCapitalization.characters,
                  decoration:
                      InputDecoration(labelText: tr(locale, 'typeDelete')),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 8),
                Text(
                  tr(locale, 'deleteDataWarning'),
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: Text(tr(locale, 'cancel'))),
              FilledButton(
                onPressed: input.text.trim().toUpperCase() == 'DELETE'
                    ? () => Navigator.pop(context, true)
                    : null,
                style: FilledButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.error),
                child: Text(tr(locale, 'deleteMyAccount')),
              ),
            ],
          ),
        );
      },
    );
    if (finalConfirmed == true && mounted) await controller.requestDeletion();
  }

  String _deletionDate(DateTime? date) {
    if (date == null) return '';
    final local = date.toLocal();
    return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    final controller = ref.watch(safetyControllerProvider);
    final guidance = controller.guidance;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: tr(locale, 'back'),
          icon: const Icon(HugeIcons.strokeRoundedArrowLeft01),
          onPressed: () => context.pop(),
        ),
        title: Text(tr(locale, 'safetyTitle')),
      ),
      body: Builder(
        builder: (context) {
          if (controller.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          return ListView(
            padding: const EdgeInsets.all(SanjariSpacing.lg),
            children: [
              if (controller.error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: SanjariSpacing.sm),
                  child: Text(
                    tr(locale, controller.error!),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(SanjariSpacing.md),
                  child: Row(
                    children: [
                      Icon(
                        HugeIcons.strokeRoundedShield01,
                        color: Theme.of(context).colorScheme.secondary,
                      ),
                      const SizedBox(width: SanjariSpacing.sm),
                      Expanded(
                        child: Text(tr(locale, 'safetyReminder')),
                      ),
                    ],
                  ),
                ),
              ),
              if (guidance != null && guidance.sections.isNotEmpty) ...[
                const SizedBox(height: SanjariSpacing.md),
                _Section(
                  title: guidance.title,
                  children: [
                    for (final section in guidance.sections)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          guidanceIconFor(section.key),
                        ),
                        title: Text(section.title),
                        subtitle: Text(section.body),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: SanjariSpacing.md),
              _Section(
                title: tr(locale, 'yourData'),
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(HugeIcons.strokeRoundedDownload01),
                    title: Text(tr(locale, 'requestMyData')),
                    subtitle: Text(tr(locale, 'requestMyDataCopy')),
                  ),
                  AppButton(
                    label: tr(locale, 'requestMyData'),
                    busy: controller.exporting,
                    onPressed: controller.requestExport,
                  ),
                  if (controller.exportError != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        tr(locale, controller.exportError!),
                      ),
                    )
                  else if (controller.exportStatus != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        tr(locale, 'exportRequested').replaceAll(
                          '{status}',
                          controller.exportStatus!,
                        ),
                      ),
                    ),
                ],
              ),
              if (controller.appeals.isNotEmpty) ...[
                const SizedBox(height: SanjariSpacing.md),
                _Section(
                  title: tr(locale, 'appealDecision'),
                  children: [
                    for (final item in controller.appeals) ...[
                      Text(
                        tr(locale, 'appealMeta')
                            .replaceAll('{category}', item.report.category)
                            .replaceAll(
                              '{status}',
                              item.report.appealStatus ??
                                  tr(
                                    locale,
                                    'appealNotSubmitted',
                                  ),
                            ),
                      ),
                      if (item.canAppeal) ...[
                        const SizedBox(height: 4),
                        _StatementField(caseId: item.id),
                        const SizedBox(height: 4),
                        AppButton(
                          label: tr(locale, 'submitAppeal'),
                          onPressed: () => controller.submitAppeal(item.id),
                        ),
                      ],
                      const SizedBox(height: SanjariSpacing.sm),
                    ],
                  ],
                ),
              ],
              const SizedBox(height: SanjariSpacing.md),
              Text(
                tr(locale, 'accountGroup'),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.secondary,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: SanjariSpacing.sm),
              _DangerCard(
                icon: HugeIcons.strokeRoundedPause,
                iconColor: Theme.of(context).colorScheme.secondary,
                title: tr(locale, 'takeABreak'),
                body: tr(locale, 'takeABreakCopy'),
                actionLabel: tr(locale, 'deactivateAccount'),
                busy: controller.deactivating,
                onAction: _confirmDeactivate,
              ),
              const SizedBox(height: SanjariSpacing.sm),
              _DangerCard(
                icon: HugeIcons.strokeRoundedDelete01,
                iconColor: Theme.of(context).colorScheme.error,
                title: tr(locale, 'leaveForGood'),
                titleColor: Theme.of(context).colorScheme.error,
                body: tr(locale, 'leaveForGoodCopy'),
                actionLabel: tr(locale, 'deleteMyAccount'),
                busy: controller.deleting,
                onAction: _confirmDeletion,
              ),
              if (controller.pendingDeletion != null) ...[
                const SizedBox(height: 8),
                Card(
                  color: Theme.of(context).colorScheme.errorContainer,
                  child: Padding(
                    padding: const EdgeInsets.all(SanjariSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tr(locale, 'deletionPending').replaceAll(
                            '{date}',
                            _deletionDate(
                                controller.pendingDeletion!.executeAfter),
                          ),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(tr(locale, 'deletionPendingCopy')),
                        TextButton(
                          onPressed: controller.deleting
                              ? null
                              : controller.cancelDeletion,
                          child: Text(tr(locale, 'cancelDeletion')),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              if (controller.accountError != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    tr(locale, controller.accountError!),
                  ),
                )
              else if (controller.accountStatus != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    tr(locale, 'deletionScheduled').replaceAll(
                      '{status}',
                      controller.accountStatus!,
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(SanjariSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                color: Theme.of(context).colorScheme.secondary,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: SanjariSpacing.sm),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _DangerCard extends StatelessWidget {
  const _DangerCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    this.titleColor,
    required this.body,
    required this.actionLabel,
    required this.busy,
    required this.onAction,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final Color? titleColor;
  final String body;
  final String actionLabel;
  final bool busy;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(SanjariSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: iconColor, size: 18),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: titleColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(body),
            const SizedBox(height: SanjariSpacing.sm),
            AppButton(
              label: actionLabel,
              busy: busy,
              onPressed: onAction,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatementField extends ConsumerStatefulWidget {
  const _StatementField({required this.caseId});

  final String caseId;

  @override
  ConsumerState<_StatementField> createState() => _StatementFieldState();
}

class _StatementFieldState extends ConsumerState<_StatementField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(
      text: ref.read(safetyControllerProvider).statementFor(widget.caseId),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider).value;
    return TextField(
      controller: _controller,
      minLines: 2,
      maxLines: 4,
      onChanged: (value) =>
          ref.read(safetyControllerProvider).setStatement(widget.caseId, value),
      decoration: InputDecoration(
        labelText: tr(locale, 'yourStatement'),
        border: const OutlineInputBorder(),
      ),
    );
  }
}
