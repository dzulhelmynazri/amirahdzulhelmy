CREATE TABLE "activity_alert" (
	"category" text NOT NULL,
	"country_code" text NOT NULL,
	"destination" text NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"severity" text NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activity_alert_detectedAt_idx" ON "activity_alert" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "activity_alert_destination_idx" ON "activity_alert" USING btree ("destination");