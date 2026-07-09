
DROP TRIGGER IF EXISTS operations_stock_adjust ON public.operations;
DROP FUNCTION IF EXISTS public.adjust_stock_on_operation();

CREATE SCHEMA IF NOT EXISTS private_utils;

CREATE OR REPLACE FUNCTION private_utils.adjust_stock_on_operation()
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
      UPDATE public.produits SET stock_actuel = stock_actuel + delta
        WHERE id = NEW.produit_id AND stock_actif = true;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.produit_id IS NOT NULL AND OLD.quantite IS NOT NULL THEN
      old_delta := CASE WHEN OLD.type = 'entree' THEN OLD.quantite ELSE -OLD.quantite END;
      UPDATE public.produits SET stock_actuel = stock_actuel - old_delta
        WHERE id = OLD.produit_id AND stock_actif = true;
    END IF;
    IF NEW.produit_id IS NOT NULL AND NEW.quantite IS NOT NULL THEN
      delta := CASE WHEN NEW.type = 'entree' THEN NEW.quantite ELSE -NEW.quantite END;
      UPDATE public.produits SET stock_actuel = stock_actuel + delta
        WHERE id = NEW.produit_id AND stock_actif = true;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.produit_id IS NOT NULL AND OLD.quantite IS NOT NULL THEN
      old_delta := CASE WHEN OLD.type = 'entree' THEN OLD.quantite ELSE -OLD.quantite END;
      UPDATE public.produits SET stock_actuel = stock_actuel - old_delta
        WHERE id = OLD.produit_id AND stock_actif = true;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private_utils.adjust_stock_on_operation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER operations_stock_adjust
  AFTER INSERT OR UPDATE OR DELETE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION private_utils.adjust_stock_on_operation();
