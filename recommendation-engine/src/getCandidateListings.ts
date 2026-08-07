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

export async function getCandidateListings(
  targetListingId: string
): Promise<PropertyListing[]> {
  const cleanedId = targetListingId.trim();

  if (!cleanedId) {
    throw new Error("Target listing ID cannot be empty.");
  }

  const sql = `
    SELECT
      L_ListingID AS listingId,
      L_Type_ AS propertyType,
      L_City AS city,
      MainLevelBedrooms AS bedrooms,
      BathroomsHalf AS halfBathrooms,
      LM_Int2_3 AS squareFeet,
      LotSizeSquareFeet AS lotSizeSquareFeet,
      YearBuilt AS yearBuilt,
      L_SystemPrice AS price,
      L_Remarks AS remarks
    FROM rets_property
    WHERE L_Status = ?
      AND L_ListingID <> ?
      AND L_Remarks IS NOT NULL
      AND TRIM(L_Remarks) <> ''
  `;

  const [rows] = await pool.query<PropertyListingRow[]>(
    sql,
    [
      "Active",
      cleanedId
    ]
  );

  return rows.map((row) => ({
    listingId: String(row.listingId),
    propertyType: row.propertyType,
    city: row.city,
    bedrooms: row.bedrooms,
    halfBathrooms: row.halfBathrooms,
    squareFeet: row.squareFeet,
    lotSizeSquareFeet: row.lotSizeSquareFeet,
    yearBuilt: row.yearBuilt,
    price: row.price,
    remarks: row.remarks,
  }));
}