import { useQuery } from "@tanstack/react-query";
import { addMonths, format, startOfMonth } from "date-fns";

interface AvailabilityData {
  unitId: number;
  unavailableDates: string[];
}

export function useAvailability(unitId: number | null, months = 3) {
  const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const end = format(addMonths(startOfMonth(new Date()), months), "yyyy-MM-dd");

  return useQuery<AvailabilityData>({
    queryKey: ["availability", unitId, start, end],
    queryFn: async () => {
      if (!unitId) return { unitId: 0, unavailableDates: [] };
      const res = await fetch(`/api/availability?unitId=${unitId}&start=${start}&end=${end}`);
      if (!res.ok) throw new Error("Failed to fetch availability");
      return res.json();
    },
    enabled: !!unitId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAllUnitsAvailability(unitIds: number[]) {
  const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const end = format(addMonths(startOfMonth(new Date()), 3), "yyyy-MM-dd");

  return useQuery<Record<number, string[]>>({
    queryKey: ["availability-all", unitIds, start, end],
    queryFn: async () => {
      const results: Record<number, string[]> = {};
      await Promise.all(
        unitIds.map(async (id) => {
          const res = await fetch(`/api/availability?unitId=${id}&start=${start}&end=${end}`);
          if (res.ok) {
            const data: AvailabilityData = await res.json();
            results[id] = data.unavailableDates;
          }
        })
      );
      return results;
    },
    enabled: unitIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}
