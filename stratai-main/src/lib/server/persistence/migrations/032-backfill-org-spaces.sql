-- Migration 032: Backfill Organization Spaces
-- Phase 4 of Space Memberships implementation
--
-- Creates organization spaces for existing organizations that don't have one,
-- adds all org members to those spaces, and creates General areas.

-- Create org spaces for existing organizations that don't have one
DO $$
DECLARE
    org RECORD;
    member RECORD;
    v_space_id VARCHAR(50);
    v_membership_id VARCHAR(50);
    v_area_id VARCHAR(100);
    v_area_membership_id VARCHAR(50);
    v_ts_part BIGINT;
    v_first_admin_id UUID;
BEGIN
    -- Get current timestamp once for consistent IDs
    v_ts_part := EXTRACT(EPOCH FROM NOW())::BIGINT;

    FOR org IN
        SELECT o.id, o.name, o.slug
        FROM organizations o
        WHERE o.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM spaces s
            WHERE s.organization_id = o.id
              AND s.space_type = 'organization'
              AND s.deleted_at IS NULL
          )
    LOOP
        -- Find first admin/owner to use as space user_id
        SELECT om.user_id INTO v_first_admin_id
        FROM org_memberships om
        WHERE om.organization_id = org.id
          AND om.role IN ('owner', 'admin')
        ORDER BY om.created_at ASC
        LIMIT 1;

        -- If no admin found, use first member
        IF v_first_admin_id IS NULL THEN
            SELECT om.user_id INTO v_first_admin_id
            FROM org_memberships om
            WHERE om.organization_id = org.id
            ORDER BY om.created_at ASC
            LIMIT 1;
        END IF;

        -- Skip if no members at all
        IF v_first_admin_id IS NULL THEN
            RAISE NOTICE 'Skipping org % - no members found', org.name;
            CONTINUE;
        END IF;

        -- Generate space ID (use different suffix for each to ensure uniqueness)
        v_space_id := 'sp_' || v_ts_part || '_' || substr(md5(org.id::text), 1, 7);

        -- Create the org space
        INSERT INTO spaces (
            id, user_id, name, type, slug, space_type, organization_id,
            color, icon, order_index, created_at, updated_at
        ) VALUES (
            v_space_id,
            v_first_admin_id,
            org.name,
            'custom',
            org.slug || '-org',
            'organization',
            org.id,
            '#6366f1',
            'building',
            0,
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Created org space % for org % (owner: %)', v_space_id, org.name, v_first_admin_id;

        -- Add all org members to the space
        FOR member IN
            SELECT om.user_id, om.role
            FROM org_memberships om
            WHERE om.organization_id = org.id
        LOOP
            -- Generate membership ID
            v_membership_id := 'sm_' || v_ts_part || '_' || substr(md5(member.user_id::text || org.id::text), 1, 7);

            INSERT INTO space_memberships (id, space_id, user_id, role, created_at, updated_at)
            VALUES (
                v_membership_id,
                v_space_id,
                member.user_id,
                CASE
                    WHEN member.role IN ('owner', 'admin') THEN 'admin'
                    ELSE 'member'
                END,
                NOW(),
                NOW()
            )
            ON CONFLICT (space_id, user_id) WHERE user_id IS NOT NULL
            DO NOTHING;

            RAISE NOTICE 'Added user % to org space % with role %', member.user_id, v_space_id, member.role;
        END LOOP;

        -- Create General area for the org space
        -- ID format matches areas-postgres.ts createGeneral: spaceId-userId-general
        v_area_id := v_space_id || '-' || v_first_admin_id || '-general';

        INSERT INTO areas (
            id, space_id, user_id, name, slug, is_general,
            context, context_document_ids, color, icon,
            order_index, is_restricted, created_by,
            created_at, updated_at
        ) VALUES (
            v_area_id,
            v_space_id,
            v_first_admin_id,
            'General',
            'general',
            TRUE,
            NULL,
            NULL,
            NULL,
            NULL,
            0,
            FALSE,
            v_first_admin_id::text,
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Created General area % for org space %', v_area_id, v_space_id;

        -- Add owner membership to General area
        v_area_membership_id := 'am_' || v_ts_part || '_' || substr(md5(v_area_id || v_first_admin_id::text), 1, 7);

        INSERT INTO area_memberships (id, area_id, user_id, role, created_at)
        VALUES (
            v_area_membership_id,
            v_area_id,
            v_first_admin_id::text,
            'owner',
            NOW()
        )
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Added owner membership for General area %', v_area_id;

    END LOOP;
END $$;

-- Verify the backfill
DO $$
DECLARE
    v_orgs_without_space INTEGER;
    v_members_not_in_space INTEGER;
    v_spaces_without_general INTEGER;
BEGIN
    -- Count orgs without spaces
    SELECT COUNT(*) INTO v_orgs_without_space
    FROM organizations o
    WHERE o.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM spaces s
        WHERE s.organization_id = o.id
          AND s.space_type = 'organization'
          AND s.deleted_at IS NULL
      );

    -- Count members not in their org space
    SELECT COUNT(*) INTO v_members_not_in_space
    FROM org_memberships om
    JOIN spaces s ON s.organization_id = om.organization_id
        AND s.space_type = 'organization'
        AND s.deleted_at IS NULL
    WHERE NOT EXISTS (
        SELECT 1 FROM space_memberships sm
        WHERE sm.space_id = s.id
          AND sm.user_id = om.user_id
    );

    -- Count org spaces without General area
    SELECT COUNT(*) INTO v_spaces_without_general
    FROM spaces s
    WHERE s.space_type = 'organization'
      AND s.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM areas a
        WHERE a.space_id = s.id
          AND a.is_general = TRUE
          AND a.deleted_at IS NULL
      );

    RAISE NOTICE 'Verification: % orgs without space, % members not in space, % spaces without General',
        v_orgs_without_space, v_members_not_in_space, v_spaces_without_general;

    IF v_orgs_without_space > 0 OR v_members_not_in_space > 0 OR v_spaces_without_general > 0 THEN
        RAISE WARNING 'Backfill incomplete! Manual intervention may be required.';
    ELSE
        RAISE NOTICE 'Backfill complete! All orgs have spaces with General areas and all members are synced.';
    END IF;
END $$;
