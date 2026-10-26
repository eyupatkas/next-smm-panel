"use client";

import { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    iFrameResize?: (options?: Record<string, unknown>, target?: string) => void;
  }
}

/**
 * PayTR, ödeme sonucunu iframe'den postMessage ile bildirir.
 * success: karttan tahsilat yapıldı; fail: ödeme tamamlanmadı.
 */
export type PayTRIframeResult = "success" | "fail";

type Props = {
  token: string;
  title: string;
  iframeId?: string;
  minHeight?: number;
  onResult?: (result: PayTRIframeResult) => void;
};

export function PayTRIframe({ token, title, iframeId = "paytriframe", minHeight = 560, onResult }: Props) {
  const resizeIframe = () => {
    if (typeof window !== "undefined" && typeof window.iFrameResize === "function") {
      window.iFrameResize({}, `#${iframeId}`);
    }
  };

  useEffect(() => {
    resizeIframe();
  }, [iframeId, token]);

  useEffect(() => {
    if (!onResult) return;

    function handleMessage(event: MessageEvent) {
      if (typeof event.origin === "string" && !event.origin.includes("paytr.com")) return;
      if (event.data === "PAYTR_IFRAME_SUCCESS") onResult?.("success");
      else if (event.data === "PAYTR_IFRAME_FAIL") onResult?.("fail");
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onResult]);

  return (
    <>
      <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" />
      <iframe
        src={`https://www.paytr.com/odeme/guvenli/${token}`}
        id={iframeId}
        frameBorder={0}
        scrolling="auto"
        style={{ width: "100%", minHeight: minHeight < 750 ? 750 : minHeight, display: "block" }}
        title={title}
        onLoad={resizeIframe}
      />
    </>
  );
}
