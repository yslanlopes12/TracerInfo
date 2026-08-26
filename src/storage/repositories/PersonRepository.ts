import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Db } from '../database.js';
import {
  persons,
  identifiers,
  type NewPerson,
  type NewIdentifier,
  type Person,
  type Identifier,
} from '../schema.js';

// ─── PersonRepository ─────────────────────────────────────────────────────────

export class PersonRepository {
  constructor(private readonly db: Db) {}

  /** Creates a new person record and returns it. */
  async create(name: string): Promise<Person> {
    const id = randomUUID();
    const newPerson: NewPerson = { id, name };

    await this.db.insert(persons).values(newPerson);

    const [created] = await this.db
      .select()
      .from(persons)
      .where(eq(persons.id, id))
      .limit(1);

    if (!created) {
      throw new Error(`Failed to create person with name "${name}"`);
    }

    return created;
  }

  /** Finds a person by their ID. */
  async findById(personId: string): Promise<Person | null> {
    const [person] = await this.db
      .select()
      .from(persons)
      .where(eq(persons.id, personId))
      .limit(1);

    return person ?? null;
  }

  /** Retrieves all identifiers associated with a person. */
  async getIdentifiers(personId: string): Promise<Identifier[]> {
    return this.db
      .select()
      .from(identifiers)
      .where(eq(identifiers.personId, personId));
  }

  /** Adds an identifier to a person with a confidence score. */
  async addIdentifier(
    personId: string,
    type: Identifier['type'],
    value: string,
    confidence: number,
  ): Promise<Identifier> {
    const id = randomUUID();

    const newIdentifier: NewIdentifier = {
      id,
      personId,
      type,
      value,
      confidence,
    };

    await this.db.insert(identifiers).values(newIdentifier);

    const [created] = await this.db
      .select()
      .from(identifiers)
      .where(eq(identifiers.id, id))
      .limit(1);

    if (!created) {
      throw new Error(`Failed to create identifier for person ${personId}`);
    }

    return created;
  }
}
