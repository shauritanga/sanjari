import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/devices.dart';
import '../../core/devices_impl.dart';
import '../../core/theme.dart';
import '../../widgets/app_button.dart';
import '../auth/session_provider.dart';
import 'contacts_block.dart';
import 'contacts_block_repository.dart';

final contactsBlockRepositoryProvider =
    Provider<ContactsBlockRepository>((ref) {
  return ContactsBlockRepository(ref.watch(sessionProvider).api);
});

final contactsReaderProvider = Provider<ContactsReader>((ref) {
  return FlutterContactsReader();
});

enum _ContactsStatus { idle, requesting, processing, done }

/// Privacy-preserving contacts block. Port of
/// apps/mobile/app/settings/contacts-block.tsx: reads address-book numbers
/// on device, sends only SHA-256 fingerprints to POST /contacts/block,
/// and reports how many contacts were scanned and members blocked.
class ContactsBlockPage extends ConsumerStatefulWidget {
  const ContactsBlockPage({super.key});

  @override
  ConsumerState<ContactsBlockPage> createState() => _ContactsBlockPageState();
}

class _ContactsBlockPageState extends ConsumerState<ContactsBlockPage> {
  _ContactsStatus _status = _ContactsStatus.idle;
  String _error = '';
  int _blockedCount = 0;
  int _scannedCount = 0;

  Future<void> _run() async {
    setState(() {
      _status = _ContactsStatus.requesting;
      _error = '';
    });
    try {
      final reader = ref.read(contactsReaderProvider);
      if (!await reader.ensureAccess()) {
        setState(() {
          _error =
              'Sanjari needs permission to read your contacts to use this feature.';
          _status = _ContactsStatus.idle;
        });
        return;
      }
      setState(() => _status = _ContactsStatus.processing);
      final numbers = await reader.fetchPhoneNumbers();
      final hashes = hashContactNumbers(numbers);
      if (!mounted) return;
      setState(() => _scannedCount = hashes.length);
      final blocked = await ref
          .read(contactsBlockRepositoryProvider)
          .blockByHashes(hashes);
      if (!mounted) return;
      setState(() {
        _blockedCount = blocked;
        _status = _ContactsStatus.done;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _status = _ContactsStatus.idle;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to check your contacts.';
        _status = _ContactsStatus.idle;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final busy = _status == _ContactsStatus.requesting ||
        _status == _ContactsStatus.processing;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Block my contacts',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(SanjariSpacing.lg),
        children: [
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(SanjariSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: scheme.surfaceContainerHighest,
                    ),
                    child: Icon(
                      Icons.contacts_outlined,
                      color: scheme.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Avoid matching people you know',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sanjari checks your contacts on this device against Sanjari members, using privacy-preserving matching — your contacts are never uploaded or stored, only one-way scrambled fingerprints are sent to find matches. Anyone found is automatically blocked from seeing or contacting you.',
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 13,
                      height: 18 / 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_error.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                _error,
                style: TextStyle(
                  color: scheme.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          if (_status == _ContactsStatus.done)
            Text(
              'Checked $_scannedCount contact${_scannedCount == 1 ? '' : 's'} — blocked $_blockedCount Sanjari member${_blockedCount == 1 ? '' : 's'}.',
              style: const TextStyle(fontWeight: FontWeight.w600),
            )
          else
            AppButton(
              label: 'Check my contacts',
              onPressed: busy ? null : _run,
              busy: busy,
            ),
        ],
      ),
    );
  }
}
