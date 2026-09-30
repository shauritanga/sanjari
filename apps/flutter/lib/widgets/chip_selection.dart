/// Pure selection rule behind [SelectableCard] and [ChipGroup]. Port of the
/// toggle() closure in ChipGroup.tsx, kept in pure Dart so the max-cap and
/// single-toggle rules stay unit-testable with `dart test`.
List<String> toggleChipSelection(
  List<String> selected,
  String value, {
  bool multiple = true,
  int? max,
}) {
  final isSelected = selected.contains(value);
  if (!multiple) return isSelected ? const [] : [value];
  if (isSelected) {
    return selected.where((item) => item != value).toList();
  }
  if (max != null && selected.length >= max) return selected;
  return [...selected, value];
}
