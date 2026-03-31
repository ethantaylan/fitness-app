import { Link } from "react-router-dom";
import { Dumbbell, Target, ChevronRight, Download } from "lucide-react";
import Section from "../ui/Section";
import type { Program } from "../../lib/types";

interface Props {
  readonly program: Program | null;
  readonly downloadingPDF: boolean;
  readonly onDownloadPDF: () => void;
}

export default function ProgramSection({ program, downloadingPDF, onDownloadPDF }: Props) {
  if (!program) {
    return (
      <Section
        icon={<Dumbbell className="w-4 h-4" />}
        title="Programme"
        color="text-indigo-600"
        bg="bg-indigo-50"
        noPad
      >
        <div className="p-5 flex items-center gap-4">
          <div
            className="w-12 h-12 shrink-0 bg-indigo-50 rounded-2xl flex items-center justify-center"
            aria-hidden="true"
          >
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm mb-0.5">Aucun programme actif</p>
            <p className="text-xs text-gray-400 leading-snug">
              Réponds à quelques questions, ton plan sur mesure est prêt en 2 minutes.
            </p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <Link
            to="/onboarding"
            className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all active:scale-95 hover:bg-gray-900"
          >
            <Dumbbell className="w-4 h-4" aria-hidden="true" />
            Créer mon programme
          </Link>
        </div>
      </Section>
    );
  }

  return (
    <Section
      icon={<Dumbbell className="w-4 h-4" />}
      title="Programme"
      color="text-indigo-600"
      bg="bg-indigo-50"
      noPad
    >
      <div className="grid grid-cols-3 divide-x divide-gray-50 border-b border-gray-50">
        {[
          { value: program.program_overview.duration_weeks, label: "semaines" },
          { value: program.program_overview.training_days_per_week, label: "séances / sem" },
          { value: program.weeks?.length ?? 0, label: "semaines planif." },
        ].map(({ value, label }) => (
          <div key={label} className="py-4 text-center">
            <div className="text-xl font-black text-gray-900">{value}</div>
            <div className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="p-4 flex items-center gap-3">
        <Link
          to="/result"
          className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-100 rounded-xl py-2.5 text-sm font-black hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all"
        >
          Voir le programme complet <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <button
          onClick={onDownloadPDF}
          disabled={downloadingPDF}
          aria-label="Télécharger le programme en PDF"
          className="flex items-center gap-1.5 border-2 border-gray-100 rounded-xl py-2.5 px-4 text-sm font-bold text-gray-600 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          {downloadingPDF ? "..." : "PDF"}
        </button>
      </div>
    </Section>
  );
}
