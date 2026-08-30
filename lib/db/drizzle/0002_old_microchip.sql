ALTER TABLE "meal_prep_business_settings" ADD COLUMN "apple_pay_handle" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_prep_business_settings" ADD COLUMN "apple_pay_qr_path" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_prep_business_settings" ADD COLUMN "apple_pay_enabled" boolean DEFAULT true NOT NULL;