import { query } from "./mysql";
import type { RowDataPacket } from "mysql2";

export interface SoldCompRow extends RowDataPacket {
  id: string;
  address: string | null;
  city: string | null;
  closeDate: Date | string | null;
  closePrice: number | null;
  originalListPrice: number | null;
  listPrice: number | null;
  daysOnMarket: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  propertyType: string | null;
  propertySubtype: string | null;
  yearBuilt: number | null;
  listAgentName: string | null;
  listOfficeName: string | null;
  buyerOfficeName: string | null;
}

export async function getSoldComps(
  city: string,
  months = 12,
  limit = 50
): Promise<SoldCompRow[]> {
  const safeMonths = Math.min(
    Math.max(1, Math.floor(months)),
    120
  );

  const safeLimit = Math.min(
    Math.max(1, Math.floor(limit)),
    100
  );

  const sql = `
    SELECT
      ListingKey AS id,
      UnparsedAddress AS address,
      City AS city,
      CloseDate AS closeDate,
      ClosePrice AS closePrice,
      OriginalListPrice AS originalListPrice,
      ListPrice AS listPrice,
      DaysOnMarket AS daysOnMarket,
      BedroomsTotal AS beds,
      BathroomsTotalInteger AS baths,
      LivingArea AS sqft,
      PropertyType AS propertyType,
      PropertySubType AS propertySubtype,
      YearBuilt AS yearBuilt,
      ListAgentFullName AS listAgentName,
      ListOfficeName AS listOfficeName,
      BuyerOfficeName AS buyerOfficeName
    FROM california_sold
    WHERE City = ?
      AND CloseDate >= DATE_SUB(
        CURDATE(),
        INTERVAL ${safeMonths} MONTH
      )
      AND PropertyType = 'Residential'
    ORDER BY CloseDate DESC
    LIMIT ${safeLimit}
  `;

  return query<SoldCompRow>(sql, [city]);
}