import type { RowDataPacket } from "mysql2";
import { pool } from "./mysql";

interface CompRow extends RowDataPacket {
  avgPpsf: number | string | null;
  compCount: number | string;
}

export interface CompValidationResult {
  compPrice: number | null;
  listPrice: number;
  compCount: number;
  avgPpsf: number | null;
  deltaPct: number | null;
}

export async function validateWithComps(
  city: string,
  squareFeet: number,
  price: number
): Promise<CompValidationResult> {
  if (!city.trim()) {
    throw new Error(
      "City is required for comparable-sales validation."
    );
  }

  if (squareFeet <= 0) {
    throw new Error(
      "Square footage must be greater than zero."
    );
  }

  if (price <= 0) {
    throw new Error(
      "Listing price must be greater than zero."
    );
  }

  // Comparable properties must be within ±20% of
  // the candidate's living area.
  const minSquareFeet =
    squareFeet * 0.8;

  const maxSquareFeet =
    squareFeet * 1.2;

  const sql = `
    SELECT
      AVG(
        ClosePrice / NULLIF(LivingArea, 0)
      ) AS avgPpsf,
      COUNT(*) AS compCount
    FROM california_sold
    WHERE City = ?
      AND PropertyType = 'Residential'
      AND LivingArea BETWEEN ? AND ?
      AND CloseDate >= DATE_SUB(
        CURDATE(),
        INTERVAL 6 MONTH
      )
      AND ClosePrice IS NOT NULL
      AND LivingArea IS NOT NULL
      AND LivingArea > 0
  `;

  const [rows] =
    await pool.query<CompRow[]>(
      sql,
      [
        city,
        minSquareFeet,
        maxSquareFeet
      ]
    );

  const row = rows[0];

  const compCount =
    Number(row?.compCount ?? 0);

  const avgPpsf =
    row?.avgPpsf !== null &&
    row?.avgPpsf !== undefined
      ? Number(row.avgPpsf)
      : null;

  // No usable comparable sales
  if (
    compCount === 0 ||
    avgPpsf === null ||
    !Number.isFinite(avgPpsf) ||
    avgPpsf <= 0
  ) {
    return {
      compPrice: null,
      listPrice: price,
      compCount,
      avgPpsf: null,
      deltaPct: null,
    };
  }

  // Estimated value based on recent sold $/sqft
  const compPrice =
    avgPpsf * squareFeet;

  // Difference between listing price and comp estimate
  const deltaPct =
    ((price - compPrice) / compPrice) *
    100;

  return {
    compPrice:
      Math.round(compPrice),

    listPrice: price,

    compCount,

    avgPpsf:
      Math.round(avgPpsf * 100) / 100,

    deltaPct:
      Math.round(deltaPct * 10) / 10,
  };
}