import 'package:test/test.dart';
import 'package:sanjari/l10n/strings.dart';

void main() {
  test('English and Swahili taglines resolve', () {
    expect(
      tr(AppLocale.english, 'welcome'),
      'Meet someone who matches your path.',
    );
    expect(tr(AppLocale.swahili, 'welcome'), 'Kutana na anayelingana nawe.');
  });

  test('Unknown keys fall back to the key itself', () {
    expect(tr(AppLocale.english, 'no.such.key'), 'no.such.key');
  });
}
