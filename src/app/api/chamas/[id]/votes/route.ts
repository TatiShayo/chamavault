import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("chama_members")
    .select("role, id")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: resolutions, error } = await supabase
    .from("votes")
    .select("id, resolution_text, created_at, closes_at")
    .eq("chama_id", chamaId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: records } = await supabase
    .from("vote_records")
    .select("vote_id, member_id, vote_value")
    .in("vote_id", (resolutions || []).map((v) => v.id));

  const tallyMap: Record<string, { yes: number; no: number; abstain: number; total: number }> = {};
  const userVoteMap: Record<string, string> = {};

  for (const r of records || []) {
    const vid = r.vote_id as string;
    if (!tallyMap[vid]) {
      tallyMap[vid] = { yes: 0, no: 0, abstain: 0, total: 0 };
    }
    tallyMap[vid][r.vote_value as "yes" | "no" | "abstain"] += 1;
    tallyMap[vid].total += 1;

    if (r.member_id === membership.id) {
      userVoteMap[vid] = r.vote_value;
    }
  }

  const { data: memberCount } = await supabase
    .from("chama_members")
    .select("id", { count: "exact" })
    .eq("chama_id", chamaId);

  const totalMembers = memberCount?.length || 0;

  const rows = (resolutions || []).map((v) => {
    const tally = tallyMap[v.id] || { yes: 0, no: 0, abstain: 0, total: 0 };
    const open = !v.closes_at || new Date(v.closes_at) > new Date();
    return {
      id: v.id,
      resolutionText: v.resolution_text,
      createdAt: v.created_at,
      closesAt: v.closes_at,
      open,
      tally,
      totalMembers,
      userVote: userVoteMap[v.id] || null,
    };
  });

  return NextResponse.json({ resolutions: rows });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("chama_members")
    .select("role, id")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  const body = await request.json();

  if (body.resolutionText) {
    if (!membership || !["chairperson", "treasurer", "secretary"].includes(membership.role)) {
      return NextResponse.json({ error: "Only officers can create resolutions" }, { status: 403 });
    }

    if (!body.resolutionText) {
      return NextResponse.json({ error: "resolutionText is required" }, { status: 400 });
    }

    const { data: resolution, error } = await supabase
      .from("votes")
      .insert({
        chama_id: chamaId,
        resolution_text: body.resolutionText,
        closes_at: body.closesAt || null,
      })
      .select("id, resolution_text, created_at, closes_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      resolution: {
        id: resolution.id,
        resolutionText: resolution.resolution_text,
        createdAt: resolution.created_at,
        closesAt: resolution.closes_at,
        open: !resolution.closes_at || new Date(resolution.closes_at) > new Date(),
        tally: { yes: 0, no: 0, abstain: 0, total: 0 },
        totalMembers: 0,
        userVote: null,
      },
    });
  }

  if (body.voteValue) {
    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    const voteId = body.voteId;
    const voteValue = body.voteValue;

    if (!voteId || !["yes", "no", "abstain"].includes(voteValue)) {
      return NextResponse.json({ error: "voteId and valid voteValue (yes/no/abstain) required" }, { status: 400 });
    }

    // Verify the vote is still open
    const { data: vote } = await supabase
      .from("votes")
      .select("closes_at")
      .eq("id", voteId)
      .single();

    if (vote?.closes_at && new Date(vote.closes_at) <= new Date()) {
      return NextResponse.json({ error: "This vote has closed" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("vote_records")
      .select("id")
      .eq("vote_id", voteId)
      .eq("member_id", membership.id)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("vote_records")
        .update({ vote_value: voteValue })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from("vote_records")
        .insert({
          vote_id: voteId,
          member_id: membership.id,
          vote_value: voteValue,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
