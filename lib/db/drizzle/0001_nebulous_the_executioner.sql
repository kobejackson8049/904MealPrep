CREATE TABLE "meal_prep_gallery_media" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"media_type" text NOT NULL,
	"media_path" text NOT NULL,
	"poster_path" text DEFAULT '' NOT NULL,
	"linked_meal_id" text,
	"category" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_prep_gallery_media" ADD CONSTRAINT "meal_prep_gallery_media_linked_meal_id_meal_prep_meals_id_fk" FOREIGN KEY ("linked_meal_id") REFERENCES "public"."meal_prep_meals"("id") ON DELETE set null ON UPDATE no action;