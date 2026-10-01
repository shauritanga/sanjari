/// Pure step arithmetic behind [Stepper]. Port of the adjust() closure in
/// Stepper.tsx, kept in pure Dart so clamping stays unit-testable with
/// `dart test`.
int stepperNext(int value, int delta,
    {required int min, required int max, int step = 1}) {
  final next = value + delta * step;
  if (next < min) return min;
  if (next > max) return max;
  return next;
}
