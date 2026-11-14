"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChequePrintStudio } from "@/components/cheques/ChequePrintStudio";
import { useDatabase } from "@/context/DatabaseContext";
import { storage } from "@/lib/storage";
import { Cheque } from "@/types";

function ChequePrintPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const chequeId = searchParams.get("id");

  const { cheques } = useDatabase();
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);

  useEffect(() => {
    if (chequeId) {
      const list = cheques.length > 0 ? cheques : storage.getCheques();
      const found = list.find((c) => c.id === chequeId);
      if (found) setSelectedCheque(found);
    }
  }, [chequeId, cheques]);

  return (
    <ChequePrintStudio
      isOpen={true}
      cheque={selectedCheque}
      onClose={() => router.push("/cheques")}
    />
  );
}

export default function ChequePrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
          Loading Cheque Calibration Studio...
        </div>
      }
    >
      <ChequePrintPageContent />
    </Suspense>
  );
}
