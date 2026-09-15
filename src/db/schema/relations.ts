import { relations } from "drizzle-orm";
import { articleRevisions, articleTags, articles, authors, categories, tags } from "./content";
import { businessCategories, businessCategoryLinks, businessClaims, businessHours, businessLeads, businessPhotos, businessReviews, businessServices, businesses } from "./directory";
import { entities, entityLinks } from "./entities";
import { dataPoints, dataSeries } from "./data";
import { locations } from "./geo";
import { users } from "./auth";
import { orders, submissions } from "./commerce";
import { professionalLeads, professionals } from "./professionals";

export const locationsRelations = relations(locations, ({ one, many }) => ({
  parent: one(locations, { fields: [locations.parentId], references: [locations.id], relationName: "parent" }),
  children: many(locations, { relationName: "parent" }),
  businesses: many(businesses),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(articles),
}));

export const authorsRelations = relations(authors, ({ one, many }) => ({
  user: one(users, { fields: [authors.userId], references: [users.id] }),
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  category: one(categories, { fields: [articles.categoryId], references: [categories.id] }),
  author: one(authors, { fields: [articles.authorId], references: [authors.id] }),
  location: one(locations, { fields: [articles.locationId], references: [locations.id] }),
  tags: many(articleTags),
  revisions: many(articleRevisions),
}));

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, { fields: [articleTags.articleId], references: [articles.id] }),
  tag: one(tags, { fields: [articleTags.tagId], references: [tags.id] }),
}));

export const articleRevisionsRelations = relations(articleRevisions, ({ one }) => ({
  article: one(articles, { fields: [articleRevisions.articleId], references: [articles.id] }),
}));

export const businessCategoriesRelations = relations(businessCategories, ({ one, many }) => ({
  parent: one(businessCategories, { fields: [businessCategories.parentId], references: [businessCategories.id], relationName: "bc_parent" }),
  children: many(businessCategories, { relationName: "bc_parent" }),
  businesses: many(businesses),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  primaryCategory: one(businessCategories, { fields: [businesses.primaryCategoryId], references: [businessCategories.id] }),
  city: one(locations, { fields: [businesses.cityId], references: [locations.id], relationName: "business_city" }),
  area: one(locations, { fields: [businesses.areaId], references: [locations.id], relationName: "business_area" }),
  owner: one(users, { fields: [businesses.ownerUserId], references: [users.id] }),
  categories: many(businessCategoryLinks),
  hours: many(businessHours),
  services: many(businessServices),
  photos: many(businessPhotos),
  reviews: many(businessReviews),
  claims: many(businessClaims),
  leads: many(businessLeads),
}));

export const businessCategoryLinksRelations = relations(businessCategoryLinks, ({ one }) => ({
  business: one(businesses, { fields: [businessCategoryLinks.businessId], references: [businesses.id] }),
  category: one(businessCategories, { fields: [businessCategoryLinks.categoryId], references: [businessCategories.id] }),
}));

export const businessHoursRelations = relations(businessHours, ({ one }) => ({
  business: one(businesses, { fields: [businessHours.businessId], references: [businesses.id] }),
}));
export const businessServicesRelations = relations(businessServices, ({ one }) => ({
  business: one(businesses, { fields: [businessServices.businessId], references: [businesses.id] }),
}));
export const businessPhotosRelations = relations(businessPhotos, ({ one }) => ({
  business: one(businesses, { fields: [businessPhotos.businessId], references: [businesses.id] }),
}));
export const businessReviewsRelations = relations(businessReviews, ({ one }) => ({
  business: one(businesses, { fields: [businessReviews.businessId], references: [businesses.id] }),
  user: one(users, { fields: [businessReviews.userId], references: [users.id] }),
}));
export const businessClaimsRelations = relations(businessClaims, ({ one }) => ({
  business: one(businesses, { fields: [businessClaims.businessId], references: [businesses.id] }),
  user: one(users, { fields: [businessClaims.userId], references: [users.id] }),
}));
export const businessLeadsRelations = relations(businessLeads, ({ one }) => ({
  business: one(businesses, { fields: [businessLeads.businessId], references: [businesses.id] }),
}));

export const entitiesRelations = relations(entities, ({ many }) => ({
  links: many(entityLinks),
}));
export const entityLinksRelations = relations(entityLinks, ({ one }) => ({
  entity: one(entities, { fields: [entityLinks.entityId], references: [entities.id] }),
}));

export const dataSeriesRelations = relations(dataSeries, ({ many }) => ({
  points: many(dataPoints),
}));
export const dataPointsRelations = relations(dataPoints, ({ one }) => ({
  series: one(dataSeries, { fields: [dataPoints.seriesId], references: [dataSeries.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  business: one(businesses, { fields: [orders.businessId], references: [businesses.id] }),
  professional: one(professionals, { fields: [orders.professionalId], references: [professionals.id] }),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  article: one(articles, { fields: [submissions.articleId], references: [articles.id] }),
  order: one(orders, { fields: [submissions.orderId], references: [orders.id] }),
}));

export const professionalsRelations = relations(professionals, ({ one, many }) => ({
  owner: one(users, { fields: [professionals.ownerUserId], references: [users.id] }),
  city: one(locations, { fields: [professionals.cityId], references: [locations.id], relationName: "professionalCity" }),
  area: one(locations, { fields: [professionals.areaId], references: [locations.id], relationName: "professionalArea" }),
  leads: many(professionalLeads),
}));
export const professionalLeadsRelations = relations(professionalLeads, ({ one }) => ({
  professional: one(professionals, { fields: [professionalLeads.professionalId], references: [professionals.id] }),
}));
