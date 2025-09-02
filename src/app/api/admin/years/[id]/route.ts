import { NextRequest } from "next/server";
import { withFullValidation } from "@/lib/validation";
import { UpdateYearSchema, z } from "@/lib/validation/schemas";
import { withAdmin } from "@/lib/auth";
import { YearService } from "@/lib/database/services";

// PUT /api/admin/years/[id] - Update a year
export const PUT = withAdmin({ path: "/api/admin/years/[id]" })(
  withFullValidation(
    {
      body: UpdateYearSchema,
      params: z.object({ id: z.string().cuid() }),
    },
    { path: "/api/admin/years/[id]" }
  )(({ body, params }) => {
    const { id } = params!;
    const yearService = new YearService();

    // Update the year using the service
    return yearService.updateYear(id, body!);
  })
);

// DELETE /api/admin/years/[id] - Delete a year
export const DELETE = withAdmin({ path: "/api/admin/years/[id]" })(
  withFullValidation(
    {
      params: z.object({ id: z.string().cuid() }),
    },
    { path: "/api/admin/years/[id]" }
  )(({ params }) => {
    const { id } = params!;
    const yearService = new YearService();

    // Delete the year using the service
    return yearService.deleteYear(id);
  })
);
