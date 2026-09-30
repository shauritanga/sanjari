import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/settings/settings_models.dart';
import 'package:sanjari/features/settings/settings_repository.dart';

import 'mock_api.dart';

void main() {
  group('settings models', () {
    test('sessions fall back to an unknown label', () {
      const named = UserSession(id: 's1', deviceId: 'Pixel 8');
      const anonymous = UserSession(id: 's2');

      expect(named.deviceLabel('Unknown device'), 'Pixel 8');
      expect(anonymous.deviceLabel('Unknown device'), 'Unknown device');
      expect(
        const UserSession(id: 's3', deviceId: '  ').deviceLabel('X'),
        'X',
      );
    });

    test('visibility parsing treats non-liked_only as everyone', () {
      expect(visibilityModeFrom('liked_only'), VisibilityMode.likedOnly);
      expect(visibilityModeFrom('everyone'), VisibilityMode.everyone);
      expect(visibilityModeFrom('hidden'), VisibilityMode.everyone);
      expect(visibilityModeFrom(null), VisibilityMode.everyone);
      expect(VisibilityMode.likedOnly.value, 'liked_only');
      expect(VisibilityMode.everyone.value, 'everyone');
    });

    test('category keys cover known categories, pass the rest through', () {
      expect(categoryKey('matches'), 'notifMatches');
      expect(categoryKey('messages'), 'notifMessages');
      expect(categoryKey('likes'), 'notifLikes');
      expect(categoryKey('promotions'), 'notifPromotions');
      expect(categoryKey('mystery'), 'mystery');
    });
  });

  group('SettingsRepository', () {
    test('loads sessions, preferences, and visibility mode', () async {
      final seen = <RequestOptions>[];
      final repo = SettingsRepository(
        mockApi(
          (options) {
            if (options.path.endsWith('/auth/sessions')) {
              return {
                'data': [
                  {'id': 's1', 'deviceId': 'Pixel 8'},
                ],
              };
            }
            if (options.path.endsWith('/notifications/preferences')) {
              return {
                'data': [
                  {'category': 'matches', 'push': true},
                ],
              };
            }
            if (options.path.endsWith('/onboarding/visibility-mode')) {
              return {
                'data': {'mode': 'liked_only'},
              };
            }
            return {'data': null};
          },
          seen: seen,
        ),
      );

      final sessions = await repo.fetchSessions();
      expect(sessions.single.deviceId, 'Pixel 8');

      final preferences = await repo.fetchPreferences();
      expect(preferences.single.push, isTrue);

      expect(
        await repo.fetchVisibilityMode(),
        VisibilityMode.likedOnly,
      );
    });

    test('mutations hit the expected endpoints and bodies', () async {
      final seen = <RequestOptions>[];
      final repo = SettingsRepository(
        mockApi((_) => {'data': null}, seen: seen),
      );

      await repo.revokeSession('s1');
      await repo.setPush('matches', false);
      await repo.setVisibilityMode(VisibilityMode.everyone);

      final calls = seen.map((r) => '${r.method} ${r.path}').toList();
      expect(calls, contains('DELETE /auth/sessions/s1'));
      expect(calls, contains('POST /notifications/preferences'));
      expect(calls, contains('PUT /onboarding/visibility-mode'));
      expect(
        (seen[1].data as Map)['category'],
        'matches',
      );
      expect(
        (seen[2].data as Map)['mode'],
        'everyone',
      );
    });

    test('share links surface the token, or throw without one', () async {
      final good = SettingsRepository(
        mockApi((_) => {'data': {'token': 'abc123'}}),
      );
      expect(await good.createShareLink(), 'abc123');

      final bad = SettingsRepository(mockApi((_) => {'data': null}));
      expect(
        bad.createShareLink(),
        throwsA(isA<Exception>()),
      );
    });
  });
}
