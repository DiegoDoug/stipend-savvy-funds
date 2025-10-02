-- Drop duplicate unique constraint on profiles table (this will also drop the index)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;

-- ============================================
-- PROFILES TABLE - Optimize RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING ((select auth.uid()) = user_id);

-- ============================================
-- TRANSACTIONS TABLE - Optimize RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;

CREATE POLICY "Users can create their own transactions"
ON public.transactions
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.transactions
FOR DELETE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.transactions
FOR UPDATE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING ((select auth.uid()) = user_id);

-- ============================================
-- BUDGET_CATEGORIES TABLE - Optimize RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Users can create their own budget categories" ON public.budget_categories;
DROP POLICY IF EXISTS "Users can delete their own budget categories" ON public.budget_categories;
DROP POLICY IF EXISTS "Users can update their own budget categories" ON public.budget_categories;
DROP POLICY IF EXISTS "Users can view their own budget categories" ON public.budget_categories;

CREATE POLICY "Users can create their own budget categories"
ON public.budget_categories
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own budget categories"
ON public.budget_categories
FOR DELETE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own budget categories"
ON public.budget_categories
FOR UPDATE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own budget categories"
ON public.budget_categories
FOR SELECT
USING ((select auth.uid()) = user_id);

-- ============================================
-- REFUNDS TABLE - Optimize RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Users can create their own refunds" ON public.refunds;
DROP POLICY IF EXISTS "Users can delete their own refunds" ON public.refunds;
DROP POLICY IF EXISTS "Users can update their own refunds" ON public.refunds;
DROP POLICY IF EXISTS "Users can view their own refunds" ON public.refunds;

CREATE POLICY "Users can create their own refunds"
ON public.refunds
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own refunds"
ON public.refunds
FOR DELETE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own refunds"
ON public.refunds
FOR UPDATE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own refunds"
ON public.refunds
FOR SELECT
USING ((select auth.uid()) = user_id);

-- ============================================
-- CUSTOM_CATEGORIES TABLE - Optimize RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Users can create their own custom categories" ON public.custom_categories;
DROP POLICY IF EXISTS "Users can delete their own custom categories" ON public.custom_categories;
DROP POLICY IF EXISTS "Users can update their own custom categories" ON public.custom_categories;
DROP POLICY IF EXISTS "Users can view their own custom categories" ON public.custom_categories;

CREATE POLICY "Users can create their own custom categories"
ON public.custom_categories
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own custom categories"
ON public.custom_categories
FOR DELETE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own custom categories"
ON public.custom_categories
FOR UPDATE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own custom categories"
ON public.custom_categories
FOR SELECT
USING ((select auth.uid()) = user_id);

-- ============================================
-- SAVINGS_GOALS TABLE - Optimize RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Users can create their own goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can view their own goals" ON public.savings_goals;

CREATE POLICY "Users can create their own goals"
ON public.savings_goals
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own goals"
ON public.savings_goals
FOR DELETE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own goals"
ON public.savings_goals
FOR UPDATE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own goals"
ON public.savings_goals
FOR SELECT
USING ((select auth.uid()) = user_id);

-- ============================================
-- VERIFICATION_CODES TABLE - Optimize RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Users can create their own verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can delete their own verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can update their own verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.verification_codes;

CREATE POLICY "Users can create their own verification codes"
ON public.verification_codes
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own verification codes"
ON public.verification_codes
FOR DELETE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own verification codes"
ON public.verification_codes
FOR UPDATE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own verification codes"
ON public.verification_codes
FOR SELECT
USING ((select auth.uid()) = user_id);