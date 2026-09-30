import 'package:dio/dio.dart';
import 'package:test/test.dart';
import 'package:sanjari/features/premium/premium_models.dart';
import 'package:sanjari/features/premium/premium_repository.dart';

import 'mock_api.dart';

void main() {
  group('premium models', () {
    test('plan prices render as major units with currency', () {
      const plan = PremiumPlan(
        id: 'p1',
        code: 'plus',
        title: 'Plus',
        description: 'More likes',
        priceCents: 999,
        currency: 'USD',
      );

      expect(plan.priceLabel(), '9.99 USD');
    });

    test('status filters enabled entitlements and formats end dates', () {
      final status = PremiumStatus.fromJson({
        'status': 'active',
        'plan': {'code': 'plus', 'title': 'Plus'},
        'endsAt': '2026-12-01T00:00:00.000Z',
        'entitlements': {'undo': true, 'boost': false},
      });

      expect(status.enabledEntitlements, ['undo']);
      expect(status.endsLabel(), contains('2026'));
      expect(
        PremiumStatus.fromJson(null).enabledEntitlements,
        isEmpty,
      );
      expect(
        const PremiumStatus(status: 'free').endsLabel(),
        isNull,
      );
    });
  });

  group('PremiumRepository', () {
    test('fetches plans and status from the subscriptions endpoints',
        () async {
      final seen = <RequestOptions>[];
      final repo = PremiumRepository(
        mockApi(
          (options) {
            if (options.path.endsWith('/subscriptions/plans')) {
              return {
                'data': [
                  {
                    'id': 'p1',
                    'code': 'plus',
                    'title': 'Plus',
                    'description': 'More likes',
                    'priceCents': 999,
                    'currency': 'USD',
                  },
                ],
              };
            }
            return {
              'data': {
                'status': 'active',
                'plan': {'code': 'plus', 'title': 'Plus'},
                'endsAt': null,
                'entitlements': {'undo': true},
              },
            };
          },
          seen: seen,
        ),
      );

      final plans = await repo.fetchPlans();
      expect(plans.single.priceLabel(), '9.99 USD');

      final status = await repo.fetchStatus();
      expect(status?.status, 'active');
      expect(status?.enabledEntitlements, ['undo']);

      expect(
        seen.map((r) => r.path),
        containsAll([
          contains('/subscriptions/plans'),
          contains('/subscriptions/status'),
        ]),
      );
    });
  });
}
