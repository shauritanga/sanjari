import 'package:flutter/material.dart';

/// Searchable option for [SearchableSelect].
class SearchSelectOption {
  const SearchSelectOption({
    required this.value,
    required this.label,
    this.description,
  });

  final String value;
  final String label;
  final String? description;
}

/// Full-screen search-and-pick sheet. Port of SearchableSelect.tsx: the
/// query filters by label substring, tapping a row selects and closes.
class SearchableSelect extends StatefulWidget {
  const SearchableSelect({
    super.key,
    required this.title,
    this.placeholder = 'Search…',
    required this.options,
    required this.selectedValue,
    required this.onSelect,
    this.emptyLabel = 'No matches found.',
  });

  final String title;
  final String placeholder;
  final List<SearchSelectOption> options;
  final String? selectedValue;
  final ValueChanged<String> onSelect;
  final String emptyLabel;

  static Future<void> show(
    BuildContext context, {
    required String title,
    String placeholder = 'Search…',
    required List<SearchSelectOption> options,
    required String? selectedValue,
    required ValueChanged<String> onSelect,
    String emptyLabel = 'No matches found.',
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
        builder: (context, scrollController) => SearchableSelect(
          title: title,
          placeholder: placeholder,
          options: options,
          selectedValue: selectedValue,
          onSelect: onSelect,
          emptyLabel: emptyLabel,
        ),
      ),
    );
  }

  @override
  State<SearchableSelect> createState() => _SearchableSelectState();
}

class _SearchableSelectState extends State<SearchableSelect> {
  final _query = TextEditingController();

  @override
  void initState() {
    super.initState();
    _query.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final normalized = _query.text.trim().toLowerCase();
    final filtered = normalized.isEmpty
        ? widget.options
        : widget.options
            .where(
              (option) => option.label.toLowerCase().contains(normalized),
            )
            .toList();
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => Navigator.of(context).pop(),
                ),
                Expanded(
                  child: Text(
                    widget.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _query,
              autofocus: true,
              autocorrect: false,
              decoration: InputDecoration(
                hintText: widget.placeholder,
                prefixIcon: const Icon(Icons.search_outlined, size: 18),
                suffixIcon: _query.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.cancel_outlined, size: 16),
                        onPressed: _query.clear,
                      ),
                border: const OutlineInputBorder(),
              ),
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Text(
                      widget.emptyLabel,
                      style: TextStyle(color: scheme.onSurfaceVariant),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final option = filtered[index];
                      final active = option.value == widget.selectedValue;
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(option.label),
                        subtitle: option.description == null
                            ? null
                            : Text(option.description!),
                        trailing: active
                            ? Icon(
                                Icons.check_circle,
                                color: scheme.primary,
                                size: 20,
                              )
                            : null,
                        onTap: () {
                          Navigator.of(context).pop();
                          widget.onSelect(option.value);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
