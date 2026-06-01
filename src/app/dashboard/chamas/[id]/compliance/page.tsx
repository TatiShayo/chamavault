import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, Shield, ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface ComplianceItem {
  name: string;
  description: string;
  isCompliant: boolean;
  lastUpdated?: string | null;
}

function ComplianceChecklistItem({ item }: { item: ComplianceItem }) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="mt-1">
        {item.isCompliant ? (
          <CheckCircle className="size-6 text-blue-500" />
        ) : (
          <XCircle className="size-6 text-zinc-300" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</p>
          <Badge variant={item.isCompliant ? "default" : "outline"} className={item.isCompliant ? "bg-blue-500 hover:bg-blue-600" : "text-zinc-400"}>
            {item.isCompliant ? "Compliant" : "Pending"}
          </Badge>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{item.description}</p>
        {item.lastUpdated && (
          <p className="text-xs text-zinc-400 mt-2">
            Verified on: {new Date(item.lastUpdated).toLocaleDateString("en-KE")}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function CompliancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: chama } = await supabase
    .from("chamas")
    .select(
      "name, compliance_type, registration_number, sasra_license_number, sasra_license_expiry, auditor_name, updated_at"
    )
    .eq("id", chamaId)
    .single();

  if (!chama) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Chama not found.</p>
      </div>
    );
  }

  // Fetch board members count
  const { count: boardCount } = await supabase
    .from("board_members")
    .select("*", { count: "exact", head: true })
    .eq("chama_id", chamaId)
    .eq("status", "active");

  // Fetch latest annual return
  const { data: annualReturns } = await supabase
    .from("annual_returns")
    .select("filed_date")
    .eq("chama_id", chamaId)
    .order("filed_date", { ascending: false })
    .limit(1);

  const isSacco = chama.compliance_type === "sacco";
  
  const complianceItems: ComplianceItem[] = [
    {
      name: "Board Composition",
      description: "Minimum 5 board members required (Chairman, Treasurer, Secretary, and 2 Directors).",
      isCompliant: (boardCount || 0) >= 5,
      lastUpdated: null, // Would ideally track board update time
    },
    {
      name: "Registration Status",
      description: "Official registration with the Commissioner for Co-operative Development.",
      isCompliant: !!chama.registration_number,
      lastUpdated: chama.updated_at,
    },
    {
      name: "SASRA License",
      description: "Valid and current SACCO license issued by SASRA.",
      isCompliant: !!(chama.sasra_license_number && chama.sasra_license_expiry && new Date(chama.sasra_license_expiry) > new Date()),
      lastUpdated: chama.updated_at,
    },
    {
      name: "External Audit",
      description: "Appointment of an external auditor approved by SASRA.",
      isCompliant: !!chama.auditor_name,
      lastUpdated: chama.updated_at,
    },
    {
      name: "Annual Returns",
      description: "Submission of audited financial statements and returns to SASRA.",
      isCompliant: !!(annualReturns && annualReturns.length > 0),
      lastUpdated: annualReturns?.[0]?.filed_date,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b bg-white dark:bg-zinc-900 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">
            ChamaVault
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href={`/dashboard/chamas/${chamaId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Compliance Checklist</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Regulatory requirements for {chama.name}
            </p>
          </div>
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1">
            <Shield className="size-3 mr-1" />
            {isSacco ? "SACCO Mode" : "Standard Mode"}
          </Badge>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b">
            <div className="flex items-center gap-2">
              <Info className="size-5 text-blue-500" />
              <CardTitle>SASRA Requirements</CardTitle>
            </div>
            <CardDescription>
              Verify your SACCO's compliance with Kenyan regulatory standards.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {!isSacco && (
              <div className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <div className="flex gap-3">
                  <Shield className="size-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-400">Limited Compliance Tracking</p>
                    <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                      Full SASRA compliance tracking is only enabled for SACCOs. Update your chama type in settings to access all features.
                    </p>
                    <Link 
                      href={`/dashboard/chamas/${chamaId}/settings`}
                      className="mt-3 inline-block text-sm font-bold text-amber-800 dark:text-amber-400 hover:underline"
                    >
                      Update Settings &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}
            
            {complianceItems.map((item) => (
              <ComplianceChecklistItem key={item.name} item={item} />
            ))}
          </CardContent>
        </Card>

        <div className="mt-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-6">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Why Compliance Matters</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
            Maintaining SASRA compliance ensures your SACCO operates legally within Kenya. It protects member deposits, improves institutional governance, and qualifies your group for advanced financial services and government support.
          </p>
          <div className="mt-4">
            <Link 
              href="/lib/sasra-compliance.md" 
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              Read full SASRA compliance guide
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
