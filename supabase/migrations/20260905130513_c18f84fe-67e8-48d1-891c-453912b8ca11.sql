-- 1) project_evaluations: require project ownership on insert
DROP POLICY IF EXISTS "Users can insert evaluations" ON public.project_evaluations;
CREATE POLICY "Users can insert evaluations"
ON public.project_evaluations FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_evaluations.project_id
        AND p.owner_id = auth.uid()
    )
  )
);

-- 2) Self-update policies: add WITH CHECK so ownership cannot be reassigned
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own progress" ON public.form_progress;
CREATE POLICY "Users can update their own progress"
ON public.form_progress FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own financial_records" ON public.mp_financial_records;
CREATE POLICY "Users can update own financial_records"
ON public.mp_financial_records FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own funder_connections" ON public.mp_funder_connections;
CREATE POLICY "Users can update own funder_connections"
ON public.mp_funder_connections FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own mp_projects" ON public.mp_projects;
CREATE POLICY "Users can update own mp_projects"
ON public.mp_projects FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE TO authenticated
USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users update own journeys" ON public.user_journeys;
CREATE POLICY "Users update own journeys"
ON public.user_journeys FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
