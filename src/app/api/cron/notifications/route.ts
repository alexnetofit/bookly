import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cron job para processar notificações agendadas
// Executado a cada 5 minutos pelo Vercel Cron

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 segundos máximo

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Verificar autorização (Vercel Cron envia um header especial)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Buscar notificações agendadas que devem ser enviadas
    const now = new Date().toISOString();
    const { data: notifications, error } = await supabase
      .from("push_notifications")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (error) throw error;

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: "Nenhuma notificação para enviar", sent: 0 });
    }

    let sentCount = 0;

    for (const notification of notifications) {
      try {
        // Enviar notificação via API interna
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": process.env.CRON_SECRET!,
          },
          body: JSON.stringify({ notificationId: notification.id }),
        });

        if (response.ok) {
          sentCount++;

          // Calcular próximo agendamento para notificações recorrentes
          if (notification.recurrence_type !== "once") {
            const nextScheduledAt = calculateNextSchedule(
              notification.scheduled_at,
              notification.recurrence_type
            );

            await supabase
              .from("push_notifications")
              .update({
                scheduled_at: nextScheduledAt,
                last_sent_at: now,
                status: "scheduled",
              })
              .eq("id", notification.id);
          }
        }
      } catch (err) {
        console.error(`Erro ao enviar notificação ${notification.id}:`, err);
      }
    }

    return NextResponse.json({
      message: `Processado ${notifications.length} notificações`,
      sent: sentCount,
    });
  } catch (error) {
    console.error("Erro no cron de notificações:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

function calculateNextSchedule(currentSchedule: string, recurrenceType: string): string {
  const current = new Date(currentSchedule);
  
  switch (recurrenceType) {
    case "daily":
      current.setDate(current.getDate() + 1);
      break;
    case "weekly":
      current.setDate(current.getDate() + 7);
      break;
    case "monthly":
      current.setMonth(current.getMonth() + 1);
      break;
    default:
      break;
  }
  
  return current.toISOString();
}

