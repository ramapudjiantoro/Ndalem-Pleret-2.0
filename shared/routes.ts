import { z } from "zod";
import { insertInquirySchema } from "./schema";
import { insertBookingSchema } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  inquiries: {
    create: {
      method: "POST" as const,
      path: "/api/inquiries",
      input: insertInquirySchema,
      responses: {
        201: z.object({ id: z.number() }),
        400: errorSchemas.validation,
      },
    },
  },

  units: {
    list: {
      method: "GET" as const,
      path: "/api/units",
    },
  },

  availability: {
    get: {
      method: "GET" as const,
      // ?unitId=1&start=YYYY-MM-DD&end=YYYY-MM-DD
      path: "/api/availability",
    },
  },

  bookings: {
    create: {
      method: "POST" as const,
      path: "/api/bookings",
      input: insertBookingSchema,
    },
    getByRef: {
      method: "GET" as const,
      path: "/api/bookings/:ref",
    },
  },

  admin: {
    login: {
      method: "POST" as const,
      path: "/api/admin/login",
    },
    listBookings: {
      method: "GET" as const,
      path: "/api/admin/bookings",
    },
    updateBooking: {
      method: "PATCH" as const,
      path: "/api/admin/bookings/:id",
    },
    blockDate: {
      method: "POST" as const,
      path: "/api/admin/blocked-dates",
    },
    deleteBlockedDate: {
      method: "DELETE" as const,
      path: "/api/admin/blocked-dates/:id",
    },
    listBlockedDates: {
      method: "GET" as const,
      path: "/api/admin/blocked-dates",
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
