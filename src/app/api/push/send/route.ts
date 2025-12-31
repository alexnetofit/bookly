import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ONESIGNAL_APP_ID = "08f3fddf-80e6-400f-bea2-37192943f7b2";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!ONESIGNAL_REST_API_KEY) {
      return NextResponse.json(
        { error: "OneSignal REST API Key não configurada" },
        { status: 500 }
      );
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "ID da notificação não fornecido" },
        { status: 400 }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch notification from database
    const { data: notification, error: fetchError } = await supabase
      .from("push_notifications")
      .select("*")
      .eq("id", notificationId)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: "Notificação não encontrada" },
        { status: 404 }
      );
    }

    // Permite reenviar notificações (não bloqueia se já foi enviada)

    // Build OneSignal payload
    const onesignalPayload: any = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["Total Subscriptions"],
      target_channel: "push",
      headings: { en: notification.title },
      contents: { en: notification.message },
    };

    // Add URL if provided
    if (notification.url) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.babelbookshelf.com";
      onesignalPayload.url = notification.url.startsWith("http")
        ? notification.url
        : `${baseUrl}${notification.url}`;
    }

    // Send via OneSignal API v2
    const onesignalResponse = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(onesignalPayload),
    });

    const onesignalData = await onesignalResponse.json();

    if (!onesignalResponse.ok) {
      console.error("OneSignal error:", onesignalData);
      return NextResponse.json(
        { error: onesignalData.errors?.[0] || "Erro ao enviar via OneSignal" },
        { status: 500 }
      );
    }

    // Update notification status in database
    const { error: updateError } = await supabase
      .from("push_notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", notificationId);

    if (updateError) {
      console.error("Error updating notification status:", updateError);
    }

    return NextResponse.json({
      success: true,
      recipients: onesignalData.recipients,
      onesignal_id: onesignalData.id,
    });
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

