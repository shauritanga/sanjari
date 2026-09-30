import 'package:test/test.dart';
import 'package:sanjari/features/legal/legal_docs.dart';

void main() {
  group('legal documents', () {
    test('terms carry all seven sections with bodies', () {
      expect(termsSections, hasLength(7));
      for (final section in termsSections) {
        expect(section.title, isNotEmpty);
        expect(section.body, isNotEmpty);
      }
      expect(termsSections.first.title, '1. Who we are');
      expect(termsSections.last.title, '7. Contact');
    });

    test('privacy policy carries all seven sections with bodies', () {
      expect(privacySections, hasLength(7));
      for (final section in privacySections) {
        expect(section.title, isNotEmpty);
        expect(section.body, isNotEmpty);
      }
      expect(privacySections.first.title, '1. What we collect');
      expect(privacySections.last.title, '7. Contact');
    });

    test('both documents state the 18+ requirement and Safety Centre', () {
      final bodies = [
        ...termsSections.map((s) => s.body),
        ...privacySections.map((s) => s.body),
      ].join('\n');
      expect(bodies, contains('18 years old'));
      expect(bodies, contains('Safety Centre'));
    });
  });
}
