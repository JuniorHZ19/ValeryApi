/**
 * Versioned schema changes, applied in order and recorded in `schema_migrations`.
 * Never edit a migration that already ran in production: add a new one instead.
 * (Kept in TypeScript, not .sql files, so they are bundled into the Vercel functions.)
 */
export interface Migration {
  id: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: '001_initial_schema',
    sql: /* sql */ `
      -- Keeps updated_at current on every UPDATE.
      create or replace function set_updated_at() returns trigger
      language plpgsql as $$
      begin
        new.updated_at := now();
        return new;
      end;
      $$;

      -- Business information: exactly one row (id = 1).
      create table site_settings (
        id               smallint     primary key default 1 check (id = 1),
        name             varchar(80)  not null check (length(trim(name)) > 0),
        tagline          varchar(160) not null default '',
        whatsapp_number  varchar(15)  not null check (whatsapp_number ~ '^[0-9]{8,15}$'),
        whatsapp_display varchar(30)  not null,
        default_message  varchar(300) not null default '',
        facebook_url     varchar(500) not null default '',
        instagram_handle varchar(60)  not null default '',
        instagram_url    varchar(500) not null default '',
        location         varchar(120) not null default '',
        address          varchar(200) not null default '',
        logo_url         varchar(500) not null,
        hero_image_url   varchar(500) not null,
        updated_at       timestamptz  not null default now()
      );
      create trigger site_settings_updated_at before update on site_settings
        for each row execute function set_updated_at();

      -- Catalog.
      create table products (
        id          integer generated always as identity primary key,
        slug        varchar(140)  not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
        name        varchar(120)  not null check (length(trim(name)) >= 2),
        description varchar(2000) not null default '',
        image_url   varchar(500)  not null,
        image_alt   varchar(300)  not null default '',
        price       numeric(10, 2) check (price >= 0),          -- null = price on request
        size_info   varchar(200),
        is_visible  boolean       not null default true,
        sort_order  integer       not null default 0 check (sort_order between 0 and 10000),
        created_at  timestamptz   not null default now(),
        updated_at  timestamptz   not null default now()
      );
      -- Public catalog query: visible products in display order.
      create index products_catalog_idx on products (is_visible, sort_order, id);
      create trigger products_updated_at before update on products
        for each row execute function set_updated_at();

      -- Personalized details of a product ("Lentes dorados"...), in display order.
      create table product_details (
        product_id integer     not null references products (id) on delete cascade,
        position   smallint    not null check (position >= 0),
        text       varchar(80) not null check (length(trim(text)) > 0),
        primary key (product_id, position)
      );

      -- Home page blocks: highlights, order steps and occasions.
      create type content_section as enum ('highlight', 'step', 'occasion');
      create table content_items (
        id         integer generated always as identity primary key,
        section    content_section not null,
        icon       varchar(40)     not null,
        title      varchar(120)    not null,
        text       varchar(300)    not null default '',
        sort_order integer         not null default 0
      );
      create index content_items_section_idx on content_items (section, sort_order);
    `,
  },
];
