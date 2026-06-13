CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.produits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prix_unitaire NUMERIC NOT NULL DEFAULT 0,
  categorie TEXT NOT NULL DEFAULT 'Divers',
  unite TEXT,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX produits_user_idx ON public.produits(user_id);
CREATE INDEX produits_nom_trgm ON public.produits USING gin (lower(nom) gin_trgm_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produits TO authenticated;
GRANT ALL ON public.produits TO service_role;

ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin manage produits"
  ON public.produits FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER produits_updated_at BEFORE UPDATE ON public.produits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();