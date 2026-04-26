import { useQuery } from "@tanstack/react-query";

export interface Unit {
  id: number;
  name: string;
  slug: string;
  description: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  isActive: boolean;
}

export function useUnits() {
  return useQuery<Unit[]>({
    queryKey: ["units"],
    queryFn: async () => {
      const res = await fetch("/api/units");
      if (!res.ok) throw new Error("Failed to fetch units");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
