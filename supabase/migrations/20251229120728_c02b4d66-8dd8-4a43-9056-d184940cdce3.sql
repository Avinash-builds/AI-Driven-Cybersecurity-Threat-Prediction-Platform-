-- Create export_history table to track all exports
CREATE TABLE public.export_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  platform TEXT NOT NULL,
  collection TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  external_url TEXT,
  data_snapshot JSONB,
  config_summary JSONB,
  error_message TEXT,
  exported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own export history
CREATE POLICY "Users can view own exports"
ON public.export_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own exports
CREATE POLICY "Users can create exports"
ON public.export_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own exports
CREATE POLICY "Users can update own exports"
ON public.export_history
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all exports
CREATE POLICY "Admins can view all exports"
ON public.export_history
FOR SELECT
USING (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_export_history_user_id ON public.export_history(user_id);
CREATE INDEX idx_export_history_platform ON public.export_history(platform);
CREATE INDEX idx_export_history_status ON public.export_history(status);