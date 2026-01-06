-- =============================================
-- MIGRAÇÃO: Notificações Programadas
-- Adiciona suporte a agendamento e recorrência de notificações
-- =============================================

-- Adicionar novas colunas à tabela push_notifications
ALTER TABLE public.push_notifications 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'once' CHECK (recurrence_type IN ('once', 'daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Atualizar status para incluir 'scheduled'
-- Primeiro remover constraint existente e criar nova
ALTER TABLE public.push_notifications 
DROP CONSTRAINT IF EXISTS push_notifications_status_check;

ALTER TABLE public.push_notifications 
ADD CONSTRAINT push_notifications_status_check 
CHECK (status IN ('draft', 'scheduled', 'sent'));

-- Criar índice para buscar notificações agendadas
CREATE INDEX IF NOT EXISTS idx_push_notifications_scheduled 
ON public.push_notifications(scheduled_at, status) 
WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- Comentários
COMMENT ON COLUMN public.push_notifications.scheduled_at IS 'Data/hora para envio agendado';
COMMENT ON COLUMN public.push_notifications.recurrence_type IS 'Tipo de recorrência: once, daily, weekly, monthly';
COMMENT ON COLUMN public.push_notifications.last_sent_at IS 'Última vez que foi enviada (para recorrência)';

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

