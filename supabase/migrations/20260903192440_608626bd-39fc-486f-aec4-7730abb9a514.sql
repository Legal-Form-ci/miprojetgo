-- 1. PROFILES: block self-escalation of admin/payment controlled columns
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service role / internal triggers (no JWT) and admins keep full control
  IF auth.uid() IS NULL OR public.is_any_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  NEW.is_verified := OLD.is_verified;
  NEW.account_status := OLD.account_status;
  NEW.total_commissions := OLD.total_commissions;
  NEW.total_referrals := OLD.total_referrals;
  NEW.export_unlocked_until := OLD.export_unlocked_until;
  NEW.user_type := OLD.user_type;
  NEW.suspended_at := OLD.suspended_at;
  NEW.suspended_reason := OLD.suspended_reason;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by_user_id := OLD.referred_by_user_id;
  NEW.referred_by_code := OLD.referred_by_code;
  NEW.unsubscribe_token := OLD.unsubscribe_token;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_sensitive_fields_trg ON public.profiles;
CREATE TRIGGER guard_profile_sensitive_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive_fields();

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_any_admin(auth.uid()))
WITH CHECK (public.is_any_admin(auth.uid()));

-- 2. PAYMENTS: no self-completion
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own pending payments"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND coalesce(status, 'pending') = 'pending'
  AND coalesce(amount, 0) >= 0
);

DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE TO authenticated
USING (public.is_any_admin(auth.uid()))
WITH CHECK (public.is_any_admin(auth.uid()));

-- 3. CONTRIBUTIONS: no fabricated completed amounts
DROP POLICY IF EXISTS "Users can insert contributions" ON public.contributions;
CREATE POLICY "Users can insert pending contributions"
ON public.contributions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND coalesce(status, 'pending') = 'pending'
  AND coalesce(amount, 0) >= 0
);

-- 4. REFERRALS: no self-assigned commissions
DROP POLICY IF EXISTS "Users can insert their own referrals" ON public.referrals;
CREATE POLICY "Users can insert their own pending referrals"
ON public.referrals FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = referrer_id
  AND coalesce(commission_amount, 0) = 0
  AND coalesce(status, 'pending') = 'pending'
  AND completed_at IS NULL
  AND paid_at IS NULL
);

-- 5. SERVICE REQUESTS: owner cannot tamper with status / admin_notes
CREATE OR REPLACE FUNCTION public.guard_service_request_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_any_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.admin_notes := OLD.admin_notes;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_service_request_admin_fields_trg ON public.service_requests;
CREATE TRIGGER guard_service_request_admin_fields_trg
BEFORE UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_service_request_admin_fields();

DROP POLICY IF EXISTS "Admins can update requests" ON public.service_requests;
CREATE POLICY "Admins can update any request"
ON public.service_requests FOR UPDATE TO authenticated
USING (public.is_any_admin(auth.uid()))
WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Users can update their own request details"
ON public.service_requests FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Admin-only SECURITY DEFINER helpers must not be client callable
REVOKE ALL ON FUNCTION public.mp_rls_test_report() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_agricapital_partition() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.mp_resync_scoring(uuid) FROM anon, authenticated;
