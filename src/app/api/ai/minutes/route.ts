import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const minutesSchema = z.object({
  chamaId: z.string().uuid(),
  agenda: z.string().min(1).max(5000),
  attendance: z.string().max(5000).optional().nullable(),
  meetingId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Throttle the paid LLM call per user: 10 generations / 5 min.
    const rl = rateLimit(`ai-minutes:${user.id}`, 10, 5 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests — please wait before generating more minutes" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const parsed = minutesSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "chamaId and agenda are required" },
        { status: 400 }
      );
    }
    const { agenda, attendance, chamaId } = parsed.data;

    // Authorization: only a member of this chama may spend its AI budget.
    const { data: membership } = await supabase
      .from("chama_members")
      .select("id")
      .eq("chama_id", chamaId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this chama" }, { status: 403 });
    }

    const attendanceList = attendance || "No attendance records";

    const prompt = `You are a professional secretary for a Kenyan chama (savings group). Generate formal meeting minutes in Kiswahili-English bilingual format based on the following:

AGENDA: ${agenda}
ATTENDANCE: ${attendanceList}

Format the minutes as:
1. **Opening** (Fungua) - brief
2. **Roll Call** (Wito wa Jina) - list present/absent
3. **Agenda Discussion** (Majadiliano) - expand each agenda point with plausible discussion
4. **Resolutions** (Maazimio) - 2-3 resolutions
5. **Closing** (Kufunga)

Keep it professional but warm. Use bullet points. Output plain text with markdown headers.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "AI generation failed, please write minutes manually" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const minutes = data.content?.[0]?.text || "Failed to generate minutes.";

    return NextResponse.json({ minutes });
  } catch {
    return NextResponse.json(
      { error: "AI generation failed, please write minutes manually" },
      { status: 500 }
    );
  }
}
