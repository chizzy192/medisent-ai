"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/strings";

export type Clinic = { id: string; name: string; address: string | null; lat: number | null; lng: number | null; phone: string | null; hours: string | null };

/**
 * Nearest clinics on a Leaflet map (OpenStreetMap tiles). Markers are circle markers (no icon
 * assets). Centred on the hospital, or on the patient after "Use my location". The list under
 * the map carries the same clinics with call links, so the map is never the only way.
 */
export function ClinicMap({ clinics, center }: { clinics: Clinic[]; center: { lat: number; lng: number } }) {
  const t = tr("redflag");
  const ref = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !el) return;
      map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap" }).addTo(map);
      const origin = me ?? center;
      map.setView([origin.lat, origin.lng], 13);
      if (me) L.circleMarker([me.lat, me.lng], { radius: 9, color: "#1D4E89", fillColor: "#1D4E89", fillOpacity: 1 }).addTo(map).bindPopup(t("youAreHere"));
      for (const c of clinics) {
        if (c.lat === null || c.lng === null) continue;
        L.circleMarker([c.lat, c.lng], { radius: 10, color: "#c81e1e", fillColor: "#c81e1e", fillOpacity: 0.9, weight: 2 })
          .addTo(map)
          .bindPopup(`<strong>${c.name}</strong><br>${c.address ?? ""}${c.phone ? `<br><a href="tel:${c.phone}">${c.phone}</a>` : ""}`);
      }
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [clinics, center, me, t]);

  function locate() {
    if (!navigator.geolocation) return setGeoError(true);
    navigator.geolocation.getCurrentPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGeoError(true),
      { timeout: 8000 },
    );
  }

  return (
    <div className="space-y-2">
      <div ref={ref} role="img" aria-label={t("mapLabel")} className="h-64 w-full overflow-hidden rounded-card border border-border bg-surface-2" data-testid="clinic-map" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={locate} className="btn-outline px-4 text-sm">
          {t("useMyLocation")}
        </button>
        {geoError && <span className="text-sm text-ink-2">{t("locationOff")}</span>}
      </div>
    </div>
  );
}
