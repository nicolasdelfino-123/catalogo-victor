import { useEffect } from "react";
import { BUILD_VERSION } from "../generated/buildVersion.js";

const CHECK_INTERVAL_MS = 60000;

export default function useVersionCheck() {
    useEffect(() => {
        let stopped = false;

        const checkVersion = async () => {
            try {
                const response = await fetch(`/version.json?t=${Date.now()}`, {
                    cache: "no-store",
                });
                if (!response.ok) return;

                const data = await response.json();
                const serverVersion = String(data?.version || "").trim();
                if (!serverVersion) return;

                localStorage.setItem("app_version", serverVersion);

                if (!stopped && serverVersion !== BUILD_VERSION) {
                    window.location.reload();
                }
            } catch {
                // Si falla la consulta de version, no interrumpe la app.
            }
        };

        checkVersion();
        const intervalId = window.setInterval(checkVersion, CHECK_INTERVAL_MS);

        const onVisible = () => {
            if (document.visibilityState === "visible") checkVersion();
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            stopped = true;
            window.clearInterval(intervalId);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, []);
}
