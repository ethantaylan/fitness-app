import type { ReactNode } from "react";

interface Props {
  readonly icon: ReactNode;
  readonly title: string;
  readonly color: string;
  readonly bg: string;
  readonly children: ReactNode;
  readonly noPad?: boolean;
  readonly badge?: ReactNode;
}

/**
 * Reusable section card with colored header.
 * Used across Dashboard and Settings pages.
 */
export default function Section({ icon, title, color, bg, children, noPad = false, badge }: Props) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div
        className={`flex items-center justify-between gap-2.5 px-5 py-4 border-b border-gray-50 ${bg}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={color} aria-hidden="true">
            {icon}
          </div>
          <h2 className={`text-xs font-black uppercase tracking-wider ${color}`}>{title}</h2>
        </div>
        {badge && <div>{badge}</div>}
      </div>
      <div className={noPad ? "" : "p-5"}>{children}</div>
    </section>
  );
}
