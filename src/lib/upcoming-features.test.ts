import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UPCOMING_FEATURES,
  FEATURE_CATEGORIES,
  type UpcomingFeature,
} from './upcoming-features';

test('Upcoming Features - Data & Model Unit Tests', async (t) => {
  await t.test('1. Vérifie le nombre exact et l’unicité des 8 fonctionnalités', () => {
    assert.equal(
      UPCOMING_FEATURES.length,
      8,
      'Le catalogue doit contenir exactement les 8 fonctionnalités cadrées pour post-novembre'
    );

    const ids = UPCOMING_FEATURES.map((f) => f.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, 'Tous les identifiants de fonctionnalités doivent être uniques');
  });

  await t.test('2. Vérifie la conformité de chaque modèle', () => {
    const validCategoryKeys = FEATURE_CATEGORIES.map((c) => c.key);

    for (const feature of UPCOMING_FEATURES) {
      assert.ok(feature.id && feature.id.length > 2, `ID valide requis pour ${feature.id}`);
      assert.ok(feature.title && feature.title.length > 3, `Titre requis pour ${feature.id}`);
      assert.ok(feature.description && feature.description.length > 10, `Description requise pour ${feature.id}`);
      assert.ok(feature.keyBenefit && feature.keyBenefit.length > 10, `Bénéfice clé requis pour ${feature.id}`);
      assert.ok(
        feature.formatOrDeliverable && feature.formatOrDeliverable.length > 3,
        `Livrable requis pour ${feature.id}`
      );
      assert.equal(
        feature.badge,
        'Bientôt disponible',
        `Le badge doit être 'Bientôt disponible' pour ${feature.id}`
      );
      assert.ok(
        validCategoryKeys.includes(feature.categoryKey),
        `La catégorie ${feature.categoryKey} doit être référencée dans FEATURE_CATEGORIES`
      );
      assert.ok(
        feature.iconName && feature.iconName.length > 2,
        `Nom d’icône requis pour ${feature.id}`
      );
    }
  });

  await t.test('3. Vérifie la complétude des catégories de filtrage', () => {
    assert.ok(FEATURE_CATEGORIES.length >= 7, 'Au moins 7 filtres de catégories doivent exister');
    assert.equal(FEATURE_CATEGORIES[0].key, 'all', 'Le premier filtre doit être "all"');
  });
});

