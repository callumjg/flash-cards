import fs from "fs";
import path from "path";
import client from "../../db";
import Resource from "../Resource";
import CardType from "../../../types/Card";
import TagType from "../../../types/Tag";
import {
  CardSchema,
  CardFindFilter,
  CardFindOptions
} from "../../Schemas/Card";
import NamedError from "../NamedError";
import { validateSchema, camelToSnake } from "../../../utils";

const insertSql = fs.readFileSync(path.join(__dirname, "insert.sql"), "utf8S");

export default class Card extends Resource {
  cardId?: number;
  tags?: TagType[];
  front: string;
  back: string;
  hint?: string;
  static schema = CardSchema;

  constructor(props: CardType) {
    super(props);
  }

  async _insert() {
    try {
      const { tags, front, back, hint } = this;
      await client.query("BEGIN");
      const { rows } = await client.query(insertSql, [
        front,
        back,
        hint,
        tags.map(t => t.tag)
      ]);
      await client.query("COMMIT");
      this.cardId = rows[0].cardId;
      this.tags = rows[0].tags;
      return this;
    } catch (e) {
      console.log(e);
      await client.query("ROLLBACK");
      throw e;
    }
  }

  async _put() {
    try {
      await client.query("BEGIN");
      const { tags, front, back, hint, cardId } = this;
      const cardUpdateQuery = await client.query(
        `
        UPDATE cards
        SET
          front = $1,
          back = $2,
          hint = $3
        WHERE card_id = $4
      `,
        [front, back, hint, cardId]
      );
      if (!cardUpdateQuery.rowCount) throw new Error("Something went wrong");

      const tagQueries = tags.map(async ({ tag }) => {
        const { rowCount } = await client.query(
          `
            WITH st AS (
              SELECT tag_id FROM tags WHERE tag = $1
            ), it AS (
              INSERT INTO tags(tag)
              SELECT $1
              WHERE NOT EXISTS (SELECT 1 FROM st)
              RETURNING tag_id
            ), tid AS (
              SELECT tag_id
              FROM it UNION SELECT tag_id FROM st
            ), sct AS (
              SELECT ct.card_id, ct.tag_id FROM card_tags ct, tid
              WHERE card_id = $2 AND ct.tag_id = tid.tag_id
            ), ict AS (
              INSERT INTO card_tags (card_id, tag_id)
              SELECT $2, tid.tag_id
              FROM tid
              WHERE NOT EXISTS (SELECT 1 FROM sct)
              RETURNING card_id, tag_id
            )
            SELECT * FROM sct UNION ALL SELECT * FROM ict
          `,
          [tag, cardId]
        );
        if (!rowCount) throw new NamedError("Server", "Something went wrong");
      });
      await client.query(
        `
        WITH ts AS (
          SELECT UNNEST ($1::text[]) AS tag
        ), tids AS (
        SELECT tag_id FROM ts JOIN tags ON tags.tag = ts.tag
        )
        DELETE FROM card_tags ct USING 
          card_tags ct2
          left join tids on tids.tag_id = ct2.tag_id 
        WHERE 
          tids.tag_id IS NULL
          AND ct.tag_id = ct2.tag_id
          AND ct.card_id = $2

        `,
        [tags.map(t => t.tag), cardId]
      );
      await Promise.all(tagQueries);
      await client.query("COMMIT");

      return this;
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(e);
      throw e;
    }
  }

  static async findById(id) {
    id = parseInt(id);
    const cards = await client.query(
      `
        with json_tags as (
          select x."tagId",	row_to_json(x)as tag
          from (select tag_id "tagId", tag from tags) x
        ), 
        tag_arrays as (
          select ct.card_id, array_agg(jt.tag) as tags
            from card_tags ct inner join json_tags jt on ct.tag_id = jt."tagId"
            group by ct.card_id 
        )
        select c.card_id "cardId", c.front, c.back, c.hint, COALESCE(ta.tags, ARRAY[]::json[]) tags
        from cards c left join tag_arrays ta on ta.card_id = c.card_id
        where c.card_id = $1
        limit 1
      `,
      [id]
    );
    const card = cards.rows[0];
    if (!card)
      throw new NamedError("NotFound", `Unable to find card with id of ${id}`);
    return new Card(card);
  }

  static async find(filter, options?) {
    filter = validateSchema(filter, CardFindFilter, { presence: "optional" });

    if (filter.errors)
      throw new NamedError(
        "Client",
        "Unable to validate find filter",
        filter.errors
      );

    options = validateSchema(options || {}, CardFindOptions, {
      presence: "optional"
    });

    if (options.errors)
      throw new NamedError(
        "Client",
        "Unable to validate find options",
        options.errors
      );

    const conditions = Object.keys(filter.value).length
      ? "WHERE " +
        Object.keys(filter.value)
          .map((key, i) => `c.${camelToSnake(key)} = $${i + 5}`)
          .join(" AND ")
      : "";

    const { rows } = await client.query(
      `
        with json_tags as (
          select x."tagId",	row_to_json(x)as tag
          from (select tag_id "tagId", tag from tags) x
        ),   
        required_tags as (
          select tags.tag_id
          from (select unnest($1::text[]) as tag) as t(tag) 
          inner join tags on tags.tag = t.tag
        ),
        excluded_tags as (
          select tags.tag_id 
          from (select unnest($2::text[]) as tag) as t(tag) 
          inner join tags on tags.tag = t.tag
        ),
        filtered_cards as (
          select 
            ct.card_id,
            array_agg(jt.tag) as tags
          from 
            card_tags ct
            join json_tags jt on ct.tag_id = jt."tagId"
            left join excluded_tags et on ct.tag_id = et.tag_id
            left join required_tags rt on ct.tag_id = rt.tag_id
          group by ct.card_id 
          having
            count(et.tag_id) = 0
            and count(rt.tag_id) = cardinality($1)
        )
        select 
        c.card_id "cardId", 
          c.front, 
          c.back, 
          c.hint, 
           fc.tags
          from 
        filtered_cards fc
          inner join cards c on fc.card_id = c.card_id
        ${conditions}
        order by c.card_id
        limit $3
        offset $4
      `,
      [
        options.value.tagsAll || [],
        options.value.tagsNone || [],
        options.value.limit,
        options.value.offset,
        ...Object.values(filter.value)
      ]
    );
    return rows.map(c => new Card(c));
  }

  async delete() {
    const { rowCount } = await client.query(
      `
        DELETE FROM cards
        WHERE card_id = $1
      `,
      [this.cardId]
    );
    if (!rowCount) throw new NamedError("Server", "Something went wrong");
    return rowCount;
  }
}