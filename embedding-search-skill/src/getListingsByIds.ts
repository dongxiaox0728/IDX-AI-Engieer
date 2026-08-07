import type { RowDataPacket } from "mysql2";
import { pool } from "./mysql";
import type { PropertyListing } from "./types";

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

export async function getListingsByIds(
  listingIds: string[]
): Promise<PropertyListing[]> {
  if (listingIds.length === 0) {
    return [];
  }

  const placeholders = listingIds
    .map(() => "?")
    .join(", ");

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
    WHERE L_ListingID IN (${placeholders})
  `;

  const [rows] = await pool.query<PropertyListingRow[]>(
    sql,
    listingIds
  );

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