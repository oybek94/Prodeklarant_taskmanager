-- CSV fayldan task va stage assignment import qilish
-- Bu scriptni database'da bajarishdan oldin backup oling!

BEGIN;

-- Avval user'larni name bo'yicha topamiz
DO $$
DECLARE
    v_user_id INTEGER;
    v_task_id INTEGER;
    v_stage_id INTEGER;
    v_client_id INTEGER;
    v_branch_id INTEGER;
BEGIN

    -- Task: 18 АВТО 40397HCA Тошкент (ID: d2bb4fc7)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998996019774', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '18 АВТО 40397HCA Тошкент' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 19 АВТО 10S208NB (ID: b88ba17e)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998900344249', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '19 АВТО 10S208NB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 21 АВТО 10513DCA - Тошкент (ID: 7c254c3b)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998998390001', 180) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '21 АВТО 10513DCA - Тошкент' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 22 АВТО 40T944UA (ID: 3fecf74b)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998939443517', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '22 АВТО 40T944UA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 20 АВТО 40M996OB (ID: bc57b036)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998907784096', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '20 АВТО 40M996OB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 16 АВТО 40P001CA - Тошкент (ID: 6f78288f)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998930954452', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '16 АВТО 40P001CA - Тошкент' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 23 АВТО 40707YAA (ID: 087eeacb)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998939465787', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '23 АВТО 40707YAA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 24 АВТО 40M900DA (ID: c277e40d)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998993142734', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '24 АВТО 40M900DA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 25 АВТО 10F913DB (ID: 3ad54f56)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998XXXXXXXXX', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '25 АВТО 10F913DB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 26 АВТО 40396XBA (ID: fb6f6131)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998945947353', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '26 АВТО 40396XBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Processed 10 tasks

    -- Task: 27 АВТО 40231RBA (ID: 8d9ebb11)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998933161130', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '27 АВТО 40231RBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 7 АВТО 40304HCA (ID: a4e0fccd)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998998562091', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '7 АВТО 40304HCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 8 АВТО 40492WBA (ID: 0218dda6)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998507701020', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '8 АВТО 40492WBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 28 АВТО 30E499MA (ID: 16e27ba8)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998881509009', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '28 АВТО 30E499MA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 9 АВТО 40734MCA (ID: 79837068)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998992747800', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '9 АВТО 40734MCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 29 АВТО  40683XBA - Тошкент (ID: 9f4c3cce)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998905854595', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '29 АВТО  40683XBA - Тошкент' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 10 АВТО 40318HCA (ID: 5d3ab7fe)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998950944292', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '10 АВТО 40318HCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 08 АВТО 40094GCA (ID: c2c1b9b1)
    -- Client: Abror aka, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abror aka';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abror aka', '+998901663012', 250) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '08 АВТО 40094GCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 11 АВТО 40593GCA (ID: e538db38)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998905857900', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '11 АВТО 40593GCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 12 АВТО 40148WBA (ID: 0fc623e0)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998994989018', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '12 АВТО 40148WBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Processed 20 tasks

    -- Task: 6 АВТО 40695XBA (ID: 3a985004)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998990115877', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '6 АВТО 40695XBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 30 АВТО  10516DCA (ID: 3721a394)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998XXXXXXXXX', 180) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '30 АВТО  10516DCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 31 АВТО  40M130BB (ID: 7a0197c7)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998998380924', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '31 АВТО  40M130BB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 32 АВТО 40A921DB (ID: 6b438cde)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998902741093', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '32 АВТО 40A921DB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 33 АВТО 40808QBA (ID: cd51ed61)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998972050038', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '33 АВТО 40808QBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: DZA-13 АВТО 40545UBA (ID: e9df3677)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998916800092', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = 'DZA-13 АВТО 40545UBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 34 АВТО 40F186AB (ID: 7f6dd275)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998911090223', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '34 АВТО 40F186AB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: DZ-35 40550UBA (ID: 9dc44441)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998991410396', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = 'DZ-35 40550UBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 14 АВТО 40H910AB (ID: 2c7eb86d)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998948426161', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '14 АВТО 40H910AB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 15 АВТО 40659FCA (ID: 30d89e25)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998996412327', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '15 АВТО 40659FCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Processed 30 tasks

    -- Task: 16 АВТО 40423ACA (ID: bb0de859)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998993240848', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '16 АВТО 40423ACA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 17 АВТО 40418YBA (ID: f4c29745)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998996340980', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '17 АВТО 40418YBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 18 АВТО 40558JCA (ID: ff2c8f70)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998911100109', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '18 АВТО 40558JCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 19 АВТО 40844PBA- Тошкент (ID: 9096abbf)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998903644447', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '19 АВТО 40844PBA- Тошкент' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 20 АВТО 40645XBA (ID: f9cb6d45)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998911247757', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '20 АВТО 40645XBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 21 АВТО 01013RMA (ID: 2183ae55)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998935720214', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '21 АВТО 01013RMA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 22 АВТО 40Y095HA (ID: 7afde956)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998930805245', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '22 АВТО 40Y095HA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 23 АВТО 40174GCA (ID: 997bdfbe)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998935340021', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '23 АВТО 40174GCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 24 АВТО 40525 PBA -Тошкент (ID: b2399da4)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998904959797', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '24 АВТО 40525 PBA -Тошкент' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 25 АВТО 40564YBA (ID: 28861c7e)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998943610088', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '25 АВТО 40564YBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Processed 40 tasks

    -- Task: 26 АВТО 40238PBA (ID: e28f4618)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998916697617', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '26 АВТО 40238PBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 27 АВТО 40337LBA (ID: f605aa92)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998904097001', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '27 АВТО 40337LBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 01 АВТО 40G826VA SKORLUPA (ID: 0ffae0c1)
    -- Client: Ahror aka, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Ahror aka';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Ahror aka', '+998338368699', 158) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '01 АВТО 40G826VA SKORLUPA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 28 АВТО 40268WBA (ID: 74cf5e29)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998934507715', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '28 АВТО 40268WBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 29 АВТО 40R418YA— Toshkent (ID: 069ca64e)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998911593999', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '29 АВТО 40R418YA— Toshkent' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 30 АВТО 30H410WA— Toshkent (ID: 3960e2c2)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998952324234', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '30 АВТО 30H410WA— Toshkent' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 31 АВТО 30488DBA— Toshkent (ID: 63471358)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998979141000', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '31 АВТО 30488DBA— Toshkent' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 32 АВТО 40527FCA — Toshkent (ID: 7ca00531)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998933577447', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '32 АВТО 40527FCA — Toshkent' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 33 АВТО 40358TBA (ID: 321de328)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998507542294', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '33 АВТО 40358TBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 34 АВТО 40149PBA (ID: deab5f20)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998995340705', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '34 АВТО 40149PBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Processed 50 tasks

    -- Task: 35 АВТО 40560YBA (ID: d0122844)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998905820019', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '35 АВТО 40560YBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 36 АВТО 40358ZBA (ID: b2dddd90)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998911105333', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '36 АВТО 40358ZBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 37 АВТО 40329WBA (ID: 77315fae)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998930578856', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '37 АВТО 40329WBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 38 АВТО 10X331QA (ID: a1ff9dd1)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998998390001', 180) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '38 АВТО 10X331QA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 39 АВТО 01445BMA (ID: 4384e2c6)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998958341585', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '39 АВТО 01445BMA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 40 АВТО 40697FCA (ID: 5efed395)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998930870336', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '40 АВТО 40697FCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 41 АВТО 60061TBA (ID: 8dc11904)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998XXXXXXXXX', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '41 АВТО 60061TBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 42 АВТО 40465PBA (ID: ae19727e)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998XXXXXXXXX', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '42 АВТО 40465PBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 43 АВТО 40136ZBA (ID: ebdd0afb)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998994928259', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '43 АВТО 40136ZBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 44 АВТО 40019PBA (ID: 95f7d5a5)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998935680023', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '44 АВТО 40019PBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Processed 60 tasks

    -- Task: 45 АВТО 40623FCA (ID: f376f890)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998941310406', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '45 АВТО 40623FCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 46 АВТО 40H718FB (ID: 7c2dd09a)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998946733620', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '46 АВТО 40H718FB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 47 АВТО 40620YBA (ID: 419b1e3c)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998942336641', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '47 АВТО 40620YBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 48 АВТО  50690YAA (ID: d060a4ee)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998939341828', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '48 АВТО  50690YAA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 49 АВТО  40W160YA (ID: 41ef679b)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998947230200', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '49 АВТО  40W160YA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 50 АВТО 40U582OB — Toshkent (ID: 9d316c58)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998930444949', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '50 АВТО 40U582OB — Toshkent' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 52 АВТО 40081ZBA (ID: e141464d)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998936784865', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '52 АВТО 40081ZBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 53 АВТО 40528WBA — Toshkent (ID: 6487a683)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998915253500', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '53 АВТО 40528WBA — Toshkent' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 51 АВТО 10Y056ZA — Toshkent (ID: cd1b0c3d)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998000000000', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '51 АВТО 10Y056ZA — Toshkent' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 54 АВТО 50646XBA (ID: dfdcca30)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998976616121', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '54 АВТО 50646XBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Processed 70 tasks

    -- Task: 55 АВТО 40420HCA (ID: 4c625375)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998905364264', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '55 АВТО 40420HCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 56 АВТО 40105JBA (ID: 225ad6a4)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998992098039', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '56 АВТО 40105JBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 57 АВТО 40Z532RB (ID: ce7ed3f9)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998883000696', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '57 АВТО 40Z532RB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 58 АВТО 40810FCA (ID: c53f3d07)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998XXXXXXXXX', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '58 АВТО 40810FCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 59 АВТО 01V902ZA (ID: 8a5fb30b)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998994732559', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '59 АВТО 01V902ZA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 60 АВТО 40609YBA (ID: 4ddd9c74)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '60 АВТО 40609YBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 62 АВТО 40182LCA (ID: 66a5b23b)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998991149887', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '62 АВТО 40182LCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 61 АВТО 40O342RA (ID: 1c2b918e)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998944060044', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '61 АВТО 40O342RA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 63 АВТО 40510JAA (ID: 811b61bd)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998936828188', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '63 АВТО 40510JAA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 64 АВТО 10516DCA — Toshkent (ID: 0fd8366d)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998XXXXXXXXX', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '64 АВТО 10516DCA — Toshkent' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Processed 80 tasks

    -- Task: 65 АВТО 40781YBA (ID: 95e69ef7)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998916598864', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '65 АВТО 40781YBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 36 АВТО 10513DCA (ID: 7fc2a0b3)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998339077778', 180) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '36 АВТО 10513DCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 37 АВТО  10V649QA- Тошкент (ID: 0ef8256b)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998942406070', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '37 АВТО  10V649QA- Тошкент' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 66 АВТО 50Y630NA (ID: cc4e66ff)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998995309794', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '66 АВТО 50Y630NA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 67 АВТО 40J055TA (ID: 871f4748)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998941074106', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '67 АВТО 40J055TA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 69 АВТО 40128WBA (ID: 0afc3bbd)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998933714211', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '69 АВТО 40128WBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 68 АВТО 015BCA (ID: 38a8b9e5)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998339077778', 180) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '68 АВТО 015BCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 70 АВТО 40E491PB (ID: f4fea3a0)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998990959000', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '70 АВТО 40E491PB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 71 АВТО 40846LCA (ID: 733a7c43)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998339077778', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '71 АВТО 40846LCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 72 АВТО 50004RAA (ID: 3f1d19ec)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998936475515', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '72 АВТО 50004RAA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Processed 90 tasks

    -- Task: 38 АВТО 40594FCA (ID: 10e584d8)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998936475515', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '38 АВТО 40594FCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 39 АВТО 40C944QA (ID: 8620bba9)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998902900108', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '39 АВТО 40C944QA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 40 АВТО 40M900DA (ID: 19858b31)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998950092815', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '40 АВТО 40M900DA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 41 АВТО 10Z991RA (ID: 8e5136de)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998998390001', 180) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '41 АВТО 10Z991RA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 73 АВТО 40A351DB (ID: 6d70fbbe)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998911086006', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '73 АВТО 40A351DB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 74 АВТО 40Z749YA (ID: 2245b0ea)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998911092423', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '74 АВТО 40Z749YA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 75 АВТО 40L018NB (ID: f8d58919)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998970400807', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '75 АВТО 40L018NB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 76 АВТО 50E307CB (ID: df7c6985)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998995122202', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '76 АВТО 50E307CB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 77 АВТО 40095LCA (ID: 11ff0ee6)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998339077778', 180) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '77 АВТО 40095LCA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Abdukamol
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Abdukamol' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 78 АВТО 40030TBA - Тошкент (ID: 698d07d6)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998940660940', 180) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '78 АВТО 40030TBA - Тошкент' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Processed 100 tasks

    -- Task: 43 АВТО  40155VBA- Тошкент (ID: 7ac769dc)
    -- Client: Abdurahmon, Branch: Toshkent

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Toshkent';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Toshkent') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998XXXXXXXXX', 180) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '43 АВТО  40155VBA- Тошкент' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Ahadbek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Ahadbek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Oybek
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Oybek' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: DZA-79 АВТО 40285WBA (ID: c2a5560f)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998971843500', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = 'DZA-79 АВТО 40285WBA' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

    -- Task: 82 АВТО 40M825QB (ID: 972a83fa)
    -- Client: Abdurahmon, Branch: Oltiariq

    SELECT id INTO v_branch_id FROM "Branch" WHERE name = 'Oltiariq';
    IF v_branch_id IS NULL THEN
        INSERT INTO "Branch" (name) VALUES ('Oltiariq') RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_client_id FROM "Client" WHERE name = 'Abdurahmon';
    IF v_client_id IS NULL THEN
        INSERT INTO "Client" (name, phone, "dealAmount") VALUES ('Abdurahmon', '+998911235030', 170) RETURNING id INTO v_client_id;
    END IF;

    SELECT id INTO v_task_id FROM "Task" WHERE title = '82 АВТО 40M825QB' AND "clientId" = v_client_id LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Stage: Invoys, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Invoys';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Zayavka, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Zayavka';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: TIR-SMR, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'TIR-SMR';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: ST, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'ST';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Fito, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Fito';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Deklaratsiya, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Deklaratsiya';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Tekshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Tekshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Topshirish, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Topshirish';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

        -- Stage: Pochta, Worker: Hakimjon
        SELECT id INTO v_user_id FROM "User" WHERE name = 'Hakimjon' LIMIT 1;
        IF v_user_id IS NOT NULL THEN
            SELECT id INTO v_stage_id FROM "TaskStage" WHERE "taskId" = v_task_id AND name = 'Pochta';
            IF v_stage_id IS NOT NULL THEN
                UPDATE "TaskStage" SET status = 'TAYYOR', "assignedToId" = v_user_id, "completedAt" = NOW() WHERE id = v_stage_id;
            END IF;
        END IF;

    END IF;

END $$;

COMMIT;