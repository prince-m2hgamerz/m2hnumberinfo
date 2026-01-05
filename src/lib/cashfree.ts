let sdkPromise: Promise<void> | null = null;

export type CashfreeMode = "sandbox" | "production";

export async function loadCashfreeSdk(): Promise<void> {
  if (typeof window === "undefined") return;
  if ((window as any).Cashfree) return;

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-cashfree-sdk="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Cashfree SDK")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.dataset.cashfreeSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));

    document.head.appendChild(script);
  });

  return sdkPromise;
}

export async function openCashfreeCheckout(params: {
  paymentSessionId: string;
  mode?: CashfreeMode;
  redirectTarget?: "_self" | "_blank" | "_top" | "_modal";
}): Promise<unknown> {
  await loadCashfreeSdk();

  const Cashfree = (window as any).Cashfree as
    | ((opts: { mode: CashfreeMode }) => {
        checkout: (opts: {
          paymentSessionId: string;
          redirectTarget?: string;
        }) => Promise<unknown>;
      })
    | undefined;

  if (!Cashfree) throw new Error("Cashfree SDK not available");

  const cashfree = Cashfree({ mode: params.mode ?? "production" });
  return cashfree.checkout({
    paymentSessionId: params.paymentSessionId,
    redirectTarget: params.redirectTarget ?? "_blank",
  });
}
