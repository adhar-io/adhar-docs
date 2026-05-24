
-- Restrict profile reads to owner only (was public)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Lock down writes on user_roles to moderators only
CREATE POLICY "Moderators can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'moderator'::public.app_role));

CREATE POLICY "Moderators can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'moderator'::public.app_role));

CREATE POLICY "Moderators can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::public.app_role));
