ALTER TABLE "PushToken" ADD COLUMN "token" TEXT;

-- Existing rows were registered before delivery tokens were retained. They
-- cannot be used for FCM delivery and are removed instead of keeping broken
-- registrations around.
DELETE FROM "PushToken" WHERE "token" IS NULL;

ALTER TABLE "PushToken" ALTER COLUMN "token" SET NOT NULL;
