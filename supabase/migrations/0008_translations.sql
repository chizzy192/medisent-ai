-- Medisent AI — translation cache for spoken text (speech fix, 2026-11-19).
-- Every sentence sent to text-to-speech must already be in the target language; English
-- fragments (e.g. a dose like "1 capsule") are translated once through Spitch and kept here.

create table if not exists translations (
  key text primary key,
  source_lang language_t not null,
  target_lang language_t not null,
  source_text text not null,
  text text not null,
  provider text not null default 'spitch',
  created_at timestamptz not null default now()
);
alter table translations enable row level security;
grant all on translations to service_role;
-- No browser policies: only server code reads and writes translations.

-- Old audio clips were made with other voices / language codes: start the cache again.
delete from audio_cache;
