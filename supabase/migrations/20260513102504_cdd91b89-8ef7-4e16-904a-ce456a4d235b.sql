REVOKE ALL ON FUNCTION public.account_balance(uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.account_balance(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.account_balance(uuid, date) FROM authenticated;