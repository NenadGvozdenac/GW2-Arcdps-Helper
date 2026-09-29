-- Logs uploaded before these encounters were in the catalogue were classified as "other"; re-apply by trigger ID.
UPDATE "logs" SET "encounter_key" = 'kela', "group_id" = 'voe', "category" = 'raid' WHERE "trigger_id" = 27124;--> statement-breakpoint
UPDATE "logs" SET "encounter_key" = 'vloxx', "group_id" = 'voe', "category" = 'raid' WHERE "trigger_id" = 28106;--> statement-breakpoint
UPDATE "logs" SET "encounter_key" = 'whisp', "group_id" = 'kinfall', "category" = 'fractal' WHERE "trigger_id" = 27010;--> statement-breakpoint
UPDATE "logs" SET "encounter_key" = 'tyrant', "group_id" = 'solitarythrone', "category" = 'fractal' WHERE "trigger_id" = 28051;
