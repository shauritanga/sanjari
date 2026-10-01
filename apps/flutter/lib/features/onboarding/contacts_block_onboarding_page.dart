import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../settings/contacts_block.dart' show hashContactNumbers;
import '../settings/contacts_block_page.dart'
    show contactsBlockRepositoryProvider, contactsReaderProvider;
import 'onboarding_controller.dart';
import 'onboarding_screen.dart';
import 'onboarding_steps.dart';

/// Onboarding-flavored contacts block prompt, reusing the same
/// privacy-preserving contacts logic as the settings screen
/// (ContactsBlockPage) with OnboardingScreen chrome instead of an AppBar.
class ContactsBlockOnboardingPage extends ConsumerStatefulWidget {
  const ContactsBlockOnboardingPage({super.key});

  @override
  ConsumerState<ContactsBlockOnboardingPage> createState() =>
      _ContactsBlockOnboardingPageState();
}

class _ContactsBlockOnboardingPageState
    extends ConsumerState<ContactsBlockOnboardingPage> {
  bool _busy = false;
  String? _error;

  Future<void> _advance() async {
    final controller = ref.read(onboardingControllerProvider);
    await controller.save(const {}, stepNumber('contacts-block'));
    if (!mounted) return;
    context.push(pathForStep('notifications'));
  }

  Future<void> _blockContacts() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final reader = ref.read(contactsReaderProvider);
      if (!await reader.ensureAccess()) {
        setState(() {
          _error =
              'Sanjari needs permission to read your contacts to use this feature.';
        });
        return;
      }
      final numbers = await reader.fetchPhoneNumbers();
      final hashes = hashContactNumbers(numbers);
      await ref.read(contactsBlockRepositoryProvider).blockByHashes(hashes);
      await _advance();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Unable to check your contacts.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return OnboardingScreen(
      step: stepNumber('contacts-block'),
      title: "Don't want family and friends to see you on Sanjari?",
      subtitle:
          'Hide your profile from people in your contact list. We\'ll block your contacts to stop you from seeing each other. You can unblock your contacts at anytime.',
      primaryLabel: 'Block contacts',
      primaryBusy: _busy,
      onPrimary: _blockContacts,
      secondaryLabel: 'Skip for now',
      onSecondary: _advance,
      child: Column(
        children: [
          const SizedBox(height: 24),
          Container(
            width: 96,
            height: 96,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: scheme.surfaceContainerHighest,
            ),
            child: const Icon(HugeIcons.strokeRoundedUserBlock02,
                color: SanjariColors.coral, size: 44),
          ),
          if (_error != null) ...[
            const SizedBox(height: 24),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.error),
            ),
          ],
        ],
      ),
    );
  }
}
