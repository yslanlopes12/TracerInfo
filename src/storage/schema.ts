import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── persons ─────────────────────────────────────────────────────────────────

export const persons = sqliteTable('persons', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── identifiers ──────────────────────────────────────────────────────────────

export const identifiers = sqliteTable('identifiers', {
  id: text('id').primaryKey(),
  personId: text('person_id')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // username | email | domain | phone | name_variant | social_profile
  value: text('value').notNull(),
  /** Confidence that this identifier belongs to the person (0-1). */
  confidence: real('confidence').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── searches ─────────────────────────────────────────────────────────────────

export const searches = sqliteTable('searches', {
  id: text('id').primaryKey(),
  query: text('query').notNull(),
  queryType: text('query_type').notNull(), // person | username | email | domain | generic
  personId: text('person_id'),
  resultCount: integer('result_count').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── search_results ───────────────────────────────────────────────────────────

export const searchResults = sqliteTable('search_results', {
  id: text('id').primaryKey(),
  searchId: text('search_id')
    .notNull()
    .references(() => searches.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  urlHash: text('url_hash').notNull(),
  description: text('description'),
  source: text('source').notNull(),
  sourceType: text('source_type').notNull(), // web | news | document | ...
  publishedAt: text('published_at'),
  collectedAt: text('collected_at').notNull(),
  excerpt: text('excerpt'),
  entities: text('entities').notNull().default('[]'), // JSON string
  confidence: real('confidence').notNull().default(0),
});

// ─── evidence ─────────────────────────────────────────────────────────────────

export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(),
  personId: text('person_id'),
  searchResultId: text('search_result_id'),
  claim: text('claim').notNull(),
  confidence: real('confidence').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── relationships ────────────────────────────────────────────────────────────

export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull(),
  type: text('type').notNull(),
  value: text('value').notNull(),
  confidence: real('confidence').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;
export type Search = typeof searches.$inferSelect;
export type NewSearch = typeof searches.$inferInsert;
export type SearchResultRow = typeof searchResults.$inferSelect;
export type NewSearchResultRow = typeof searchResults.$inferInsert;
export type Identifier = typeof identifiers.$inferSelect;
export type NewIdentifier = typeof identifiers.$inferInsert;
