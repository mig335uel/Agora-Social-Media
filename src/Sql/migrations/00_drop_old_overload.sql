-- ============================================================================
-- FIX PGRST203: Eliminar la versión antigua de combine_feed_and_viral (5 params)
-- Ejecutar ANTES de las migraciones 00-03.
--
-- PostgREST no puede elegir entre la versión de 5 parámetros y la de 6
-- (con p_pool_size DEFAULT 150) porque cuando el cliente envía 5 argumentos,
-- ambas firmas son candidatas válidas.
-- ============================================================================

DROP FUNCTION IF EXISTS public.combine_feed_and_viral(integer, integer, double precision, uuid, double precision);
