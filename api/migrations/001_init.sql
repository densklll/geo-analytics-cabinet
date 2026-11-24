-- Базовая схема кабинета: компании, филиалы, пользователи, метрики, отзывы.

CREATE TABLE companies (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  address     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX branches_company_id_idx ON branches (company_id);

CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  company_id     INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- клиент без компании не должен существовать даже теоретически
  CONSTRAINT users_client_has_company CHECK (role = 'admin' OR company_id IS NOT NULL)
);

-- Одна строка = один филиал за один день. Уникальный ключ нужен,
-- чтобы повторная загрузка статистики делала upsert, а не дубли.
CREATE TABLE daily_metrics (
  id              BIGSERIAL PRIMARY KEY,
  branch_id       INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  views           INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  website_clicks  INTEGER NOT NULL DEFAULT 0 CHECK (website_clicks >= 0),
  calls           INTEGER NOT NULL DEFAULT 0 CHECK (calls >= 0),
  routes          INTEGER NOT NULL DEFAULT 0 CHECK (routes >= 0),
  CONSTRAINT daily_metrics_branch_date_uq UNIQUE (branch_id, date)
);

CREATE TABLE reviews (
  id            BIGSERIAL PRIMARY KEY,
  branch_id     INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  source        TEXT NOT NULL CHECK (source IN ('yandex', '2gis', 'google')),
  author_name   TEXT NOT NULL,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text          TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  published_at  TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reviews_branch_published_idx ON reviews (branch_id, published_at DESC);
CREATE INDEX reviews_branch_status_idx ON reviews (branch_id, status);
