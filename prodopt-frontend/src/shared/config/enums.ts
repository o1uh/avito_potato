export enum DealStatus {
  CREATED = 1,
  AGREED = 2,
  PAID = 3,
  SHIPPED = 4,
  COMPLETED = 5,
  CANCELED = 6,
  DISPUTE = 7,
}

export enum ProductStatus {
  DRAFT = 1,
  PUBLISHED = 2,
  ARCHIVED = 3,
  ON_MODERATION = 4,
}

export enum UserRole {
  ADMIN = 1,
  MANAGER = 2,
  // Добавьте другие роли по необходимости
}