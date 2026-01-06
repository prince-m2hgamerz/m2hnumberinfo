import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  User,
  Phone,
  MapPin,
  Radio,
  Users,
  Mail,
  CreditCard,
  Timer,
  CalendarClock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* ===============================
   TYPES
================================ */

interface RawNumberResult {
  name?: string;
  mobile?: string;
  father_name?: string | null;
  address?: string;
  alt_mobile?: string | null;
  circle?: string;
  email?: string | null;
}

interface NumberResult {
  name: string;
  mobile: string;
  fatherName?: string | null;
  address: string;
  altMobile?: string | null;
  circle: string;
  email?: string | null;
}

interface AadhaarResult {
  name: string;
  aadhar_number: string;
}

interface LookupMeta {
  processingTime?: number;
  timestamp?: string;
}

type LookupMode = "number" | "aadhaar";

interface Props {
  userId: string;
  credits: number;
  onLookup: (credits: number) => void;
  onHistoryUpdate: () => void;
}

/* ===============================
   HELPERS
================================ */

const normalizeNumberResult = (r: RawNumberResult): NumberResult => ({
  name: r.name ?? "Not available",
  mobile: r.mobile ?? "",
  fatherName: r.father_name ?? null,
  address: r.address ?? "Not available",
  altMobile: r.alt_mobile ?? null,
  circle: r.circle ?? "Not available",
  email: r.email ?? null,
});

const extractResults = (data: unknown): RawNumberResult[] => {
  if (typeof data !== "object" || data === null) return [];
  const d = data as {
    result?: unknown;
    allResults?: unknown;
    data?: unknown;
  };

  if (Array.isArray(d.result)) return d.result as RawNumberResult[];
  if (Array.isArray(d.allResults)) return d.allResults as RawNumberResult[];
  if (typeof d.data === "object" && d.data !== null) return [d.data as RawNumberResult];
  return [];
};

const hasValidNumberData = (r: NumberResult): boolean => {
  const invalid = ["not available", "n/a", ""];
  const bad = (v?: string | null) => !v || invalid.includes(v.toLowerCase());
  return !(bad(r.name) && bad(r.address) && bad(r.circle));
};

/* ===============================
   COMPONENT
================================ */

export const NumberLookup = ({ userId, credits, onLookup, onHistoryUpdate }: Props) => {
  const [number, setNumber] = useState("");
  const [mode, setMode] = useState<LookupMode>("number");
  const [loading, setLoading] = useState(false);

  const [results, setResults] = useState<NumberResult[]>([]);
  const [aadhaarResults, setAadhaarResults] = useState<AadhaarResult[]>([]);
  const [meta, setMeta] = useState<LookupMeta | null>(null);
  const [resultCount, setResultCount] = useState(0);

  const { toast } = useToast();

  /* ===============================
     SAFE CREDIT UPDATE (🔥 FIX)
  ================================ */

  const updateCreditsSafely = (data: unknown) => {
    if (
      data &&
      typeof data === "object" &&
      "remainingCredits" in data &&
      typeof (data as { remainingCredits: unknown }).remainingCredits === "number"
    ) {
      onLookup((data as { remainingCredits: number }).remainingCredits);
    }
  };

  /* ===============================
     LOOKUP
  ================================ */

  const handleLookup = async () => {
    // 🔐 HARD STOP AT 0 CREDITS
    if (credits <= 0) {
      toast({
        title: "Insufficient Credits",
        description: "Please purchase credits to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{10}$/.test(number)) {
      toast({
        title: "Invalid Number",
        description: "Enter a valid 10-digit mobile number.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);
    setAadhaarResults([]);
    setMeta(null);
    setResultCount(0);

    try {
      /* ===== NUMBER LOOKUP ===== */
      if (mode === "number") {
        const { data, error } = await supabase.functions.invoke("number-lookup", {
          body: { userId, phoneNumber: number },
        });

        if (error) throw error;

        // 🔒 UPDATE CREDITS ONLY FROM BACKEND
        updateCreditsSafely(data);

        if (data && typeof data === "object" && "meta" in data) {
          setMeta((data as { meta?: LookupMeta }).meta ?? null);
        }

        const raw = extractResults(data);
        const normalized = raw.map(normalizeNumberResult);
        const validResults = normalized.filter(hasValidNumberData);

        if (!validResults.length) {
          toast({
            title: "No Records Found",
            description: "No valid data found.",
          });
          return;
        }

        setResults(validResults);
        setResultCount(validResults.length);
        onHistoryUpdate();

        toast({
          title: "Lookup Successful",
          description: `Found ${validResults.length} result(s).`,
        });
      }

      /* ===== AADHAAR LOOKUP ===== */
      if (mode === "aadhaar") {
        const res = await fetch(`https://aadharinfo.m2hgamerz.workers.dev/?num=${number}`);
        const json = (await res.json()) as {
          success: boolean;
          records?: AadhaarResult[];
        };

        if (!json.success || !json.records?.length) {
          toast({
            title: "No Aadhaar Data",
            description: "No Aadhaar records found.",
          });
          return;
        }

        // ⚠️ Aadhaar credits should ONLY be deducted by backend
        // If backend does NOT deduct → DO NOT touch credits here

        setAadhaarResults(json.records);
        setResultCount(json.records.length);
        onHistoryUpdate();

        toast({
          title: "Aadhaar Lookup Successful",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Lookup Failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     UI
  ================================ */

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <Search className="w-4 h-4" />
          Lookup
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* MODE */}
        <div className="flex gap-2">
          <Button size="sm" variant={mode === "number" ? "default" : "outline"} onClick={() => setMode("number")}>
            📞 Number
          </Button>
          <Button size="sm" variant={mode === "aadhaar" ? "default" : "outline"} onClick={() => setMode("aadhaar")}>
            🆔 Aadhaar
          </Button>
        </div>

        {/* INPUT */}
        <div className="flex gap-2">
          <Input
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Enter 10-digit number"
            className="font-mono"
          />
          <Button onClick={handleLookup} disabled={loading || credits <= 0}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* RESULTS */}
        {!loading && results.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Found {resultCount} result(s) • Swipe
            </p>

            <div className="overflow-x-auto mt-3">
              <div className="flex gap-3 w-max">
                {results.map((r, i) => (
                  <div key={i} className="w-[360px] p-4 rounded-xl border bg-secondary/30">
                    <p className="font-medium flex gap-2 items-center">
                      <User className="w-4 h-4" />
                      {r.name}
                    </p>

                    <p className="text-sm flex gap-1 items-center">
                      <Phone className="w-3 h-3" />
                      {r.mobile}
                    </p>

                    {r.fatherName && <p className="text-xs">👤 Father: {r.fatherName}</p>}

                    <p className="text-xs flex items-center gap-1">
                      <Radio className="w-3 h-3" />
                      {r.circle}
                    </p>

                    {r.altMobile && <p className="text-xs">🔁 Alt: {r.altMobile}</p>}

                    {r.email && (
                      <p className="text-xs flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {r.email}
                      </p>
                    )}

                    <p className="text-xs mt-1">
                      <MapPin className="inline w-3 h-3 mr-1" />
                      {r.address}
                    </p>

                    {/* METADATA */}
                    {meta && (
                      <div className="mt-3 pt-2 border-t text-xs text-muted-foreground space-y-1">
                        {meta.processingTime !== undefined && (
                          <p className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            Processing: {meta.processingTime} ms
                          </p>
                        )}
                        {meta.timestamp && (
                          <p className="flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" />
                            {new Date(meta.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
