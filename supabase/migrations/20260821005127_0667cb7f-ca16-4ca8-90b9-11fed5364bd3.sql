-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','administrativa','jefe_obra');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles_select_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Perfil automático al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- OBRAS
CREATE TABLE public.obras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  codigo text,
  estado text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','finalizada')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obras TO authenticated;
GRANT ALL ON public.obras TO service_role;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obras_select_auth" ON public.obras FOR SELECT TO authenticated USING (true);
CREATE POLICY "obras_admin_manage" ON public.obras FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.obras (nombre, codigo) VALUES
  ('Edificio Vertiente Norte','OB-001'),
  ('Torre Los Almendros','OB-002'),
  ('Condominio Alto Mirador','OB-003'),
  ('Edificio Costanera 1450','OB-004');

-- RENDICIONES
CREATE TABLE public.rendiciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text NOT NULL UNIQUE DEFAULT ('R-' || to_char(now(),'YYYYMMDDHH24MISSMS')),
  obra_id uuid NOT NULL REFERENCES public.obras(id),
  creado_por uuid NOT NULL REFERENCES auth.users(id),
  estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','enviada','aprobada','pagada')),
  total_rendicion bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rendiciones TO authenticated;
GRANT ALL ON public.rendiciones TO service_role;
ALTER TABLE public.rendiciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rend_select_auth" ON public.rendiciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "rend_insert_own" ON public.rendiciones FOR INSERT TO authenticated WITH CHECK (auth.uid() = creado_por);
CREATE POLICY "rend_update_own_or_admin" ON public.rendiciones FOR UPDATE TO authenticated
  USING (auth.uid() = creado_por OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = creado_por OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rend_delete_own_or_admin" ON public.rendiciones FOR DELETE TO authenticated
  USING ((auth.uid() = creado_por AND estado = 'borrador') OR public.has_role(auth.uid(),'admin'));

-- BOLETAS
CREATE TABLE public.boletas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rendicion_id uuid REFERENCES public.rendiciones(id) ON DELETE SET NULL,
  obra_id uuid NOT NULL REFERENCES public.obras(id),
  ingresado_por uuid NOT NULL REFERENCES auth.users(id),
  proveedor_rut text NOT NULL,
  proveedor_nombre text,
  fecha_emision date NOT NULL,
  monto_total bigint NOT NULL CHECK (monto_total > 0),
  glosa text NOT NULL CHECK (char_length(glosa) BETWEEN 5 AND 300),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  adjunto_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX boletas_obra_idx ON public.boletas(obra_id);
CREATE INDEX boletas_rendicion_idx ON public.boletas(rendicion_id);
CREATE INDEX boletas_fecha_idx ON public.boletas(fecha_emision);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boletas TO authenticated;
GRANT ALL ON public.boletas TO service_role;
ALTER TABLE public.boletas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boletas_select_auth" ON public.boletas FOR SELECT TO authenticated USING (true);
CREATE POLICY "boletas_insert_own" ON public.boletas FOR INSERT TO authenticated WITH CHECK (auth.uid() = ingresado_por);
CREATE POLICY "boletas_update_own_or_admin" ON public.boletas FOR UPDATE TO authenticated
  USING ((auth.uid() = ingresado_por AND estado = 'pendiente') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK ((auth.uid() = ingresado_por) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "boletas_delete_own_or_admin" ON public.boletas FOR DELETE TO authenticated
  USING ((auth.uid() = ingresado_por AND estado = 'pendiente' AND rendicion_id IS NULL) OR public.has_role(auth.uid(),'admin'));

-- No mezclar boletas de otra obra dentro de una rendición
CREATE OR REPLACE FUNCTION public.check_boleta_obra()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r_obra uuid;
BEGIN
  IF NEW.rendicion_id IS NOT NULL THEN
    SELECT obra_id INTO r_obra FROM public.rendiciones WHERE id = NEW.rendicion_id;
    IF r_obra IS DISTINCT FROM NEW.obra_id THEN
      RAISE EXCEPTION 'La boleta debe pertenecer a la misma obra de la rendición';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER boletas_check_obra BEFORE INSERT OR UPDATE ON public.boletas
  FOR EACH ROW EXECUTE FUNCTION public.check_boleta_obra();

-- Total de rendición siempre calculado
CREATE OR REPLACE FUNCTION public.recalc_total_rendicion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[];
BEGIN
  ids := ARRAY(SELECT DISTINCT x FROM unnest(ARRAY[OLD.rendicion_id, NEW.rendicion_id]) x WHERE x IS NOT NULL);
  UPDATE public.rendiciones r
     SET total_rendicion = COALESCE((SELECT SUM(b.monto_total) FROM public.boletas b WHERE b.rendicion_id = r.id),0)
   WHERE r.id = ANY(ids);
  RETURN NULL;
END; $$;
CREATE TRIGGER boletas_recalc_total AFTER INSERT OR UPDATE OR DELETE ON public.boletas
  FOR EACH ROW EXECUTE FUNCTION public.recalc_total_rendicion();
