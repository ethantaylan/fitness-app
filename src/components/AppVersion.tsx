import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { App } from "@capacitor/app";
import packageInfo from "../../package.json";
import { isNativeApp } from "../lib/native";

export default function AppVersion() {
  const [version, setVersion] = useState(packageInfo.version);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isNativeApp)
      void App.getInfo()
        .then((info) => setVersion(`${info.version} (${info.build})`))
        .catch(() => {});
  }, []);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-1 text-sm text-ink-soft">
      <span>Vincere {version}</span>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-card-soft hover:text-ink"
        aria-label="Copier la version de Vincere"
        title="Copier la version"
        onClick={() => {
          void navigator.clipboard
            .writeText(`Vincere ${version}`)
            .then(() => {
              setCopied(true);
              setError("");
            })
            .catch(() => setError(`Version à communiquer : ${version}`));
        }}
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      </button>
      {copied && <span role="status">Version copiée</span>}
      {error && <span role="status">{error}</span>}
    </div>
  );
}
