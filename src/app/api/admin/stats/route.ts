import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  // Create admin client with service role key
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Verify admin status
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("users_profile")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all stats with service role (bypasses RLS)
    const [usersResult, booksResult, postsResult] = await Promise.all([
      supabaseAdmin.from("users_profile").select("id, subscription_expires_at, is_admin, created_at"),
      supabaseAdmin.from("books").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("community_posts").select("*", { count: "exact", head: true }),
    ]);

    const users = usersResult.data || [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalUsers = users.length;
    const activeUsers = users.filter((u) => {
      if (u.is_admin) return true;
      if (!u.subscription_expires_at) return false;
      return new Date(u.subscription_expires_at) > now;
    }).length;

    const newUsersWeek = users.filter((u) => new Date(u.created_at) > weekAgo).length;

    return NextResponse.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalBooks: booksResult.count || 0,
      totalPosts: postsResult.count || 0,
      newUsersWeek,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

