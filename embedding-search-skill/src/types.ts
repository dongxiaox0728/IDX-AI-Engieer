export interface PropertyListing {
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

export interface ListingEmbedding {
  listingId: string;
  text: string;
  embedding: number[];
}

export interface SemanticListingResult
  extends PropertyListing {
  similarityScore: number;
}