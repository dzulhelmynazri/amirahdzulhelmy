CREATE TABLE "traveller" (
	"birthday" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"document_expiry" text,
	"document_issue_place" text,
	"document_number" text,
	"email" text,
	"gender" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"nationality" text,
	"phone" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "traveller" ADD CONSTRAINT "traveller_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "traveller_userId_idx" ON "traveller" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "traveller_primary_idx" ON "traveller" USING btree ("user_id","is_primary");