CREATE TABLE "Country" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "City" (
    "id" UUID NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Profile" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "Profile" ADD COLUMN "cityId" UUID;
CREATE UNIQUE INDEX "City_countryCode_name_key" ON "City"("countryCode", "name");
CREATE INDEX "City_countryCode_active_idx" ON "City"("countryCode", "active");
CREATE INDEX "Profile_cityId_idx" ON "Profile"("cityId");
ALTER TABLE "City" ADD CONSTRAINT "City_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
