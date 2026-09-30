import 'package:test/test.dart';
import 'package:sanjari/core/age.dart';

void main() {
  group('calculateAgeOn', () {
    test('counts a full year once the birthday has passed this year', () {
      expect(
        calculateAgeOn(DateTime(2000, 1, 1), DateTime(2026, 6, 15)),
        26,
      );
    });

    test('has not yet incremented before the birthday this year', () {
      expect(
        calculateAgeOn(DateTime(2000, 12, 31), DateTime(2026, 6, 15)),
        25,
      );
    });

    test('turns exactly minimumAge on the birthday itself', () {
      expect(
        calculateAgeOn(DateTime(2008, 6, 15), DateTime(2026, 6, 15)),
        minimumAge,
      );
    });
  });
}
