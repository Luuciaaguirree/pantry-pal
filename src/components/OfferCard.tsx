import { Offer } from "@/lib/offers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface OfferCardProps {
  offer: Offer;
}

export function OfferCard({ offer }: OfferCardProps) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex items-start justify-between">
        <div className="text-3xl">{offer.emoji ?? "🛒"}</div>
        <div className="text-right">
          {offer.discount ? (
            <div className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">-{offer.discount}%</div>
          ) : null}
        </div>
      </div>
      <h3 className="mt-3 font-semibold text-sm text-foreground">{offer.name}</h3>
      <p className="text-xs text-muted-foreground">{offer.store}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">€{offer.price.toFixed(2)}</div>
          {offer.oldPrice ? (
            <div className="text-xs text-muted-foreground line-through">€{offer.oldPrice.toFixed(2)}</div>
          ) : null}
        </div>
        <Button size="sm">Ver oferta</Button>
      </div>
    </div>
  );
}
