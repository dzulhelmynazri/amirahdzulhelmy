CREATE TABLE "conversation" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"payload" jsonb,
	"principal_id" text,
	"session_id" text NOT NULL,
	"stream_index" text,
	"title" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_userId_idx" ON "conversation" USING btree ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversation_sessionId_idx" ON "conversation" USING btree ("session_id");