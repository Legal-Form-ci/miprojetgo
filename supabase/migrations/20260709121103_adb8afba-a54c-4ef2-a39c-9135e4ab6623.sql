
-- 1) Colonnes stock sur produits
ALTER TABLE public.produits
  ADD COLUMN IF NOT EXISTS stock_actuel numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seuil_alerte numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_actif boolean NOT NULL DEFAULT false;

-- 2) Lien produit + quantité sur operations
ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS produit_id uuid REFERENCES public.produits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantite numeric(14,2);

CREATE INDEX IF NOT EXISTS operations_produit_idx
  ON public.operations(produit_id) WHERE produit_id IS NOT NULL;

-- 3) Trigger de recalcul stock
CREATE OR REPLACE FUNCTION public.adjust_stock_on_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta numeric := 0;
  old_delta numeric := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.produit_id IS NOT NULL AND NEW.quantite IS NOT NULL THEN
      delta := CASE WHEN NEW.type = 'entree' THEN NEW.quantite ELSE -NEW.quantite END;
      UPDATE public.produits
        SET stock_actuel = stock_actuel + delta
        WHERE id = NEW.produit_id AND stock_actif = true;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.produit_id IS NOT NULL AND OLD.quantite IS NOT NULL THEN
      old_delta := CASE WHEN OLD.type = 'entree' THEN OLD.quantite ELSE -OLD.quantite END;
      UPDATE public.produits
        SET stock_actuel = stock_actuel - old_delta
        WHERE id = OLD.produit_id AND stock_actif = true;
    END IF;
    IF NEW.produit_id IS NOT NULL AND NEW.quantite IS NOT NULL THEN
      delta := CASE WHEN NEW.type = 'entree' THEN NEW.quantite ELSE -NEW.quantite END;
      UPDATE public.produits
        SET stock_actuel = stock_actuel + delta
        WHERE id = NEW.produit_id AND stock_actif = true;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.produit_id IS NOT NULL AND OLD.quantite IS NOT NULL THEN
      old_delta := CASE WHEN OLD.type = 'entree' THEN OLD.quantite ELSE -OLD.quantite END;
      UPDATE public.produits
        SET stock_actuel = stock_actuel - old_delta
        WHERE id = OLD.produit_id AND stock_actif = true;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS operations_stock_adjust ON public.operations;
CREATE TRIGGER operations_stock_adjust
  AFTER INSERT OR UPDATE OR DELETE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_operation();
