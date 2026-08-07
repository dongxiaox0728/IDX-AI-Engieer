import { RowDataPacket } from "mysql2";
import { pool } from "./mysql";
import { PropertyListing } from "./types";

interface PropertyListingRow extends RowDataPacket {
  listingId: string;
  propertyType: string | null;
  city: string | null;
  bedrooms: number | null;
  halfBathrooms: number | null;
  lotSizeSquareFeet: number | null;
  yearBuilt: number | null;
  price: number | null;
  remarks: string | null;
}

export async function getActiveListings(
  limit = 20
): Promise<PropertyListing[]> {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("The listing limit must be a positive integer.");
  }

  const sql = `
    SELECT
      L_ListingID AS listingId,
      L_Type_ AS propertyType,
      L_City AS city,
      MainLevelBedrooms AS bedrooms,
      BathroomsHalf AS halfBathrooms,
      LotSizeSquareFeet AS lotSizeSquareFeet,
      YearBuilt AS yearBuilt,
      L_SystemPrice AS price,
      L_Remarks AS remarks
    FROM rets_property
    WHERE L_Status = ?
      AND L_Remarks IS NOT NULL
      AND TRIM(L_Remarks) <> ''
    LIMIT ?
  `;

  const [rows] = await pool.query<PropertyListingRow[]>(sql, [
    "Active",
    limit,
  ]);

  return rows.map((row) => ({
    listingId: String(row.listingId),
    propertyType: row.propertyType,
    city: row.city,
    bedrooms: row.bedrooms,
    halfBathrooms: row.halfBathrooms,
    lotSizeSquareFeet: row.lotSizeSquareFeet,
    yearBuilt: row.yearBuilt,
    price: row.price,
    remarks: row.remarks,
  }));
}