import { useEffect, useState } from "react";
import { fetchOffers, Offer } from "@/lib/offers";
import { OfferCard } from "@/components/OfferCard";
import { Star } from "lucide-react";

const Prime = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchOffers();
        if (mounted) setOffers(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary/5 border-b px-4 pt-6 pb-4">
        <h1 className="font-display font-bold text-xl flex items-center gap-2">
          <Star className="h-6 w-6 text-primary" /> Prime — Ofertas
        </h1>
        <p className="text-sm text-muted-foreground">Ofertas actuales en supermercados</p>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">Cargando ofertas…</div>
        ) : offers.length === 0 ? (
          <div className="text-center py-8">No hay ofertas en este momento</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {offers.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Prime;
