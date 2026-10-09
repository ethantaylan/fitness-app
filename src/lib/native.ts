import { Capacitor } from "@capacitor/core";

export const isNativeApp = Capacitor.isNativePlatform();
export const NATIVE_AUTH_SCHEME = "app.vincere.fitness";

export async function selectionFeedback() {
  if (!isNativeApp) return;
  const { Haptics } = await import("@capacitor/haptics");
  await Haptics.selectionChanged().catch(() => undefined);
}

export async function timerFeedback() {
  if (!isNativeApp) return;
  const { Haptics, NotificationType } = await import("@capacitor/haptics");
  await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
}

export async function shareFile(blob: Blob, name: string, title: string) {
  if (isNativeApp) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Impossible de préparer le fichier."));
      reader.onload = () => {
        if (typeof reader.result !== "string") reject(new Error("Fichier illisible."));
        else resolve(reader.result.split(",")[1]);
      };
      reader.readAsDataURL(blob);
    });
    const path = `exports/${name}`;
    const { uri } = await Filesystem.writeFile({
      path,
      directory: Directory.Cache,
      data,
      recursive: true,
    });
    try {
      await Share.share({ title, files: [uri] });
    } finally {
      await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function shareLink(url: string, title: string): Promise<"shared" | "copied"> {
  if (isNativeApp) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, url });
    return "shared";
  }
  if (navigator.share) {
    await navigator.share({ title, url });
    return "shared";
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

export async function openExternalUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Lien externe non sécurisé.");
  if (isNativeApp) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
