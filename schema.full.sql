--
-- PostgreSQL database dump
--

\restrict mja3TkTxfqU2vA664fM067lj53TcllhqPdqfQONqblFk6ZfbVMqeRvzzF0tFO5W

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: users_role_immutable_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.users_role_immutable_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role is immutable after registration'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ad_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_name text NOT NULL,
    contact_email text NOT NULL,
    image_url text NOT NULL,
    target_url text NOT NULL,
    target_city_id text,
    target_category text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    amount_cents bigint NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    impressions_count bigint DEFAULT 0 NOT NULL,
    clicks_count bigint DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ad_campaigns_amount_cents_check CHECK ((amount_cents > 0)),
    CONSTRAINT ad_campaigns_dates_valid CHECK ((ends_at > starts_at)),
    CONSTRAINT ad_campaigns_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'expired'::text, 'pending_payment'::text])))
);


--
-- Name: TABLE ad_campaigns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ad_campaigns IS 'External brand campaigns (Coca-Cola, banks, etc.) shown as cards in /mapa + /vendors';


--
-- Name: ads; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ads AS
 SELECT id,
    brand_name,
    image_url,
    target_url,
    (status = 'active'::text) AS is_active,
    starts_at,
    ends_at,
    0 AS priority,
    created_at
   FROM public.ad_campaigns;


--
-- Name: VIEW ads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.ads IS 'Public read shape for external brand campaigns. Backed by ad_campaigns. Does NOT expose contact_email, amount_cents, or created_by — those are admin-only. Window filtering (is_active + starts_at/ends_at) happens in the listing query; this view exposes all rows so admin tooling can still see paused/expired ones.';


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id text NOT NULL,
    label text NOT NULL,
    icon text
);


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id text NOT NULL,
    name text NOT NULL,
    department text NOT NULL,
    center_lat double precision NOT NULL,
    center_lng double precision NOT NULL,
    timezone text DEFAULT 'America/Bogota'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: consent_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consent_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email character varying(255),
    consent_type character varying(50) NOT NULL,
    policy_version character varying(20) NOT NULL,
    granted boolean NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verification_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE email_verification_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email_verification_tokens IS 'One-time email verification tokens. We store the SHA-256 hash of the
  token, never the plaintext, so a DB dump alone can''t be used to verify
  arbitrary emails. The plaintext token only lives in the email the user
  receives, once.';


--
-- Name: COLUMN email_verification_tokens.token_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_verification_tokens.token_hash IS 'SHA-256 of the token (base64url). The plaintext is only sent to the
  user''s email and is never stored.';


--
-- Name: COLUMN email_verification_tokens.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_verification_tokens.expires_at IS 'Tokens expire 24 hours after creation. The /api/auth/verify-email
  endpoint returns 410 Gone for expired tokens.';


--
-- Name: COLUMN email_verification_tokens.used_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_verification_tokens.used_at IS 'Set when the token is consumed. NULL means the token is still active
  (or expired, depending on expires_at).';


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: job_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_runs (
    id bigint NOT NULL,
    job_name text NOT NULL,
    payload jsonb,
    ran_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: job_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_runs_id_seq OWNED BY public.job_runs.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    filename text NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    quantity integer DEFAULT 1,
    price numeric(10,2) NOT NULL,
    CONSTRAINT order_items_price_positive CHECK (((price > (0)::numeric) AND (price <= 99999999.99))),
    CONSTRAINT order_items_quantity_range CHECK (((quantity >= 1) AND (quantity <= 999)))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    total numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'ready'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    url text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT product_photos_position_range CHECK ((("position" >= 0) AND ("position" <= 999))),
    CONSTRAINT product_photos_url_format CHECK ((((length(url) >= 1) AND (length(url) <= 2048)) AND (url ~ '^(https?://[^\s]+|/products/[^\s]+|/storage/[^\s]+)$'::text)))
);


--
-- Name: TABLE product_photos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_photos IS 'Multiple photos per product. First by position is primary.';


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    photo_url text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT products_description_length CHECK (((description IS NULL) OR (length(description) <= 5000))),
    CONSTRAINT products_name_length CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 200))),
    CONSTRAINT products_photo_url_format CHECK (((photo_url IS NULL) OR (photo_url ~ '^(https?://[^\s]+|/products/[^\s]+|/storage/[^\s]+)$'::text))),
    CONSTRAINT products_price_positive CHECK (((price > (0)::numeric) AND (price <= 99999999.99)))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text,
    name text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    token_version integer DEFAULT 1 NOT NULL,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['buyer'::text, 'seller'::text])))
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: rate_limit_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limit_attempts (
    id bigint NOT NULL,
    ip text NOT NULL,
    bucket text NOT NULL,
    attempted_at timestamp with time zone DEFAULT now()
);


--
-- Name: rate_limit_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rate_limit_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rate_limit_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rate_limit_attempts_id_seq OWNED BY public.rate_limit_attempts.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    author_name text NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT reviews_author_name_length_check CHECK (((length(btrim(author_name)) >= 1) AND (length(btrim(author_name)) <= 100))),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: sponsorships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsorships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    plan text NOT NULL,
    amount_cents bigint NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    wompi_reference text,
    payment_method text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    CONSTRAINT sponsorships_amount_cents_check CHECK ((amount_cents > 0)),
    CONSTRAINT sponsorships_dates_valid CHECK ((ends_at > starts_at)),
    CONSTRAINT sponsorships_plan_check CHECK ((plan = ANY (ARRAY['semanal'::text, 'mensual'::text]))),
    CONSTRAINT sponsorships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text, 'pending_payment'::text])))
);


--
-- Name: TABLE sponsorships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sponsorships IS 'Vendor self-paid promotion: aparece primero en /mapa y /vendors durante la ventana';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    password_hash text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    phone text,
    city_id text,
    is_active boolean DEFAULT true NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verified_at timestamp with time zone,
    CONSTRAINT users_email_or_phone_required CHECK (((email IS NOT NULL) OR (phone IS NOT NULL))),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['buyer'::text, 'seller'::text])))
);


--
-- Name: COLUMN users.email_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email_verified IS 'True once the user has clicked the verification link in their email.
  Required to be true for: POST /api/vendors, POST /api/reviews,
  POST /api/contact. Soft-blocked (banner) for everything else.';


--
-- Name: COLUMN users.email_verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email_verified_at IS 'Audit trail of when the user verified their email. NULL until verified.';


--
-- Name: vendor_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    buyer_id uuid,
    contact_type character varying(20) NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_contacts_contact_type_check CHECK (((contact_type)::text = ANY ((ARRAY['call'::character varying, 'whatsapp'::character varying, 'directions'::character varying])::text[])))
);


--
-- Name: vendor_location_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_location_history (
    id bigint NOT NULL,
    vendor_id uuid NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_location_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_location_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_location_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_location_history_id_seq OWNED BY public.vendor_location_history.id;


--
-- Name: vendor_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_views (
    id integer NOT NULL,
    vendor_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    user_ip text
);


--
-- Name: vendor_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_views_id_seq OWNED BY public.vendor_views.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    name text NOT NULL,
    description text,
    category text,
    latitude double precision,
    longitude double precision,
    is_active boolean DEFAULT true,
    rating numeric(2,1) DEFAULT 0,
    review_count integer DEFAULT 0,
    photo_url text,
    created_at timestamp with time zone DEFAULT now(),
    phone text,
    city_id text,
    is_verified boolean DEFAULT false,
    location_updated_at timestamp with time zone,
    vehicle_type text,
    vehicle_photo_url text,
    slug text,
    business_hours_enabled boolean DEFAULT false,
    business_hours_start time without time zone,
    business_hours_end time without time zone,
    business_days text[] DEFAULT ARRAY['mon'::text, 'tue'::text, 'wed'::text, 'thu'::text, 'fri'::text, 'sat'::text, 'sun'::text],
    station_type text,
    geo_mode character varying(20) DEFAULT 'precise'::character varying NOT NULL,
    geo_zone_lat double precision,
    geo_zone_lng double precision,
    geo_zone_radius_m integer,
    CONSTRAINT vendors_category_check CHECK (((category IS NOT NULL) AND (category = ANY (ARRAY['frutas'::text, 'comida'::text, 'bebidas'::text, 'artesanias'::text, 'ropa'::text, 'otros'::text])))),
    CONSTRAINT vendors_city_id_check CHECK (((city_id IS NOT NULL) AND (city_id = ANY (ARRAY['bogota'::text, 'medellin'::text, 'cali'::text, 'barranquilla'::text, 'cartagena'::text, 'bucaramanga'::text, 'cucuta'::text, 'pereira'::text, 'ibague'::text, 'manizales'::text, 'santa-marta'::text, 'villavicencio'::text, 'pasto'::text, 'neiva'::text, 'armenia'::text, 'sincelejo'::text, 'tunja'::text, 'riohacha'::text])))),
    CONSTRAINT vendors_geo_mode_check CHECK (((geo_mode)::text = ANY ((ARRAY['precise'::character varying, 'battery'::character varying])::text[]))),
    CONSTRAINT vendors_geo_zone_radius_m_check CHECK (((geo_zone_radius_m IS NULL) OR ((geo_zone_radius_m >= 100) AND (geo_zone_radius_m <= 5000)))),
    CONSTRAINT vendors_station_type_check CHECK (((station_type IS NULL) OR (station_type = ANY (ARRAY['fixed'::text, 'mobile'::text])))),
    CONSTRAINT vendors_vehicle_type_check CHECK ((vehicle_type = ANY (ARRAY['bicicleta'::text, 'moto'::text, 'carro'::text, 'pie'::text, 'triciclo'::text, 'otro'::text])))
);


--
-- Name: COLUMN vendors.vehicle_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.vehicle_type IS 'How the vendor moves around — used for filtering and "advertise on carts" feature';


--
-- Name: COLUMN vendors.vehicle_photo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.vehicle_photo_url IS 'Photo of the cart/vehicle shown to buyers for trust';


--
-- Name: COLUMN vendors.business_hours_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.business_hours_enabled IS 'When true, vendor auto-toggles is_active based on hours/days';


--
-- Name: COLUMN vendors.business_hours_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.business_hours_start IS 'Start of business hours (local time)';


--
-- Name: COLUMN vendors.business_hours_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.business_hours_end IS 'End of business hours (local time). NULL = 24h.';


--
-- Name: COLUMN vendors.business_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.business_days IS 'Days of week: mon, tue, wed, thu, fri, sat, sun';


--
-- Name: COLUMN vendors.station_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.station_type IS 'fixed = always in the same spot. mobile = moves around the city. NULL allowed but discouraged.';


--
-- Name: COLUMN vendors.geo_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.geo_mode IS 'precise = push GPS every 10s. battery = push only when leaving a saved zone.';


--
-- Name: COLUMN vendors.geo_zone_lat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.geo_zone_lat IS 'When geo_mode=battery: last known center of the vendor''s circle (server-side, updated when the vendor crosses the boundary).';


--
-- Name: COLUMN vendors.geo_zone_lng; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.geo_zone_lng IS 'When geo_mode=battery: longitude counterpart of geo_zone_lat.';


--
-- Name: COLUMN vendors.geo_zone_radius_m; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.geo_zone_radius_m IS 'When geo_mode=battery: radius in meters around geo_zone_lat/geo_zone_lng. Constrained 100..5000.';


--
-- Name: vendors_with_sponsorship; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vendors_with_sponsorship AS
 SELECT id,
    profile_id,
    name,
    description,
    category,
    latitude,
    longitude,
    is_active,
    rating,
    review_count,
    photo_url,
    created_at,
    phone,
    city_id,
    is_verified,
    location_updated_at,
    vehicle_type,
    vehicle_photo_url,
    slug,
    station_type,
    business_hours_enabled,
    business_hours_start,
    business_hours_end,
    business_days,
    (EXISTS ( SELECT 1
           FROM public.sponsorships s
          WHERE ((s.vendor_id = v.id) AND (s.status = 'active'::text) AND (now() >= s.starts_at) AND (now() <= s.ends_at)))) AS is_sponsored,
    COALESCE(( SELECT max(s.ends_at) AS max
           FROM public.sponsorships s
          WHERE ((s.vendor_id = v.id) AND (s.status = 'active'::text))), NULL::timestamp with time zone) AS sponsored_until
   FROM public.vendors v;


--
-- Name: job_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_runs ALTER COLUMN id SET DEFAULT nextval('public.job_runs_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: rate_limit_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_attempts ALTER COLUMN id SET DEFAULT nextval('public.rate_limit_attempts_id_seq'::regclass);


--
-- Name: vendor_location_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_location_history ALTER COLUMN id SET DEFAULT nextval('public.vendor_location_history_id_seq'::regclass);


--
-- Name: vendor_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_views ALTER COLUMN id SET DEFAULT nextval('public.vendor_views_id_seq'::regclass);


--
-- Data for Name: ad_campaigns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ad_campaigns (id, brand_name, contact_email, image_url, target_url, target_city_id, target_category, starts_at, ends_at, amount_cents, status, impressions_count, clicks_count, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, label, icon) FROM stdin;
frutas	Frutas	apple
comida	Comida	utensils
bebidas	Bebidas	cup-soda
artesanias	Artesanías	palette
ropa	Ropa	shirt
otros	Otros	package
\.


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cities (id, name, department, center_lat, center_lng, timezone, created_at) FROM stdin;
bogota	Bogotá	Cundinamarca	4.6097	-74.0817	America/Bogota	2026-07-18 21:52:37.20599-05
medellin	Medellín	Antioquia	6.2476	-75.5658	America/Bogota	2026-07-18 21:52:37.20599-05
cali	Cali	Valle del Cauca	3.4516	-76.532	America/Bogota	2026-07-18 21:52:37.20599-05
barranquilla	Barranquilla	Atlántico	10.9685	-74.7813	America/Bogota	2026-07-18 21:52:37.20599-05
cartagena	Cartagena	Bolívar	10.391	-75.4794	America/Bogota	2026-07-18 21:52:37.20599-05
bucaramanga	Bucaramanga	Santander	7.1193	-73.1227	America/Bogota	2026-07-18 21:52:37.20599-05
cucuta	Cúcuta	Norte de Santander	7.889	-72.4947	America/Bogota	2026-07-18 21:52:37.20599-05
pereira	Pereira	Risaralda	4.8133	-75.6961	America/Bogota	2026-07-18 21:52:37.20599-05
ibague	Ibagué	Tolima	4.4389	-75.2324	America/Bogota	2026-07-18 21:52:37.20599-05
manizales	Manizales	Caldas	5.0689	-75.5174	America/Bogota	2026-07-18 21:52:37.20599-05
santa-marta	Santa Marta	Magdalena	11.2408	-74.2099	America/Bogota	2026-07-18 21:52:37.20599-05
villavicencio	Villavicencio	Meta	4.142	-73.6347	America/Bogota	2026-07-18 21:52:37.20599-05
pasto	Pasto	Nariño	1.2051	-77.2666	America/Bogota	2026-07-18 21:52:37.20599-05
neiva	Neiva	Huila	2.5273	-75.2879	America/Bogota	2026-07-18 21:52:37.20599-05
armenia	Armenia	Quindío	4.5333	-75.6833	America/Bogota	2026-07-18 21:52:37.20599-05
sincelejo	Sincelejo	Sucre	9.3047	-75.3978	America/Bogota	2026-07-18 21:52:37.20599-05
tunja	Tunja	Boyacá	5.5353	-73.3678	America/Bogota	2026-07-18 21:52:37.20599-05
riohacha	Riohacha	La Guajira	11.5447	-72.9072	America/Bogota	2026-07-18 21:52:37.20599-05
\.


--
-- Data for Name: consent_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consent_logs (id, user_id, email, consent_type, policy_version, granted, ip_address, user_agent, created_at) FROM stdin;
35dd21bf-fc61-4ae3-ad1b-63a856ed40cc	3c681d60-2b25-4147-8f1d-6a1194aa6b49	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 14:43:47.910749-05
678a80e1-9f51-4e23-ae7c-57b58e8d1c31	3c681d60-2b25-4147-8f1d-6a1194aa6b49	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 14:43:47.910749-05
bd1c3c3d-c408-476a-9f8d-a42b8a1fda27	619a6a94-db26-4d63-ab74-f911e42ec8f2	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:08.058524-05
c7fad817-d441-48f7-a867-e4b3752d5491	619a6a94-db26-4d63-ab74-f911e42ec8f2	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:08.058524-05
6b1d1d71-4e52-4e9c-ae1b-b2ffcfe83e0d	db76b6ef-60c8-408f-8913-eeca2c632c4c	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:08.533986-05
2f7eb33e-4b96-4974-bc9a-8e8359adcf2e	db76b6ef-60c8-408f-8913-eeca2c632c4c	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:08.533986-05
3f37d627-2925-4d55-b117-93c9a3511b30	afc020d6-8c62-441a-a43e-9526018e082e	\N	terms	v1.0	t	190.99.245.173	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-30 19:45:23.145762-05
ab5de179-0a2b-4b24-b1a8-2f03221f34ec	afc020d6-8c62-441a-a43e-9526018e082e	\N	privacy	v1.0	t	190.99.245.173	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-30 19:45:23.145762-05
0b643277-88ca-4ed2-92b8-e4486475d702	4eac9150-630c-4a23-9b4e-5242cad757b9	\N	terms	v1.0	t	202.153.81.184	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36	2026-07-10 10:40:19.647158-05
fd185155-06ba-417e-b0a7-776abbc09bcc	4eac9150-630c-4a23-9b4e-5242cad757b9	\N	privacy	v1.0	t	202.153.81.184	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36	2026-07-10 10:40:19.647158-05
cd6d3190-8596-44ee-b5db-a2ad54b84e2d	a622af45-c55e-4c1f-bca3-f729883bc984	\N	terms	v1.0	t	181.62.52.246	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36	2026-07-10 10:40:44.336883-05
98ed114c-124e-455a-9033-8d3cf7cb2532	a622af45-c55e-4c1f-bca3-f729883bc984	\N	privacy	v1.0	t	181.62.52.246	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36	2026-07-10 10:40:44.336883-05
3c014ae0-dc8b-4109-a7cf-32fd714c3a0c	67f78921-de4f-45b4-905c-a833ecc3d715	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:05.552498-05
a8378744-9f8c-4572-8024-0aebcfd80ac0	67f78921-de4f-45b4-905c-a833ecc3d715	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:05.552498-05
627f9c41-7047-440a-b7c1-9738d35efbab	246ac81d-a5fe-4aed-8c0b-db263eba6bed	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:06.441783-05
2e83a3e0-7183-454f-b6de-f2324296c9b7	246ac81d-a5fe-4aed-8c0b-db263eba6bed	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:06.441783-05
4a9bedbb-d970-4101-a948-a7bca9bb6adc	71102347-c89a-48f4-83fb-a891d87808be	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:07.157809-05
606eb255-3733-493e-b6c1-520e15ed00bc	71102347-c89a-48f4-83fb-a891d87808be	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:07.157809-05
e9ee704a-d70b-46ca-9fac-0cb6e8df34ba	131ae702-005b-47da-957a-4e21aa4d72ac	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:08.063095-05
094712cd-aebc-494e-8ec7-9ec9c5242e9f	131ae702-005b-47da-957a-4e21aa4d72ac	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:08.063095-05
9f6b9f18-f217-41cc-a7b6-655a1c911d54	72c74745-543f-433e-9fda-986a9edcfb7c	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:08.788051-05
3173f222-8099-4cb9-b36d-6728e598d3bd	72c74745-543f-433e-9fda-986a9edcfb7c	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:08.788051-05
81e3543f-4cb3-4402-a1b6-63860691811d	0374ffe5-3825-4d62-93cd-6c42d05fa284	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:09.370921-05
5a140290-c100-42c9-8989-a0f3d1cdff66	0374ffe5-3825-4d62-93cd-6c42d05fa284	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:09.370921-05
270367fd-21f2-4640-9016-c2609226c253	dfd85356-3161-4c65-bf07-5f83ec3c0a15	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:09.921607-05
1c802b6a-b548-427d-8c7c-1f0b1db749a3	dfd85356-3161-4c65-bf07-5f83ec3c0a15	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:09.921607-05
9fba92be-5355-4972-a829-8f1787e4aaf9	494111a5-7c49-4bac-8f6a-b7c633c399c2	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:10.575064-05
7e04a885-8aed-4ce7-a430-8db84df895a9	494111a5-7c49-4bac-8f6a-b7c633c399c2	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:10.575064-05
a8b805fc-1fc4-44fd-b306-cd6190d4fffd	1d915986-e4b2-4131-b33d-3110330f9eff	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:11.296654-05
d32174a1-c6e9-4803-b87f-d926e23cd43d	1d915986-e4b2-4131-b33d-3110330f9eff	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:11.296654-05
cb108f5a-fe3c-4a7a-8e6a-6c2ed7eeede5	8d454b84-5ba8-4e43-b62f-941f9beb4d21	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:11.901162-05
6ce861a9-9e33-47ef-81fc-7341c5bc6f89	8d454b84-5ba8-4e43-b62f-941f9beb4d21	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:11.901162-05
c2187081-9ffe-4ec6-8f5b-e16a29ee464e	9d87eaf2-bf9c-4a44-9972-a562da16a1dd	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:12.589066-05
081332ac-c7ed-4c2a-9d45-458a3c48bd2f	9d87eaf2-bf9c-4a44-9972-a562da16a1dd	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:12.589066-05
40392ef0-3b57-4fd5-83ae-e05ad141cabd	967f61c7-61a6-494e-b1d5-96606a384aff	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:13.105344-05
a8174323-d274-453c-81bc-c8a09aef9bc9	967f61c7-61a6-494e-b1d5-96606a384aff	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:13.105344-05
5fd68dfd-6e19-4bd2-89f0-e159348e1d75	908a0ea2-46a2-4e21-bc0e-7e1a7d62278c	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:13.704356-05
61354bb5-1226-4f0a-a44f-b3d77ba4fcb1	908a0ea2-46a2-4e21-bc0e-7e1a7d62278c	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:13.704356-05
7914c50c-df90-4453-b8fc-5ac5ca459a34	7d55d91e-d178-4153-b7ce-bb51827e5ef6	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:14.307245-05
34d53602-d367-40d9-ad56-02e039ab953e	7d55d91e-d178-4153-b7ce-bb51827e5ef6	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:14.307245-05
e68dc54b-2ad5-44b2-b778-e1fe1e168ac2	681da818-7529-4b68-9089-94f842d8ab5f	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:14.942704-05
5b297e28-0cdb-4a49-b888-d816f38958b0	681da818-7529-4b68-9089-94f842d8ab5f	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:14.942704-05
8dc40bbd-d34c-4af4-8c68-8e601e6cbcaa	9daafc49-876a-4309-ad8f-3424b667f252	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:15.706838-05
5f46764d-4ce2-4b15-94f9-0954f685035e	9daafc49-876a-4309-ad8f-3424b667f252	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:15.706838-05
9a880d47-b7ee-444b-9cf2-c47710e07991	f0e6c31f-30fe-428c-8ea0-a34cc50ed9ae	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:16.487686-05
94551cd7-a7a0-4d35-bf5e-7d97661727fa	f0e6c31f-30fe-428c-8ea0-a34cc50ed9ae	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:16.487686-05
8651376b-1d38-4b7c-9ba7-f968e4e6ea9b	8e43f2ab-3387-4e3e-ab39-92be26aa76a9	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:17.466539-05
d82c9172-dc02-4f7c-bb56-1495cc925e18	8e43f2ab-3387-4e3e-ab39-92be26aa76a9	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:17.466539-05
d9733d40-e118-4de9-b736-a21f615dabbf	3c767cbc-3b49-475b-a601-fb5010014da5	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 15:36:09.276513-05
b066fffc-8cef-4bd8-8a20-b8b3b6ff9f18	3c767cbc-3b49-475b-a601-fb5010014da5	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 15:36:09.276513-05
6d6ff2c1-76c8-472d-81c8-605a67571f24	6c94486c-bd78-4e0e-968a-6c794d1018eb	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 15:36:09.87422-05
31748364-25f9-4a9a-a296-652081210736	6c94486c-bd78-4e0e-968a-6c794d1018eb	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 15:36:09.87422-05
f00da748-8a42-44cb-8dab-6308f79315e6	80e7329c-401c-4689-b8da-79863918ac32	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 15:36:11.572891-05
6832462d-18bd-43e3-a4ea-f4840deec61c	80e7329c-401c-4689-b8da-79863918ac32	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 15:36:11.572891-05
134669f2-ceaa-4cc0-a4fb-be006a05c93c	8f78c772-db6b-431f-aaa0-e71465893376	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:18.07614-05
a7418bf1-b492-42bd-8797-dabf4b91b3cf	8f78c772-db6b-431f-aaa0-e71465893376	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:18.07614-05
3bf7c445-9743-4b78-8abf-652dc574ee30	4b89580c-6385-4d56-b032-c8d5ca571311	\N	terms	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:18.603328-05
0a6666bf-bda3-45d7-bcfd-6220c98a036c	4b89580c-6385-4d56-b032-c8d5ca571311	\N	privacy	v1.0	t	127.0.0.1	curl/8.5.0	2026-07-22 15:00:18.603328-05
b36a1a26-899c-4e80-85ee-c76da153aa81	a689b55b-f1f5-4b3a-b527-07f115223a3c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 15:36:25.433835-05
fa2d19b7-93d7-4462-8977-ba1041da4523	a689b55b-f1f5-4b3a-b527-07f115223a3c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 15:36:25.433835-05
99ab3de2-e786-456b-a49b-0e2ef2d8dfc8	014c0fff-ecca-4eed-bd53-c83dc0f5a6f6	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 15:36:26.000761-05
a10c27f9-c6b4-4ff0-8165-277e0587f1df	014c0fff-ecca-4eed-bd53-c83dc0f5a6f6	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 15:36:26.000761-05
e87e0d1d-01b9-4ecc-a74b-29e195468434	96c72022-eaec-48e8-b706-8a7770d00ee5	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 15:36:26.916155-05
d519e99a-bf39-4cf7-bf18-8df6c183057b	96c72022-eaec-48e8-b706-8a7770d00ee5	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 15:36:26.916155-05
88c54ae8-1ea2-4986-9861-150b259f28dd	b39c5b95-7ce5-474d-b703-f76d2c942fd4	\N	terms	v1.0	t	::ffff:127.0.0.1	curl/8.5.0	2026-07-16 15:36:35.891-05
04bf9f95-501b-49f2-981a-5c6b708a1585	b39c5b95-7ce5-474d-b703-f76d2c942fd4	\N	privacy	v1.0	t	::ffff:127.0.0.1	curl/8.5.0	2026-07-16 15:36:35.891-05
67e774e8-c87f-4432-8a7e-5b9a974a67a2	f0a2fbf1-a9d6-4521-85c6-5b694161487c	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:11.183259-05
9e230a41-9e70-4802-9762-8ec5061eca29	f0a2fbf1-a9d6-4521-85c6-5b694161487c	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:11.183259-05
264f633d-080c-432b-b99b-20cf83447b59	3a589757-dcea-4e1c-a5da-fbb5f6cb66f8	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 16:46:09.320585-05
86d2d3e4-8c5a-4c3a-97fe-425a1cab02e8	3a589757-dcea-4e1c-a5da-fbb5f6cb66f8	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 16:46:09.320585-05
7289f5c6-9abc-4e4a-b77b-e94f11905f2a	f88899fa-aa79-4260-9e56-e7bfa5040f2c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 16:46:10.072858-05
fdb23a4b-d72f-41bf-a421-8ed3c13e6879	f88899fa-aa79-4260-9e56-e7bfa5040f2c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 16:46:10.072858-05
824c72e8-34e4-45d0-888f-95cfc81e925e	08b982ec-de96-465a-b84d-6bb2202b0018	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 16:46:11.520512-05
e1a3aaa1-047f-4613-b591-13f6fafe0eb2	08b982ec-de96-465a-b84d-6bb2202b0018	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 16:46:11.520512-05
4c154a5c-c636-4df4-a3e9-5c98e2d062bd	1275a3d5-71fc-4ac7-94cc-496da0bfef2c	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:12.177675-05
e0c63ffc-a254-4db8-ae2e-c12d03c9eab5	1275a3d5-71fc-4ac7-94cc-496da0bfef2c	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:12.177675-05
cb26ac3a-22bb-476c-a49c-6e54041f4017	7c6cf21d-4fe1-4096-ac76-cd8ffdd8ab78	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:13.621279-05
174461db-b6be-404b-a70c-c66ff76da666	7c6cf21d-4fe1-4096-ac76-cd8ffdd8ab78	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:13.621279-05
dbc1d49a-a168-4708-aba2-5c98b223a0ce	d688c2f2-aa3a-48c8-86b4-76df6b799ffa	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 16:57:56.305935-05
f0bace9a-5f70-4f74-bbdc-6d21156d2827	d688c2f2-aa3a-48c8-86b4-76df6b799ffa	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 16:57:56.305935-05
a365b402-365d-4b3a-a267-adab543319dc	c253fac1-6820-4c9b-8bf4-0a2391caca7c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 16:57:56.913562-05
95f18b1f-92bc-4e80-ab08-35781c4169e1	c253fac1-6820-4c9b-8bf4-0a2391caca7c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 16:57:56.913562-05
e30e33bd-5924-4ccf-b4da-4723ed75eeec	0fdf63d9-5503-46f5-9006-513f5a253704	\N	terms	v1.0	t	38.242.194.196	node	2026-07-16 16:57:57.969533-05
e5e0d028-9dce-4fc8-a14d-11a49f74a0dd	0fdf63d9-5503-46f5-9006-513f5a253704	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-16 16:57:57.969533-05
d2ee9fc4-bf95-4c7b-96e4-e64b9603231e	c8152626-746b-4ffe-803a-ff1eaccd28f4	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:14.080878-05
2085e4fe-aa19-49be-9c09-7c6796371497	c8152626-746b-4ffe-803a-ff1eaccd28f4	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:14.080878-05
3815fe2f-b4c4-4426-a389-371998e57312	e48b08dc-f4d8-4edd-84be-3de96492dc87	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:06:43.73919-05
0481a345-e487-45f7-92dd-e5d950d982a0	e48b08dc-f4d8-4edd-84be-3de96492dc87	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:06:43.73919-05
86415b16-7654-4d91-ae06-e31fff7543f5	84a4142b-26f8-47b8-9bb8-041e1dbcb0bf	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:06:44.470196-05
8efd327d-e4d8-4a5b-a560-6a6e4287b268	84a4142b-26f8-47b8-9bb8-041e1dbcb0bf	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:06:44.470196-05
d5bb843b-fdd7-4be9-a712-84c48960d6d1	0ba3d84e-4e31-4d58-a875-a3b461ecf8c3	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:06:45.714319-05
07c29419-3545-4128-b2cf-cb9054f469a0	0ba3d84e-4e31-4d58-a875-a3b461ecf8c3	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:06:45.714319-05
0585093c-2f09-4116-9772-daf04e9e4a57	3332f1b0-00fd-4094-a272-6f68d5219cae	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:12:14.887565-05
e0c39480-c2d7-40a2-910a-7f7fb95d77f3	3332f1b0-00fd-4094-a272-6f68d5219cae	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:12:14.887565-05
96ff5182-37da-4818-8bbf-952eff659e5c	3888f407-b11a-434e-b85e-66467f979a35	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:12:15.533884-05
2d320255-4753-4e11-8804-f2b59833ebf9	3888f407-b11a-434e-b85e-66467f979a35	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:12:15.533884-05
1dc86025-70bb-4886-bac9-7b0038e4271f	00d80e30-754e-404b-91f8-46edea2a8443	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:12:16.533546-05
2f4e073e-def2-4330-900c-c5fd899e9a04	00d80e30-754e-404b-91f8-46edea2a8443	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:12:16.533546-05
b4634eb0-214f-4ef9-bcf5-2f8835fbf949	4887726f-ada6-4764-af29-5c422b745275	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:14.538183-05
3605f1f1-9b4e-487a-a361-0210f646c3e5	4887726f-ada6-4764-af29-5c422b745275	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:14.538183-05
93d9145e-982c-4cb3-a0bb-96d9f40b34c5	034c126b-3a33-4b57-9cdd-39422557890c	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:15.692717-05
07cbbdfe-d9a0-45f6-854c-b53edaa9d29e	2577dc1d-8c55-43c0-8bf7-249ab23802f0	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:16:33.989732-05
f75bc540-909d-4ef0-8d2b-3d479cf50f10	2577dc1d-8c55-43c0-8bf7-249ab23802f0	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:16:33.989732-05
9a51e548-98be-4b67-a9d8-59e9ab998dcf	c2e1e116-593b-4f96-9ef8-97eaa95d6d80	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:16:34.717609-05
a0972034-260e-417d-a46d-06a7ebc0e0a8	c2e1e116-593b-4f96-9ef8-97eaa95d6d80	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:16:34.717609-05
57bbe9bf-0c54-4b94-adc5-96963f958fd2	9e795cb0-b91d-498b-802c-2c4ac43ee92b	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:16:35.680906-05
300ac411-c3ea-48c2-9a5c-e7f2a1444a01	9e795cb0-b91d-498b-802c-2c4ac43ee92b	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:16:35.680906-05
4ca313f7-b299-4a98-b51d-ad33b5025ff9	034c126b-3a33-4b57-9cdd-39422557890c	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:15.692717-05
eda33e86-8f13-4a10-a966-be7d32f7848a	59528487-bafa-4ba3-9987-65f9d1ca050d	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:16.296233-05
3eec09c9-3034-4e2b-876d-5861f558a399	59528487-bafa-4ba3-9987-65f9d1ca050d	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:16.296233-05
ad0a1194-75ff-444a-b396-265d49f6a161	e25e9d5a-d3d2-4c1f-b86c-bac64dc079d8	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:17.32165-05
5af3496e-92a6-478b-a1df-e46522845e87	fcbf6fc3-7e5c-43b3-926a-2791a33c9ac9	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:21:50.117221-05
1483b1d0-3199-4b60-ada3-bddaa0f2b865	fcbf6fc3-7e5c-43b3-926a-2791a33c9ac9	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:21:50.117221-05
12556ea4-edb1-4b50-84b5-1667d09907d8	95ec0089-acb9-4bfe-8b4e-05712a0f0ff8	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:21:50.83526-05
81a1e952-e80c-4d18-af81-a9ed87aa70e7	95ec0089-acb9-4bfe-8b4e-05712a0f0ff8	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:21:50.83526-05
89f07f3c-0c55-4b32-9540-a5770619c4b0	b07ded4d-7c7d-4329-8b03-bb5179a83d95	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:21:52.29141-05
1c7de97e-3ee0-48d5-97e8-d941a5818fab	b07ded4d-7c7d-4329-8b03-bb5179a83d95	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:21:52.29141-05
3e236c07-1b3e-476a-9b26-c05a22b54297	e25e9d5a-d3d2-4c1f-b86c-bac64dc079d8	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:17.32165-05
54facdde-90db-4dec-b426-16dc2050bfdc	dfceaed0-d39a-42d8-87e0-8c4557fefab6	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:35:16.881154-05
3f3b5fa1-6675-4f49-8a8c-8838c8578f1f	dfceaed0-d39a-42d8-87e0-8c4557fefab6	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:35:16.881154-05
9f209b4c-6b80-4b00-8f64-8a28123525ba	fa56aad0-2a89-4bf5-a466-2c641b9e9742	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:35:17.678932-05
62365ad5-9018-438e-950d-5bd01ddd853d	fa56aad0-2a89-4bf5-a466-2c641b9e9742	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:35:17.678932-05
fef04dd1-4ede-492d-8169-7e463b56a26c	39aef468-264a-45a6-ac75-161bae44557d	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 00:35:19.109185-05
955263b0-f9fa-4be9-ac9e-d66068e26d60	39aef468-264a-45a6-ac75-161bae44557d	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 00:35:19.109185-05
ccac2a15-3210-478b-84f2-686f5b50372f	4a5e5e75-803c-4261-b1f3-1472ee9de18c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 01:46:35.190259-05
7055ed75-9858-412b-98eb-295a0dde8c7f	4a5e5e75-803c-4261-b1f3-1472ee9de18c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 01:46:35.190259-05
44dfa75a-dbc1-43fa-901f-d162fa535cd9	2907924e-f345-4d5f-99fa-11c790506740	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 01:46:35.82648-05
aa8240fa-16bd-42ed-b73d-0675d16ef7d4	2907924e-f345-4d5f-99fa-11c790506740	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 01:46:35.82648-05
b328b073-3e20-475a-8d5e-6be7604da498	7df34dbf-8571-458d-8c3b-d229a80a51c1	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 01:46:36.870027-05
b0b70d6c-278d-4ba0-8655-fd1e0b623666	7df34dbf-8571-458d-8c3b-d229a80a51c1	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 01:46:36.870027-05
df45a9cb-5b84-4e7e-b3e4-f5be3b63e1fc	d9a267f0-9c81-4190-8274-5d9e4c4948a2	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 01:47:16.738941-05
eda69790-01e0-4cf2-8dad-9256afed5db9	d9a267f0-9c81-4190-8274-5d9e4c4948a2	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 01:47:16.738941-05
8da4c0d8-3c5b-4f42-8c48-881b8165decb	9bcb0ac8-2b68-486a-ba23-aeddfb2e5ebd	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 01:47:17.512163-05
1ff5427d-c175-4689-9bc5-b7dba32089c0	9bcb0ac8-2b68-486a-ba23-aeddfb2e5ebd	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 01:47:17.512163-05
af02aa51-0c3e-4c7f-ae29-ea14b5c7fa35	815880ef-6dc1-495e-ada0-97e86a4fbf05	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 01:47:18.685037-05
240886e7-1607-4a2b-8118-0d70f74b20c5	815880ef-6dc1-495e-ada0-97e86a4fbf05	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 01:47:18.685037-05
c5743ad2-2868-40a7-95df-a7566da7e159	78e67b0e-0e69-4c8b-922e-9e8231a622ea	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 01:58:58.04809-05
cb8a930e-77f8-4ec5-99b8-9dd63660a673	78e67b0e-0e69-4c8b-922e-9e8231a622ea	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 01:58:58.04809-05
4cb49690-0d42-48db-af45-bda3b907dc07	9be92888-23b2-4992-97c9-2a006c981e50	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 01:58:58.648578-05
184bf8c9-b13a-4e5c-8388-8aa340765794	9be92888-23b2-4992-97c9-2a006c981e50	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 01:58:58.648578-05
2e6a64e6-3ad3-456f-bd73-f9b20fbec235	77623f88-7b36-48c6-8104-64e1835b491b	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 01:58:59.750917-05
5d11ebbf-2587-4441-9c43-57d01ac2675f	77623f88-7b36-48c6-8104-64e1835b491b	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 01:58:59.750917-05
90af1e0e-230f-465d-a238-6416529d628f	c02bb3ef-76c6-49b1-b3bd-8336857caff0	\N	terms	v1.0	t	\N	node	2026-07-23 17:06:41.659214-05
c85a47f1-ea57-4a29-9025-83649499842c	c02bb3ef-76c6-49b1-b3bd-8336857caff0	\N	privacy	v1.0	t	\N	node	2026-07-23 17:06:41.659214-05
a6f910c0-b0a2-46d8-bf08-f36fe37f48de	cfa5c63a-16cd-41d4-8de1-51abd875c2c5	\N	terms	v1.0	t	\N	node	2026-07-23 17:06:42.270201-05
7c1c94ef-bc5a-4c5a-8e24-1be2f59e99d6	cfa5c63a-16cd-41d4-8de1-51abd875c2c5	\N	privacy	v1.0	t	\N	node	2026-07-23 17:06:42.270201-05
ed2ed983-b8c8-4aa9-8580-b7ba67243421	63e1dcb0-da46-4a94-976f-2d7b9bcf2633	\N	terms	v1.0	t	\N	node	2026-07-23 17:06:42.816405-05
f7965af3-b0fe-4421-87ce-aa97b0d41180	63e1dcb0-da46-4a94-976f-2d7b9bcf2633	\N	privacy	v1.0	t	\N	node	2026-07-23 17:06:42.816405-05
0761e7a4-bbb1-46c0-bf6a-c70d818527cd	88ddebae-dc18-4a6f-a923-08561ccb6367	\N	terms	v1.0	t	\N	node	2026-07-23 17:06:43.359236-05
06335a7a-3126-4cd1-8044-cb9b1037aa56	f663a216-5967-4b35-a2a5-16e0951e330b	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 08:43:49.56486-05
1d274739-b4f0-4193-b482-60db45034eb3	f663a216-5967-4b35-a2a5-16e0951e330b	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 08:43:49.56486-05
a2492010-c1d1-47fe-a21c-8fcb2c02dad1	66bddb0b-df12-4a58-9afa-f03a854b2d54	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 08:43:50.221583-05
a9816055-e831-4bac-b3ab-063c5abfa005	66bddb0b-df12-4a58-9afa-f03a854b2d54	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 08:43:50.221583-05
204020b7-0f86-4d5f-ba87-9c76559e2361	765becc5-b1b8-4673-8a35-0c1b7895000a	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 08:43:51.392858-05
1a32e55f-cae3-407e-ae18-b0da3cb2f931	765becc5-b1b8-4673-8a35-0c1b7895000a	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 08:43:51.392858-05
6d8449bb-6cfe-4784-ac25-caa4202b8928	88ddebae-dc18-4a6f-a923-08561ccb6367	\N	privacy	v1.0	t	\N	node	2026-07-23 17:06:43.359236-05
2962ff74-2e3a-40ae-bda5-7adf55000c84	2068767e-9e35-4d75-9d0c-1dc72f686b9f	\N	terms	v1.0	t	\N	node	2026-07-23 17:06:44.309383-05
d7d36d0a-f971-4bb1-b203-c0103d3fc80f	2068767e-9e35-4d75-9d0c-1dc72f686b9f	\N	privacy	v1.0	t	\N	node	2026-07-23 17:06:44.309383-05
1a14a451-bf07-433b-9863-854f79b5bcc8	a24b13fe-7867-4360-87f9-b5fd49cbe422	\N	terms	v1.0	t	\N	node	2026-07-23 17:06:49.713832-05
a503bf3a-2b04-489c-b0f6-158188c25497	a24b13fe-7867-4360-87f9-b5fd49cbe422	\N	privacy	v1.0	t	\N	node	2026-07-23 17:06:49.713832-05
bf276198-4359-4ddf-a84c-ee731e588197	47119788-1621-4d8d-892b-64427d7a2e60	\N	terms	v1.0	t	\N	node	2026-07-23 17:06:50.183784-05
80a7c5d6-3c5d-4360-8028-835c5f04efee	47119788-1621-4d8d-892b-64427d7a2e60	\N	privacy	v1.0	t	\N	node	2026-07-23 17:06:50.183784-05
168a5cac-8b49-45fc-88dd-480a7dd2c44c	51007b86-f1be-4e46-9c0b-6d074579af63	\N	terms	v1.0	t	::ffff:127.0.0.1	curl/8.5.0	2026-07-17 09:11:55.838109-05
512859c4-b75f-49ee-acce-78e0eb550c84	51007b86-f1be-4e46-9c0b-6d074579af63	\N	privacy	v1.0	t	::ffff:127.0.0.1	curl/8.5.0	2026-07-17 09:11:55.838109-05
d989748c-2497-4110-8933-c60e32a14d7a	668e7e9f-a6de-4d21-b65a-11407f073060	\N	terms	v1.0	t	\N	node	2026-07-23 17:06:50.677948-05
7b66ba92-fb69-415c-89b3-2b45ccaeecce	668e7e9f-a6de-4d21-b65a-11407f073060	\N	privacy	v1.0	t	\N	node	2026-07-23 17:06:50.677948-05
da5b8cdf-13f4-4d61-b146-2dc8405d69de	8fdfc246-a7d7-423f-83fd-f43002fc6f47	\N	terms	v1.0	t	\N	node	2026-07-23 17:06:51.198114-05
c68698c2-b7ed-4c50-9b2b-d517dc1bff30	8fdfc246-a7d7-423f-83fd-f43002fc6f47	\N	privacy	v1.0	t	\N	node	2026-07-23 17:06:51.198114-05
5b739e28-b451-41ae-b9f8-cc679d64b675	44d09e64-f9a9-4eab-8102-eaf0a6e706f0	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 09:36:33.024556-05
0361a4ee-dfc7-4c97-97ad-3644da9f4730	44d09e64-f9a9-4eab-8102-eaf0a6e706f0	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 09:36:33.024556-05
1dd97643-d6b2-43ff-a7a5-8f9ae121a731	23aa6746-59df-47eb-8ed1-7330b3348919	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 09:36:33.595704-05
bd0d9c90-aeab-4c6b-8623-717144ca72f5	23aa6746-59df-47eb-8ed1-7330b3348919	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 09:36:33.595704-05
2bd664cf-c4cb-49af-849b-a6e4b08f56e5	718f788d-e989-4251-bf76-c59c5eeb7891	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 09:36:34.700121-05
21855918-f2e1-47ab-8974-12aa356282f9	718f788d-e989-4251-bf76-c59c5eeb7891	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 09:36:34.700121-05
b82b72ee-3d0a-40e1-aad6-46b3e8cbe96d	8b5c8fc8-5282-4ffe-b9a7-578f66e2b251	\N	terms	v1.0	t	\N	node	2026-07-23 17:06:52.077063-05
130a0295-bcce-4e27-8b45-232a114145ea	8b5c8fc8-5282-4ffe-b9a7-578f66e2b251	\N	privacy	v1.0	t	\N	node	2026-07-23 17:06:52.077063-05
22de0d1e-ef18-4565-a855-84294bf0c432	a286c88b-b997-44a9-b7ab-6cc652fa5065	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:33.581723-05
69bdbbe6-5e44-4fb7-bb6e-c65b0ddb8f68	a286c88b-b997-44a9-b7ab-6cc652fa5065	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:33.581723-05
40078889-69e3-4707-b2b4-c358f06c64d4	8339c428-516d-46ea-acbd-9a5c538e7f8a	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 09:51:29.361812-05
e8206820-b91e-4826-8ea2-7dfb56790d83	8339c428-516d-46ea-acbd-9a5c538e7f8a	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 09:51:29.361812-05
74d42ad4-4b72-4d64-8b12-dede4582d650	ee27cb98-42f5-42c3-908a-5244b81eef17	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 09:51:29.995808-05
d7ab5727-5066-4c9e-b9c6-533d7ce0d3f9	ee27cb98-42f5-42c3-908a-5244b81eef17	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 09:51:29.995808-05
a5dcafde-5a9f-4e07-a4f5-079f26a60a2f	1b185486-0ada-4929-8010-8ca9566687be	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 09:51:31.107013-05
d18f2b1c-4604-44f3-9f9b-894d361a2c5f	1b185486-0ada-4929-8010-8ca9566687be	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 09:51:31.107013-05
5842a9f7-d69e-4df1-ad58-f68ce428509c	b0f0b17b-f31f-4fd1-910c-8b6597f466e9	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 10:31:19.189583-05
1a359a78-74ba-4075-882c-4a812469589c	b0f0b17b-f31f-4fd1-910c-8b6597f466e9	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 10:31:19.189583-05
d26ffab9-0a0a-4789-9458-4b10dac14c04	51fd0645-286b-4fe3-9029-4ef604a09402	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 10:31:20.793318-05
c1324b74-851e-43df-89d1-f7e95cd5f562	51fd0645-286b-4fe3-9029-4ef604a09402	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 10:31:20.793318-05
a091c66e-276b-4a8d-809c-8237400bc879	b7cda2e9-f984-43a4-b5c2-5db9332db3cc	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 10:31:22.43638-05
5515fecd-b014-4c99-ad57-6ee19bc54818	b7cda2e9-f984-43a4-b5c2-5db9332db3cc	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 10:31:22.43638-05
a603b05d-1742-475b-8875-70e337e23bfb	6dcf16e9-070d-4b23-8be1-a1a705767a3c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 10:52:46.597512-05
816902c3-88a5-465e-b060-0c8621895133	6dcf16e9-070d-4b23-8be1-a1a705767a3c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 10:52:46.597512-05
d5da9c2a-bfe5-4ade-931c-274143606de8	e71359ca-3c1a-467b-af77-16a4d8ea7872	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 10:52:47.24162-05
48920863-028d-4faf-8963-22136dbaee3a	e71359ca-3c1a-467b-af77-16a4d8ea7872	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 10:52:47.24162-05
ed8ea799-d6ff-4f0b-a9e9-978b41eee378	377ce0dd-e0ed-4bdd-87ef-91e9824d55ed	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 10:52:49.098551-05
b43828e4-070a-4c0b-9393-da84a55015fe	377ce0dd-e0ed-4bdd-87ef-91e9824d55ed	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 10:52:49.098551-05
99edf1cb-b916-4049-a33c-8454fda06dba	eef91055-13bc-4755-af71-4b9444bed188	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 11:07:49.542341-05
f1f72347-5251-42a9-a0a2-b738f0088eb9	eef91055-13bc-4755-af71-4b9444bed188	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 11:07:49.542341-05
9f4e53ca-56ed-472e-a300-51594261f2e0	a034fac0-eff9-4bc4-9087-4423bb62b9f1	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 11:07:50.192461-05
10a61a3c-d979-4453-b9eb-b73dbb5f5d8c	a034fac0-eff9-4bc4-9087-4423bb62b9f1	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 11:07:50.192461-05
4f0f58db-b576-47f9-b506-ebd7e03fedca	db405169-00ea-4134-b909-6d93544258e2	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 11:07:51.441272-05
dc593fbf-0c0a-49c9-a53e-6a01e74d5ebf	db405169-00ea-4134-b909-6d93544258e2	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 11:07:51.441272-05
d2ad7870-b468-4a51-ac0d-99d52d322e8b	4f4386ce-1d48-4909-9bcc-06b6b0c96b15	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 11:16:27.708636-05
b4039601-0f21-47db-b724-94e2c1e8b086	4f4386ce-1d48-4909-9bcc-06b6b0c96b15	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 11:16:27.708636-05
35f29af8-1793-47cb-b20c-232b8dcc3ae7	302ced86-9f26-4fce-b6d1-6b97e0acee0c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 11:16:28.61741-05
d7f627cb-0171-4253-bab4-69a8c315f708	302ced86-9f26-4fce-b6d1-6b97e0acee0c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 11:16:28.61741-05
b6ee0ec1-c7f1-41dd-b0ad-e8cef7c26da4	871d3c34-16ae-4b52-b3d8-c9dce447f573	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 11:16:29.854051-05
81611c6e-a065-4adf-bb9c-2ea8f969445d	871d3c34-16ae-4b52-b3d8-c9dce447f573	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 11:16:29.854051-05
59447330-26d5-4376-9e3f-32a202a70dfe	c9829328-0d54-42e7-afe2-6aeeaa91cf11	\N	terms	v1.0	t	\N	node	2026-07-23 17:11:33.253997-05
8779e2ce-d047-441e-954b-cabd29fa62dc	c9829328-0d54-42e7-afe2-6aeeaa91cf11	\N	privacy	v1.0	t	\N	node	2026-07-23 17:11:33.253997-05
32137bda-2d0a-4104-a265-6ed65ebdaea3	bb3de6f4-226f-4c5c-930a-6c47580973aa	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 12:03:17.351194-05
937d8481-0d1b-494c-92f4-a54bf518e998	bb3de6f4-226f-4c5c-930a-6c47580973aa	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 12:03:17.351194-05
0257e49e-6bfa-417a-94c3-0a95d0783cfc	c381a0dc-85c2-468c-9153-3025775e32f8	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 12:03:18.335099-05
5e762c15-d283-4c0e-901d-03cf2a18bfb0	c381a0dc-85c2-468c-9153-3025775e32f8	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 12:03:18.335099-05
6bac8da7-cedf-4de4-a704-81fb8e3961fa	ef056109-054d-4d8f-8945-3ceba8994597	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 12:03:19.6688-05
f7e2dc96-6c12-4efb-9e32-f29397e2836b	ef056109-054d-4d8f-8945-3ceba8994597	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 12:03:19.6688-05
1c3af822-e536-4564-8532-74a6b3d2a338	eb68604d-4d57-490a-89d3-1d55ea7abc8b	\N	terms	v1.0	t	\N	node	2026-07-23 17:11:34.65531-05
c9478f08-a8dc-4352-a800-e2235babde0b	eb68604d-4d57-490a-89d3-1d55ea7abc8b	\N	privacy	v1.0	t	\N	node	2026-07-23 17:11:34.65531-05
c22c3a05-5407-4885-9b71-5c5ec34f676d	4b7babcd-08c0-4b2c-9962-8ca01da5fce3	\N	terms	v1.0	t	\N	node	2026-07-23 17:11:36.516781-05
4f823685-6600-48fb-aa9b-0fdf1412792a	4b7babcd-08c0-4b2c-9962-8ca01da5fce3	\N	privacy	v1.0	t	\N	node	2026-07-23 17:11:36.516781-05
3f570bc8-13c0-44cd-9cd4-2f3a4e2ff1d4	ba18bb83-75dd-43d4-a116-2fc1e77b0ed9	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 14:29:25.214737-05
5e33ca3c-b72a-4fc9-82a2-799e939961c4	ba18bb83-75dd-43d4-a116-2fc1e77b0ed9	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 14:29:25.214737-05
c5cefdaa-a7c7-4729-8d65-bf33b7adc467	5540e77a-b823-4c3e-ad4b-a5b5a5225fb8	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 14:29:25.836082-05
cb10f70d-c0b7-4f20-ac50-8f49c4efcf60	5540e77a-b823-4c3e-ad4b-a5b5a5225fb8	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 14:29:25.836082-05
caf0fdbe-96e2-499c-af82-f7e820da10ef	280c79aa-8e8e-4ed8-9c8e-298cbea5cc07	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 14:29:26.767198-05
4a0e10ff-c8fa-4b2f-a54c-e8b81bf269f3	280c79aa-8e8e-4ed8-9c8e-298cbea5cc07	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 14:29:26.767198-05
343f2b68-e103-4208-a87e-d310f470fa27	41f8c8ee-81cc-4266-b78d-2ad9b60d77e9	\N	terms	v1.0	t	\N	node	2026-07-23 17:11:37.532208-05
2e2dee75-ba14-48b9-95fd-bce310f8843d	41f8c8ee-81cc-4266-b78d-2ad9b60d77e9	\N	privacy	v1.0	t	\N	node	2026-07-23 17:11:37.532208-05
d39ae696-6658-45b4-a4c6-1cbdf4034e8b	7cdd61fc-173a-4ac9-b729-c36e6ff11981	\N	terms	v1.0	t	\N	node	2026-07-23 17:11:38.613985-05
57d30c2a-7190-473c-aea7-df8c087422d5	7cdd61fc-173a-4ac9-b729-c36e6ff11981	\N	privacy	v1.0	t	\N	node	2026-07-23 17:11:38.613985-05
3dc9b0ed-06a8-442d-9c0e-93002d2a03a3	e5a6e099-7386-46b4-ba00-b61a4cd028ac	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 14:29:33.43812-05
89f1ea19-01e7-4f61-9115-8bf040f98b03	e5a6e099-7386-46b4-ba00-b61a4cd028ac	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 14:29:33.43812-05
814ab50c-9bf2-4516-8bee-c73a7d5db2e1	8fcf64e3-a0c7-41b8-8878-920481ed6699	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 14:29:34.050171-05
bcbb6630-87b8-43de-b2a4-8e84fac8a408	8fcf64e3-a0c7-41b8-8878-920481ed6699	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 14:29:34.050171-05
149d117a-b004-420e-ad5e-55264be542db	8aa41f63-d0dc-4e6a-9188-de32d8e7706c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 14:29:35.077843-05
0ed819a1-91d3-4324-83f3-a94d56ee025d	8aa41f63-d0dc-4e6a-9188-de32d8e7706c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 14:29:35.077843-05
218f6fbe-9f9e-4c8d-b742-026a44306cca	85e35802-4818-4fb9-9563-9cca9a818bb9	\N	terms	v1.0	t	\N	node	2026-07-23 17:11:39.103546-05
aa17e31a-d68b-4aee-af8d-dc7b0a785e24	85e35802-4818-4fb9-9563-9cca9a818bb9	\N	privacy	v1.0	t	\N	node	2026-07-23 17:11:39.103546-05
80ffb43a-99e8-4f87-abcd-d66243c19807	13481b07-567a-453b-bd8e-41a49de3514b	\N	terms	v1.0	t	\N	node	2026-07-23 17:11:39.579867-05
30f2edf6-611f-4036-a620-d934bedfd591	13481b07-567a-453b-bd8e-41a49de3514b	\N	privacy	v1.0	t	\N	node	2026-07-23 17:11:39.579867-05
6b941933-053c-44ff-b518-d7c18c70a52f	3f976b2e-c078-408b-84bb-f5aa444189a9	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 15:15:43.932162-05
20f94ff1-9241-413d-9b65-dfbc1c8882e9	3f976b2e-c078-408b-84bb-f5aa444189a9	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 15:15:43.932162-05
cd1b0542-89bf-4f89-a57a-948b1c626104	c2fb8eda-1f3b-4338-915f-510af2b8fc94	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 15:15:44.699783-05
b25a5f88-e96b-452c-8fa7-e57e49198857	c2fb8eda-1f3b-4338-915f-510af2b8fc94	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 15:15:44.699783-05
d2225045-c2c8-4f51-9f2b-90e1e0a5fb95	110500a9-d3ec-4ebd-930c-010137ede9b8	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 15:15:46.054725-05
fd95d00a-d06d-4e8a-af49-5eb207ed9340	110500a9-d3ec-4ebd-930c-010137ede9b8	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 15:15:46.054725-05
99d763f2-952b-48db-81f3-4ade15802c4a	ac9fd34c-3765-4177-8783-720685e4aabf	\N	terms	v1.0	t	\N	node	2026-07-23 17:11:40.554727-05
45bead43-d189-48c4-ba3f-9f996cb04393	ac9fd34c-3765-4177-8783-720685e4aabf	\N	privacy	v1.0	t	\N	node	2026-07-23 17:11:40.554727-05
346599f0-c7f5-4cd4-834a-2b23793f71af	6f1df609-6dc2-4bd3-91cb-cff3c4d46647	\N	terms	v1.0	t	\N	node	2026-07-23 17:11:41.089817-05
f5b1e1a6-b4cb-4f71-9c41-1a1c96949fac	6f1df609-6dc2-4bd3-91cb-cff3c4d46647	\N	privacy	v1.0	t	\N	node	2026-07-23 17:11:41.089817-05
68ee50a3-23d9-4d9a-b87a-ea1d840b4698	b1510400-b320-4a66-a56f-b18a8a072669	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 16:48:55.278155-05
00280f89-1802-4966-8fab-1e1bb4758e9e	b1510400-b320-4a66-a56f-b18a8a072669	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 16:48:55.278155-05
1c11ef65-693e-4461-9ddb-eba8015e8e33	584cadda-afab-4234-bfa5-aec97bf19684	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 16:48:55.888042-05
de9d9299-9825-49ef-b9dd-d519665448da	584cadda-afab-4234-bfa5-aec97bf19684	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 16:48:55.888042-05
b7bb9e32-3fa4-4f1c-a7d8-e770a1f53b9e	8c2a0a70-1ba3-4392-8c6b-c2413081f27c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 16:48:57.63122-05
9cd3e008-e810-431e-8378-8a1d9cae4573	8c2a0a70-1ba3-4392-8c6b-c2413081f27c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 16:48:57.63122-05
f28288c9-597e-4b7f-bc0c-1747644a3d1d	201bcc60-6004-4819-ab3e-2da635f4952a	\N	terms	v1.0	t	\N	node	2026-07-23 17:11:42.221649-05
3d113e89-74ab-4603-afbd-497d97173203	201bcc60-6004-4819-ab3e-2da635f4952a	\N	privacy	v1.0	t	\N	node	2026-07-23 17:11:42.221649-05
cca25cc7-05fb-454c-b66a-d2249e12ec0b	f6464337-2293-4557-a0bf-1515d5ebe0d1	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:35.801764-05
5c9712fe-82c0-465f-a30c-8e0c92675d60	f6464337-2293-4557-a0bf-1515d5ebe0d1	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:35.801764-05
5f1a4437-8daa-47b1-b526-c150e46bab09	5c697674-bc02-43c9-8a90-e600f5c808f8	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 20:03:01.321557-05
b1394e2f-f590-4fbd-aaa4-8ed1b24f5eac	5c697674-bc02-43c9-8a90-e600f5c808f8	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 20:03:01.321557-05
8cc74733-0071-4af3-92ec-5faa88b41fbf	a5b9a3c1-e013-44dc-b288-dd068ffd5954	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 20:03:02.108043-05
59fc2b10-55b5-44a3-bf00-d7f26670f7d2	a5b9a3c1-e013-44dc-b288-dd068ffd5954	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 20:03:02.108043-05
82c78735-042b-4e11-ac2b-97144e4077f1	2edafeb8-73e2-4cd9-8fa1-104970de1e4d	\N	terms	v1.0	t	38.242.194.196	node	2026-07-17 20:03:03.588394-05
fd65b094-3269-4226-9f22-6d0762b67633	2edafeb8-73e2-4cd9-8fa1-104970de1e4d	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-17 20:03:03.588394-05
335f2ac2-816f-4ded-a277-a9d207b00945	ed872e8f-a8b9-4236-b92f-ab181c77e4dc	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:38.876441-05
3457aeee-b26a-41ca-ad36-d45939de5bf2	ed872e8f-a8b9-4236-b92f-ab181c77e4dc	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:38.876441-05
7fc0d350-a086-4f51-af97-b41598fcbd20	838cc6b0-1cb4-4142-9e83-af6b78599a0e	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:39.804478-05
3d6a508b-ce70-410b-9e13-b6b748271c26	838cc6b0-1cb4-4142-9e83-af6b78599a0e	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:39.804478-05
546ffaf6-eb40-49bc-9188-b1f3f1b4be99	6d221f87-0754-4888-830b-1f2917d5620c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 09:48:06.506903-05
f445a88d-1d1f-467b-884c-2b1e46c55c6c	a06089d7-84fd-4ecd-a03e-1805819a797c	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:40.880484-05
ad65289c-ed41-4f94-adc2-159b830aa4de	a06089d7-84fd-4ecd-a03e-1805819a797c	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:40.880484-05
a4518de3-3b3a-4527-a614-6042fd96eb86	8d3f442e-8854-4a68-868c-20c115b8190d	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:41.491201-05
1e0626de-25b1-42c1-a9ee-fc2e3e4423a9	8d3f442e-8854-4a68-868c-20c115b8190d	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:41.491201-05
8185f399-e5ab-4fa6-a1f5-4556533193a0	1327609f-392f-4a1d-8cd8-6a0e60883948	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:41.956035-05
a539175c-7c7c-4be4-abe9-4496f1e1ebc2	1327609f-392f-4a1d-8cd8-6a0e60883948	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:41.956035-05
cd254f5a-b1b8-4612-93f5-c95a6dcd48ed	4115b67c-8b2b-4c95-9bcf-2174f3c30c97	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:43.114477-05
e154df4f-afa2-40f7-a80b-e811cbba29c0	6d221f87-0754-4888-830b-1f2917d5620c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 09:48:06.506903-05
006a9ae3-5926-4197-b07c-29fcbe21a512	bd7697e6-df10-43c4-80b9-f49968a08e6f	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 09:48:07.355038-05
161c30a1-8598-4c45-af9f-c4b6330728dc	bd7697e6-df10-43c4-80b9-f49968a08e6f	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 09:48:07.355038-05
efc84a4d-70b7-4c0e-b4c7-78c73701f4a6	a32f1b52-1e5a-4131-8849-c72a69cbeb65	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 09:48:08.568896-05
1fa4d0fd-af64-4b08-a493-c65b6c438332	a32f1b52-1e5a-4131-8849-c72a69cbeb65	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 09:48:08.568896-05
2fc32983-941c-41ca-852d-e6df90f2e7a4	8d10abe7-e7ea-4497-933b-3dc5c0278d4d	\N	terms	v1.0	t	\N	node	2026-07-23 17:12:04.060914-05
02d1942d-9641-4ee6-9c18-6270e754881c	8d10abe7-e7ea-4497-933b-3dc5c0278d4d	\N	privacy	v1.0	t	\N	node	2026-07-23 17:12:04.060914-05
042944f9-52f5-4140-bd48-6bfea7295bdd	d81a1e45-cc2e-4c45-9b9a-377a3b07eb12	\N	terms	v1.0	t	\N	node	2026-07-23 17:12:09.232813-05
88c15f67-e6a7-4767-b779-891f23b81b84	d81a1e45-cc2e-4c45-9b9a-377a3b07eb12	\N	privacy	v1.0	t	\N	node	2026-07-23 17:12:09.232813-05
ef7008aa-8baa-4b79-b6b8-b44591590437	9cc23a64-1bc8-415c-96f0-97507015b0fe	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 10:59:03.030786-05
aa2267c0-f93a-42c2-95c6-6d91c5da8683	9cc23a64-1bc8-415c-96f0-97507015b0fe	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 10:59:03.030786-05
2d55fa2f-3fa5-4aa5-b9d2-7de9918c3e49	159e3e5b-1b58-43a9-86f8-9ba14411ee2c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 10:59:03.825083-05
e4f536e7-931c-4434-9a39-17f0dfa61213	159e3e5b-1b58-43a9-86f8-9ba14411ee2c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 10:59:03.825083-05
8159887b-db7a-4494-a138-cb56baf33032	8f961c51-0385-49f2-a660-b6afa61ef1d0	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 10:59:05.140109-05
d2e5e1c8-3db2-436d-9eba-b1d1e6bbd98f	8f961c51-0385-49f2-a660-b6afa61ef1d0	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 10:59:05.140109-05
e2fd7860-adfc-41e3-b98d-59017ebdf443	33f80b76-b1e6-46c1-b3b1-7c19af1a8db4	\N	terms	v1.0	t	\N	node	2026-07-23 17:12:22.597072-05
4197633a-1374-4362-b859-bf36470731a7	33f80b76-b1e6-46c1-b3b1-7c19af1a8db4	\N	privacy	v1.0	t	\N	node	2026-07-23 17:12:22.597072-05
1c9665c0-ca56-4507-bded-5dd58495c177	461579e9-e451-40aa-9d31-881d8d987cb8	\N	terms	v1.0	t	\N	node	2026-07-23 17:12:26.924137-05
ff983f9b-94e4-432a-bcc5-2e5060a0f41a	461579e9-e451-40aa-9d31-881d8d987cb8	\N	privacy	v1.0	t	\N	node	2026-07-23 17:12:26.924137-05
cdc50dd5-a6a1-4ca4-ad0e-4667c0e880ab	cf6fdd5a-86ae-48b3-adda-25e1f363be20	\N	terms	v1.0	t	\N	node	2026-07-23 17:12:48.395227-05
e74fca95-77ba-48e3-ae77-e0218a3e794d	acbc0846-cabd-4954-a482-f1cac9f42327	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 17:27:58.523076-05
c8f0198f-c840-4f4a-8c52-35f0bc6df0f0	acbc0846-cabd-4954-a482-f1cac9f42327	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 17:27:58.523076-05
6cd76d21-bc13-461d-ae5b-e89338837a81	249a7ecb-2f63-4e95-9b4d-e5b41185012a	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 17:27:59.037095-05
76f3327e-c2c8-4611-a87b-a20e570987f2	249a7ecb-2f63-4e95-9b4d-e5b41185012a	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 17:27:59.037095-05
1344dd1a-f219-4422-932d-c0df59c41e0b	d045807b-7682-4b0a-9577-97853df0a646	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 17:27:59.934997-05
420c24bc-9ed8-4b06-80e3-7ebe0ef30677	d045807b-7682-4b0a-9577-97853df0a646	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 17:27:59.934997-05
1a23cdb2-1a91-4845-8ed5-2df217e2d0db	cf6fdd5a-86ae-48b3-adda-25e1f363be20	\N	privacy	v1.0	t	\N	node	2026-07-23 17:12:48.395227-05
738197c1-244e-4038-be0a-909e32b265d7	98af4b2e-d943-4817-a2ec-1965140a9907	\N	terms	v1.0	t	\N	node	2026-07-23 17:12:53.121096-05
5afcc0ff-88a7-49e7-a484-2f4a7422f41e	98af4b2e-d943-4817-a2ec-1965140a9907	\N	privacy	v1.0	t	\N	node	2026-07-23 17:12:53.121096-05
e0b582ff-2d74-46be-9d7d-b9210b7b0f4a	c1207ef7-4245-42a0-9f65-2a770aa9c870	\N	terms	v1.0	t	\N	node	2026-07-23 17:13:08.595092-05
986f38e8-1e3d-4683-8d41-d6efbca8aefb	40c42d01-6184-4a60-8340-f8eebd4da0ce	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:08:22.436648-05
585e92b5-3d13-498f-b4ed-e40ba5b6b6c2	40c42d01-6184-4a60-8340-f8eebd4da0ce	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:08:22.436648-05
b41668b3-893e-4f4f-9c0f-d17a7b15f2d5	227b2451-73a0-4317-a0d3-2c5ceb47ebeb	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:08:22.904406-05
f99bde72-3729-45fb-bfd3-05ed4face1d9	227b2451-73a0-4317-a0d3-2c5ceb47ebeb	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:08:22.904406-05
3376035b-c030-4640-bc20-d1d8a9959196	8ac1f81b-d562-4541-949c-3df2b7cb4a96	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:08:23.803375-05
cc4b8fba-774f-42f1-bf21-8cd2fc767c34	8ac1f81b-d562-4541-949c-3df2b7cb4a96	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:08:23.803375-05
d66743a2-10cd-4f0b-a47f-7696c2d32e10	c1207ef7-4245-42a0-9f65-2a770aa9c870	\N	privacy	v1.0	t	\N	node	2026-07-23 17:13:08.595092-05
ebed5fc3-bdbd-49e4-b297-0e8696db88a0	414b39b6-5390-4711-bf30-d525f73014ce	\N	terms	v1.0	t	\N	node	2026-07-23 17:13:33.587196-05
e499137f-526b-48c0-a716-389e338ffcea	414b39b6-5390-4711-bf30-d525f73014ce	\N	privacy	v1.0	t	\N	node	2026-07-23 17:13:33.587196-05
e9bfcc50-6a92-4983-9bcd-89cc7144ef15	8008c6d5-88b8-4b6c-b6be-bec5613e852e	\N	terms	v1.0	t	\N	node	2026-07-23 17:13:53.81032-05
4c82d1bd-e43c-4cb5-aafc-42ffb6ad5f27	f3f4e5d1-40bb-4bb3-93f9-62fab74997d4	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:22:07.082168-05
5c633b50-4f66-4fac-9e4c-81c793be0ee4	f3f4e5d1-40bb-4bb3-93f9-62fab74997d4	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:22:07.082168-05
6113fc87-0b7a-42a2-8789-d1536aff961e	7433117b-bd89-4289-aa81-c6dfa8ce8f49	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:22:07.771106-05
9bbea99e-4467-4312-8a52-63f0878d39af	7433117b-bd89-4289-aa81-c6dfa8ce8f49	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:22:07.771106-05
f1a4932c-5b6a-47f8-b758-1323e4dd8315	84e14413-4cfb-400f-bf97-5a7af6bea078	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:22:08.969596-05
1da5df61-84b4-4b83-8bcd-7608aa5a7398	84e14413-4cfb-400f-bf97-5a7af6bea078	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:22:08.969596-05
ff5fc28a-d4d3-4cf9-852f-fbf28051aff9	8008c6d5-88b8-4b6c-b6be-bec5613e852e	\N	privacy	v1.0	t	\N	node	2026-07-23 17:13:53.81032-05
11f3b399-14ae-4fe2-8f58-cde7d4083c43	c61c74a2-10cf-4b1e-862a-3a02dd029844	\N	terms	v1.0	t	\N	node	2026-07-23 17:13:59.126502-05
f6876332-1268-4566-8c42-d0acc4d2f84c	c61c74a2-10cf-4b1e-862a-3a02dd029844	\N	privacy	v1.0	t	\N	node	2026-07-23 17:13:59.126502-05
66c36685-b0f9-4178-ae5b-2fa71b9acfb0	e790a742-94e6-4e7b-9f03-a3b2e0fb3ab5	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:05.352451-05
4fe564b6-1103-4e56-9c17-d9c7b3e73fd2	5a8b0a99-ff4c-4da4-b673-66927e6c6190	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:27:44.963539-05
21730a37-e148-4ace-b565-86a1ed40ef4a	5a8b0a99-ff4c-4da4-b673-66927e6c6190	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:27:44.963539-05
36b8f927-6ca7-4e84-a2d4-df87125db70c	fe0d2aad-7415-4c52-a867-7093278f6c67	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:27:45.512142-05
013185f3-c9e2-4051-a768-848604232791	fe0d2aad-7415-4c52-a867-7093278f6c67	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:27:45.512142-05
15581b6d-1635-4c5a-87de-bc43decbd9b5	8e2c52ce-71a3-421e-9b2b-ee32a1d6f967	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:27:46.551452-05
4e124613-9dfd-4ad7-9aa2-f0beca2c138f	8e2c52ce-71a3-421e-9b2b-ee32a1d6f967	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:27:46.551452-05
bc3c86c7-679b-4efe-9d5c-e1e59635ba01	e790a742-94e6-4e7b-9f03-a3b2e0fb3ab5	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:05.352451-05
1961f977-9ffa-4748-99ef-6239bd2c3e49	b20a67ed-fc47-485f-83b5-662196d76fd9	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:25.561434-05
e8057e41-4973-4511-8bb9-528d31a0c2c3	b20a67ed-fc47-485f-83b5-662196d76fd9	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:25.561434-05
604af517-efe4-4a6d-8774-ccf7615b5112	d7ad375c-94f2-4065-84c5-3947682709a0	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:26.944832-05
1a4c7486-a1a0-4238-bae9-6906f03d86fc	55576117-f0cf-4d5a-bd4d-f55871561369	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:27:53.885141-05
24b8e45d-2660-48b6-87f5-1b133fa983ab	55576117-f0cf-4d5a-bd4d-f55871561369	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:27:53.885141-05
d39fd737-0392-48a0-9caa-c085e4d696b0	4f6797b8-fdd3-4793-9fab-4e114858e6ce	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:27:54.413561-05
5fc7e91f-3664-429f-8a33-d07f603ac249	4f6797b8-fdd3-4793-9fab-4e114858e6ce	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:27:54.413561-05
7b8eb8ba-d088-4d94-bf72-e750e0ce7141	aa5796d8-bbf8-4dcd-a9d3-11bd7db56348	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:27:55.444933-05
8d9adb9d-402a-4589-8e6c-63f546e65316	aa5796d8-bbf8-4dcd-a9d3-11bd7db56348	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:27:55.444933-05
06677a34-58f2-4327-97c5-9cdadabd0f13	d7ad375c-94f2-4065-84c5-3947682709a0	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:26.944832-05
63fed813-dc43-4b6e-b0ec-f809e2368a3a	2506ba2a-831c-4bf1-9697-8df11d9c1e69	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:28.889829-05
ad8065e7-c91a-401d-9d00-2a047c9c7fb6	2506ba2a-831c-4bf1-9697-8df11d9c1e69	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:28.889829-05
1ee4ac2d-304f-4d9f-a321-7a955d7a2815	0d35f76c-58a2-4fa1-bf5c-b345018e2cf2	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:29.868963-05
80a03ca8-887a-44ff-9e35-20992f0572be	f36809fc-e9f6-4d96-9bc0-bdc754adb85c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:28:04.511931-05
9a93f7d5-bf72-45ee-ae05-c5283b5cf03a	f36809fc-e9f6-4d96-9bc0-bdc754adb85c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:28:04.511931-05
968f75fb-8272-4390-91b3-75837ba453a8	2e03210f-c162-4953-89b4-4cca7bf2cee1	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:28:05.305502-05
9ee3377b-2329-48b0-96fc-e3d011abfbb5	2e03210f-c162-4953-89b4-4cca7bf2cee1	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:28:05.305502-05
b967691d-b04c-428c-aa2a-bac179084ba0	291a6748-ea39-40e2-a691-b42f95d9cc09	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:28:06.508352-05
444470e4-069b-47f2-bcec-0349e6ca6563	291a6748-ea39-40e2-a691-b42f95d9cc09	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:28:06.508352-05
d12b9e60-130a-4920-8ab2-943546486520	0d35f76c-58a2-4fa1-bf5c-b345018e2cf2	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:29.868963-05
9f5a3d52-dbe2-458c-858e-b6463104b441	fa287960-7b8a-4379-baaa-66ef6f32d1fe	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:31.041356-05
b6c7f7bb-765f-49d7-85ca-3af9f1688b7f	fa287960-7b8a-4379-baaa-66ef6f32d1fe	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:31.041356-05
42c48ef7-7ee8-4418-8b5f-01baf182286d	25d9ca18-48f6-4407-b8f7-3e8862e983ee	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:31.502067-05
07194833-765f-4e5b-8687-d4506de994c3	25d9ca18-48f6-4407-b8f7-3e8862e983ee	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:31.502067-05
789e8aad-d1bc-468e-8355-21366031bf9e	2dbb3df0-c184-402b-89ef-15fc0eb4646f	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:31.942979-05
8f554d28-a527-47d7-9060-aaa4152c61e8	4f92dab5-40c1-47ef-b72b-4a310e3eee2b	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:29:02.2075-05
3c6f697b-af2f-481d-86e7-514d4cfa4a34	4f92dab5-40c1-47ef-b72b-4a310e3eee2b	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:29:02.2075-05
2f7ef36c-62f9-4471-9f7f-a1f78438670d	e3110068-61fc-46d2-bb45-606eb509ae5c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:29:02.912515-05
410905b7-6031-457c-9f86-b8fed6057c0d	e3110068-61fc-46d2-bb45-606eb509ae5c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:29:02.912515-05
d1f91186-4a38-41a5-9c04-70bf03da511a	1a837bb2-771f-4a01-b856-e9341412cc0e	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:29:03.971957-05
1a6e6b77-4dc3-4648-a192-c94bd6c70f24	1a837bb2-771f-4a01-b856-e9341412cc0e	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:29:03.971957-05
f552148a-2d91-4bc7-8230-51634f17c4ef	2dbb3df0-c184-402b-89ef-15fc0eb4646f	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:31.942979-05
fed03b0b-ce62-477a-9053-a0b56a3ea4fc	e47957cd-0322-481d-87a5-683c2a106072	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:32.945485-05
1c8a3acc-7283-4965-b58e-6a1a0c008dc9	e47957cd-0322-481d-87a5-683c2a106072	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:32.945485-05
261b1580-a907-4a09-883d-a046d23dbc82	7b5fe3c0-af1c-4ded-a9c0-1d4ee112f907	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:33.49942-05
e457892f-6dcc-4b4a-a012-d45017792d50	858acd46-cbae-491a-a818-0957efcac21e	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:29:11.73344-05
44adfd38-d1be-4745-a718-f1e802fd6e9a	858acd46-cbae-491a-a818-0957efcac21e	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:29:11.73344-05
0296c0ec-ebb8-4e16-9ac4-1494c5b247d1	d32ee731-f947-4eff-9e8e-93153afb89eb	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:29:12.266147-05
2c88ece4-acc9-45a6-b8eb-3b473c47fbe4	d32ee731-f947-4eff-9e8e-93153afb89eb	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:29:12.266147-05
cd28f28a-b09d-4b45-bf44-43adaa9e7ea3	e27ce020-ff44-4b86-9ab0-4d84d99ead76	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:29:13.306493-05
e04d02ee-7e94-46b1-bdfb-860f1df81565	e27ce020-ff44-4b86-9ab0-4d84d99ead76	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:29:13.306493-05
b67cfc71-44d6-4ba9-a529-0958be189126	7b5fe3c0-af1c-4ded-a9c0-1d4ee112f907	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:33.49942-05
0e1f4a54-8c84-4cb5-8b40-feccfe8df2c7	3e134f87-188f-4a5b-b85a-8a6cbd8f2432	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:34.466733-05
19214677-f94a-439d-967b-412163d105ba	3e134f87-188f-4a5b-b85a-8a6cbd8f2432	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:34.466733-05
08efa0b2-566e-4871-a365-06440a6ff1ac	5350473a-4730-4945-8a3e-b90b452da51d	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:36.308066-05
e450c411-9e4a-43ab-917f-04560e614c33	b4a2ebe3-1dee-4a20-8664-78564e19b146	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:32:39.365928-05
171f156e-fdaa-49c0-bdd9-f0b9141414b4	b4a2ebe3-1dee-4a20-8664-78564e19b146	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:32:39.365928-05
23c59158-829e-43dd-9844-705017bac57b	6e336ee3-61ac-414c-8cff-22e0f31f87f4	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:32:39.906315-05
37693e4a-0815-4d14-83a9-7b29a2a20d6f	6e336ee3-61ac-414c-8cff-22e0f31f87f4	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:32:39.906315-05
a8285536-fda1-488e-bd51-57af339ffe62	29e15d1d-c79a-4ee9-95eb-8e552d18edc1	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 18:32:40.945791-05
8f49a2fb-890f-44da-93fa-e49c5e6fb8cd	29e15d1d-c79a-4ee9-95eb-8e552d18edc1	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 18:32:40.945791-05
0f54a2c7-075e-45ca-8f66-f9c0ca48c0b1	5350473a-4730-4945-8a3e-b90b452da51d	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:36.308066-05
60ab811d-4cd8-4e75-ba12-034cce1aa5fb	f55e540e-b65f-4276-9158-526490610b9f	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:40.40304-05
0ed17539-eac7-4c09-a81d-fce0c8ffdb9d	f55e540e-b65f-4276-9158-526490610b9f	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:40.40304-05
f7ca4481-4d38-4b81-bc98-77689e2a3d4b	791e4727-5851-482b-afe2-2371392c79f3	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:43.062685-05
2365ff51-bb38-4023-b9f2-2f4577db2949	2ae6825d-92f8-422c-aa20-d0c0bc7d5e59	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 19:36:51.050639-05
b629e2bd-6545-43b2-8d6d-58d24d2a76bd	2ae6825d-92f8-422c-aa20-d0c0bc7d5e59	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 19:36:51.050639-05
45cb49bc-b665-4343-8de1-291ee748b75b	6b154aee-2375-4a20-9be1-ab9faf374cba	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 19:36:51.549371-05
c95fe41f-7eaf-42c1-94cd-b44e7ae78940	6b154aee-2375-4a20-9be1-ab9faf374cba	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 19:36:51.549371-05
2057e16e-9253-4d22-9988-07b77ea62691	cae329cc-b83f-448b-a8b8-02b03e684097	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 19:36:52.515807-05
c27ffa93-1a9d-4a4f-9f8b-e7e110c62d54	cae329cc-b83f-448b-a8b8-02b03e684097	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 19:36:52.515807-05
0779615d-87eb-45d2-947e-424e7f11b3c4	791e4727-5851-482b-afe2-2371392c79f3	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:43.062685-05
87c23f6f-913b-4fb0-b409-c39f9b522b3e	c6a937e4-5124-41b4-a198-e5ad1e99aacc	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:44.070416-05
cb8699ae-8193-4e30-bbf4-bcf88b0b8804	c6a937e4-5124-41b4-a198-e5ad1e99aacc	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:44.070416-05
19f2de33-5442-412c-9b83-f8c3c3d90f22	e007c9a0-31cf-4e23-9c2b-66584faad617	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:45.121996-05
53b2448a-ad75-45d0-a785-1d66169173f4	a900f90a-c783-4036-9935-323ae4503ad3	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 21:53:18.26545-05
ab141ae6-2650-4a9e-ab39-da5f40ee8297	a900f90a-c783-4036-9935-323ae4503ad3	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 21:53:18.26545-05
fa2057fb-1788-4a0f-a8bc-7efd1fb6f4bd	0236dbba-48e4-4cc5-9d40-65d4825a1587	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 21:53:18.858543-05
2c2d9048-bf66-49a5-b5b4-78855e44945f	0236dbba-48e4-4cc5-9d40-65d4825a1587	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 21:53:18.858543-05
b5946f95-3b13-424d-ad33-a771d54e7f5e	0f586b84-9ca5-4656-a21e-ac84c62dc340	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 21:53:19.982609-05
70cef36f-105e-4ff6-92b6-3519f3750b24	0f586b84-9ca5-4656-a21e-ac84c62dc340	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 21:53:19.982609-05
04873a84-810f-4f61-9fc2-9e7d3fd28ffc	e007c9a0-31cf-4e23-9c2b-66584faad617	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:45.121996-05
9a91b0a5-7ace-4afc-91eb-8eb70e24e92a	5685c1b4-d004-473f-a8e2-2749cbfae92e	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:45.608261-05
ff7c922d-f52e-4b1d-9641-602b0bc8a2fe	5685c1b4-d004-473f-a8e2-2749cbfae92e	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:45.608261-05
59f92bf4-ff97-4996-aef4-6679f86b792a	bf59852c-8666-4f58-b5ae-b40369271ed7	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:46.073711-05
605f6f98-6935-4b6b-a5f4-67b0c2b9f8c4	0cf4e6b1-f499-4231-9b7d-2b752937ab1e	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 21:54:44.413839-05
f5c46e04-9d98-498c-b12a-ca27a70b6290	0cf4e6b1-f499-4231-9b7d-2b752937ab1e	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 21:54:44.413839-05
9ec4cc3d-06c6-45d6-ae69-d636c2c5cbd4	7f50d24d-66f2-46e2-81c3-ee8d864fdb97	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 21:54:44.94918-05
bd7c15dd-7af2-44e5-aeb2-83a1ba7fe395	7f50d24d-66f2-46e2-81c3-ee8d864fdb97	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 21:54:44.94918-05
8c02b52c-16f8-490e-8fcf-9a3b1529c8e1	2043315d-779d-4e6d-b0ba-b77df1832c83	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 21:54:45.973321-05
dd4f96c3-9a03-4d4c-9124-8df330f09c91	2043315d-779d-4e6d-b0ba-b77df1832c83	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 21:54:45.973321-05
d455e017-8e40-4cb3-abc2-20836084c66c	bf59852c-8666-4f58-b5ae-b40369271ed7	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:46.073711-05
21d742ea-b47b-40d9-adff-789d09e12fb7	5fc96667-49f1-4f44-97ee-245cfba994d7	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:47.138998-05
ff17b3f5-e89a-47a4-b6c4-846cb34717b8	5fc96667-49f1-4f44-97ee-245cfba994d7	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:47.138998-05
5bc56cbb-7710-4c1a-939b-219665287c6f	6628cfc3-d739-4b24-b805-57c466dc1f0c	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:47.6539-05
934dba12-3608-4267-ad1d-42b230379e9d	46864330-b89f-4352-b36d-41d0e0193dd1	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 21:55:34.088503-05
f9a13a5b-97fd-4e7f-95b3-df7fcae13c74	46864330-b89f-4352-b36d-41d0e0193dd1	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 21:55:34.088503-05
c11e0a57-3065-4cae-be9b-4f1656330878	1b6fd34f-5a0b-4898-ae6e-b082a9cfcb38	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 21:55:34.662575-05
5a507bc1-4f2e-4a94-b4bb-a8df067135d6	1b6fd34f-5a0b-4898-ae6e-b082a9cfcb38	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 21:55:34.662575-05
d21cf595-2b8b-4599-a958-a3a9ae857dfd	40be659b-b657-4eea-b36b-9671e06c9cf9	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 21:55:35.659234-05
eb3f7853-a574-4830-a0ed-b5347e4fb502	40be659b-b657-4eea-b36b-9671e06c9cf9	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 21:55:35.659234-05
aaca66f0-4865-489e-93d4-d05dd1fb46a1	6628cfc3-d739-4b24-b805-57c466dc1f0c	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:47.6539-05
a5a17502-237c-499e-9534-72fdf719b7fd	8c672955-d4d1-4d9e-b308-228a07ecd857	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:48.738895-05
d80b6996-0897-49ea-8ee3-cb4263e8ef5e	8c672955-d4d1-4d9e-b308-228a07ecd857	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:48.738895-05
d5baba97-fa5c-49a7-a11a-2aade945d07a	c9c5e252-1f4c-4f53-a82c-56f74a52af4d	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:53.431118-05
364a08e8-5bb3-4af9-a5ad-e1099c962acb	c9c5e252-1f4c-4f53-a82c-56f74a52af4d	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:53.431118-05
cb506c1f-53ef-4a07-93d1-1ced02d987c6	60677628-0b09-45ce-8130-85c619700a5f	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:35.32404-05
643a1725-4ada-49fa-bac6-0dc74c2ac17e	6e98f4d0-176f-400b-9480-a17a948c615e	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 22:12:53.291364-05
f5b31e71-70bc-429f-88c2-d06a22eadf99	6e98f4d0-176f-400b-9480-a17a948c615e	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 22:12:53.291364-05
4bb80e3a-0086-43ef-ac58-f395164f24f3	9d5ad988-6594-430b-9835-b26b5a5d1710	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 22:12:53.883005-05
8ff67bab-6426-4dbb-9d7b-3dde24c1a909	60677628-0b09-45ce-8130-85c619700a5f	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:35.32404-05
593f16fc-5310-4537-8ea0-3c103f3fd2fd	9d5ad988-6594-430b-9835-b26b5a5d1710	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 22:12:53.883005-05
c0dddd09-8687-4790-a014-e5cff6a26fba	0d67a491-8680-4eb9-8894-f52389467836	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 22:12:55.394489-05
50246d9d-d4e6-4616-b17e-6487f5daeb52	0d67a491-8680-4eb9-8894-f52389467836	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 22:12:55.394489-05
231c3869-ca3a-4ce2-93c2-ffbce13f4082	af9684cc-46f5-487b-830f-1f303f3d2d68	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:38.119337-05
7ad339a3-cfe4-43a2-9341-7cc714bf11dc	af9684cc-46f5-487b-830f-1f303f3d2d68	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:38.119337-05
87821e8a-8c71-4672-acd1-5bd95d165274	1c7d8717-6837-4184-b967-d1436ba40370	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:40.092383-05
33621ca0-6ded-49b6-8032-8715f7c5e09b	1c7d8717-6837-4184-b967-d1436ba40370	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:40.092383-05
a79444ca-5a3c-492e-9a3c-f2998528bba0	9de1ec14-f464-4228-a1fa-958b9bafd0aa	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 22:13:53.528073-05
84e973d0-a5e8-4561-a7d8-105fb06b534e	9de1ec14-f464-4228-a1fa-958b9bafd0aa	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 22:13:53.528073-05
c6b0ab36-e985-4496-b4f1-3dbf95d4733b	48299db7-d224-4c37-b1fe-b8c29b39e3f4	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 22:13:54.388078-05
a2dbd9e0-1250-43c9-8467-0754db034ff3	48299db7-d224-4c37-b1fe-b8c29b39e3f4	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 22:13:54.388078-05
eb55b7a9-91e6-48e0-99c1-144fc02cf497	500a3368-5e72-4e35-99ac-70dd19288a04	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 22:13:55.625024-05
9e0de7b0-075d-4bf8-99ed-429d8ce46788	500a3368-5e72-4e35-99ac-70dd19288a04	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 22:13:55.625024-05
fbafff62-10a1-44e1-bc23-49626cd53382	4115b67c-8b2b-4c95-9bcf-2174f3c30c97	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:43.114477-05
94ae42f3-4455-494a-b733-44a350d8c26a	76bd9b02-1236-4131-a527-25be71b6c0f6	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:44.007093-05
1e978535-4bf4-4481-8e18-555e98916d2e	76bd9b02-1236-4131-a527-25be71b6c0f6	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:44.007093-05
5b1eebd5-b52f-4e0f-90e4-51830ba8130f	4c744bbc-8c73-4cbc-ab29-cc077802957e	\N	terms	v1.0	t	\N	node	2026-07-23 17:51:44.968402-05
cb837d7a-2d84-4fbd-b14f-ae51f1bf5e58	4c744bbc-8c73-4cbc-ab29-cc077802957e	\N	privacy	v1.0	t	\N	node	2026-07-23 17:51:44.968402-05
2ee3f100-4a4b-4653-8d66-199a61a4f8bd	979ff6f8-9a13-4af3-a23a-8f233234e249	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 22:23:47.261721-05
8ce7448c-7f95-4a34-a382-afb845b87da4	979ff6f8-9a13-4af3-a23a-8f233234e249	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 22:23:47.261721-05
0c8c58fe-1b0c-49e2-a62d-9d2625ba02a6	ebde703c-3309-45af-909b-d9ceeeb0118b	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 22:23:47.838348-05
413577da-20cf-471d-a7ce-1385feb4725c	ebde703c-3309-45af-909b-d9ceeeb0118b	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 22:23:47.838348-05
8ccfff90-5e02-4d1a-8b4c-4121107ee773	37075a78-5f8f-4929-9b4f-75db12a04cd0	\N	terms	v1.0	t	38.242.194.196	node	2026-07-18 22:23:48.794353-05
47b21360-57af-4f39-9ac0-dbe5a33114e0	37075a78-5f8f-4929-9b4f-75db12a04cd0	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-18 22:23:48.794353-05
2c13873a-f0ce-4963-b0a2-8b33d646d5d1	b706df1c-3c23-4924-be03-767346ec976d	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 00:00:19.078455-05
14bb8565-3f45-4658-8284-93bec40419a4	b706df1c-3c23-4924-be03-767346ec976d	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 00:00:19.078455-05
0279ca36-233e-4f64-89be-be2cb9e709c2	260b20c9-58ac-49f4-9f40-d84e1c153bf1	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 00:00:19.758089-05
fef0ef1e-242f-4884-a16e-f52aef7a8ba4	260b20c9-58ac-49f4-9f40-d84e1c153bf1	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 00:00:19.758089-05
6f6a1602-a812-4215-a5e0-a0c5fce4be04	558c638e-c8f1-4f21-bba6-56f710305ac5	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 00:00:21.302409-05
5480088a-328b-4c95-80f6-c38985702197	558c638e-c8f1-4f21-bba6-56f710305ac5	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 00:00:21.302409-05
b12f6e9a-752c-4287-9099-ed78ac3a77c9	70d1e47a-fc7a-43da-914d-890fb65e36af	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 00:26:42.989847-05
9d994046-1004-4822-b95d-361640390ae6	70d1e47a-fc7a-43da-914d-890fb65e36af	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 00:26:42.989847-05
171b413f-cf98-40ef-b37e-edf0170f321e	18f57014-a9dc-48c6-bd9d-e78ddbc5597f	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 00:26:43.629253-05
5400a246-f5db-46c4-83a0-4eff22cc88e2	18f57014-a9dc-48c6-bd9d-e78ddbc5597f	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 00:26:43.629253-05
3c485bb7-42de-44c3-a8eb-25c2c36e3f1c	c56623fd-6b07-4831-9aef-85606b143ee4	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 00:26:44.685776-05
be470065-aab6-45e5-a290-c44320df4b19	c56623fd-6b07-4831-9aef-85606b143ee4	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 00:26:44.685776-05
cd9969f9-b471-4b7a-9d14-848160912141	81a3a658-663d-4983-a014-f995db220aa4	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 00:48:01.899853-05
a1655627-7bb5-4d98-beab-880a93f40bdd	81a3a658-663d-4983-a014-f995db220aa4	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 00:48:01.899853-05
41083d08-3aa8-4d54-94d4-d6bab7fa3507	dd1568fc-68bb-4bf6-9e05-233f503d478b	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 00:48:02.540271-05
0fe35b14-478c-43f3-92f9-c8093be635ff	dd1568fc-68bb-4bf6-9e05-233f503d478b	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 00:48:02.540271-05
e3fcf293-8954-4dfd-9f1a-e5d1ac710553	e3f13a74-e3bf-4a6a-9c04-c6c3e600bc7a	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 00:48:03.8336-05
896ea31b-7c37-4f1e-b9e7-0f17c6c85d46	e3f13a74-e3bf-4a6a-9c04-c6c3e600bc7a	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 00:48:03.8336-05
2229f9bb-e1b2-45d0-b038-ae755444fdea	2f1367b2-4d73-456b-88a5-b10521de7c1d	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 09:22:11.82762-05
fc74fed4-ab21-456a-9a26-e153b4c3ab7d	2f1367b2-4d73-456b-88a5-b10521de7c1d	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 09:22:11.82762-05
9c06beb5-c95c-4da3-a5ba-859e620d6177	59100546-2b3c-4d60-8f89-0513f25535ea	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 09:22:12.353992-05
d063d70c-ceaf-4fd4-99fb-45f9bf09953f	59100546-2b3c-4d60-8f89-0513f25535ea	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 09:22:12.353992-05
31d207d5-1744-43b8-aaf9-8c6acd073801	0c8ce9d2-0d76-416a-a3e3-b550280b8912	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 09:22:13.539847-05
a94521bd-4439-4015-a6fc-1c7f4ea3228d	0c8ce9d2-0d76-416a-a3e3-b550280b8912	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 09:22:13.539847-05
206ee212-0b52-4f39-a330-7b3fd4477b2a	1bdc0caf-d672-49de-aa01-72992ff0665b	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 10:01:23.075501-05
0397fd7e-561e-46b0-a90a-67b5179877af	1bdc0caf-d672-49de-aa01-72992ff0665b	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 10:01:23.075501-05
a79af0c7-247d-4d4b-9972-e5bf41200fe4	38cbca7a-1cdc-4a23-b224-e546d67e061d	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 10:01:23.762432-05
a0eddb36-3f72-4433-bc16-1c2811aa82a2	38cbca7a-1cdc-4a23-b224-e546d67e061d	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 10:01:23.762432-05
30c95868-aaec-4793-89c2-cc8a399b7d7a	830699f1-cdf1-4c2e-9a6e-e2462cef549e	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 10:01:24.928048-05
5155e77a-50b1-4605-b429-dafebce684a8	830699f1-cdf1-4c2e-9a6e-e2462cef549e	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 10:01:24.928048-05
151b82cf-bcd6-438b-a6aa-f95cb94f3f11	be2d04a0-6be5-4b72-b7e6-4b721cc1410d	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:55.01388-05
54bc7ef5-eed9-406b-a62c-76863a1c57e2	bc57d151-9ff4-49ba-92c6-a8f4241c7687	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 10:16:20.051832-05
f07baffe-564b-4546-8ae2-3087283cf8e9	bc57d151-9ff4-49ba-92c6-a8f4241c7687	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 10:16:20.051832-05
7adf1072-91f2-4ac9-b61b-b9b3bdc1fbff	b57ff7b7-a707-44ad-a65b-6ea2308e5ca5	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 10:16:20.832583-05
7f97b86c-d0f9-4298-9b0c-5aa811a79300	b57ff7b7-a707-44ad-a65b-6ea2308e5ca5	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 10:16:20.832583-05
e8832692-d819-4a79-827d-751c6f28122d	9009e21c-3a0c-4a11-b5da-445f02e9ef01	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 10:16:22.573405-05
cb350005-c90e-408b-8847-d7c9b746fb91	9009e21c-3a0c-4a11-b5da-445f02e9ef01	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 10:16:22.573405-05
4fd4a685-87a9-4c75-b4fb-b02463740881	be2d04a0-6be5-4b72-b7e6-4b721cc1410d	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:55.01388-05
9a9980a9-7742-4261-8289-ae58e42991be	0e74a23c-eb41-42af-a4a0-08d047f17234	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:58.365209-05
b0bedf9d-d90f-4ab2-903a-f2f80582d90c	0e74a23c-eb41-42af-a4a0-08d047f17234	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:58.365209-05
08ff4e4e-78fb-4e43-befb-6dca7d73dcfa	0a3eb64d-bbfb-4137-9a80-907b0dd04a10	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:59.49737-05
0f9e837e-b6a2-45e3-adb1-66717e5426d3	c1b87145-800e-41c9-a293-799773ca5b31	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 10:20:46.387174-05
8aaed1f3-2194-4d93-b2ba-fffb473e3097	c1b87145-800e-41c9-a293-799773ca5b31	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 10:20:46.387174-05
24f201d2-75cb-455f-91e8-45f994b63498	ae406b22-a870-4a32-88f5-053b844d9029	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 10:20:47.388846-05
418cc66f-d03a-4776-bed8-92f5df90b083	ae406b22-a870-4a32-88f5-053b844d9029	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 10:20:47.388846-05
935c06d0-b200-4fef-ae45-bda367f4a0f3	b1de0165-3cf1-4b65-9ce6-6f02926b8ca9	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 10:20:48.382071-05
b90bc6f7-4750-49a8-9e30-e8100db09cf5	b1de0165-3cf1-4b65-9ce6-6f02926b8ca9	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 10:20:48.382071-05
7569af62-1d16-477a-885d-1433d1b5fad5	0a3eb64d-bbfb-4137-9a80-907b0dd04a10	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:59.49737-05
02367838-a9ef-47f0-874d-83b21ee36759	34c9d2fe-2445-4034-9e73-208323817d79	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:01.316819-05
4899cf2d-1681-4b17-ab1d-c454d92f5366	34c9d2fe-2445-4034-9e73-208323817d79	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:01.316819-05
db0261bc-1f1c-408b-83a0-a58239dad66b	d20bdb35-2f60-4570-863c-df8e6edea9d0	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:01.806534-05
d63cbd13-a7b8-4a0f-ab25-a7d2266f4995	bcb501a8-67bc-4a57-b9ff-5716b74c1043	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 11:13:29.631565-05
f787e6e5-8830-46c4-9ddc-05ad1a3a2263	bcb501a8-67bc-4a57-b9ff-5716b74c1043	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 11:13:29.631565-05
752b49e1-deee-456d-a09e-365258b09cd7	07f3fe90-fc1c-4f8b-8d20-7767f67cce15	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 11:13:30.427427-05
433a84ff-12ab-42c1-bac1-8122de5f092f	07f3fe90-fc1c-4f8b-8d20-7767f67cce15	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 11:13:30.427427-05
0dfed0e0-f31f-48e2-bc7a-ba74a95db4de	57dbb985-45b4-4a67-bc3f-b32ce5ea179c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 11:13:31.690344-05
8f73ed4e-6f14-4467-bdcb-388c06ac62d0	57dbb985-45b4-4a67-bc3f-b32ce5ea179c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 11:13:31.690344-05
2ac344c0-4a2e-4f20-b321-5d9d4293994d	d20bdb35-2f60-4570-863c-df8e6edea9d0	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:01.806534-05
dc9342f9-c329-424b-98d6-0b5895fc725d	4d50e9c0-5b96-4969-9131-85ef648d342b	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:02.366191-05
902f36ba-b5c4-441e-bcd7-4c34e2d7f604	4d50e9c0-5b96-4969-9131-85ef648d342b	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:02.366191-05
cdf77d98-1e60-4b6a-a4c4-62300ae3188c	383ac6aa-d725-4d6c-bc92-d4f99882842f	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:03.867817-05
fb78be03-7835-463b-b6f9-e55f52df41c1	383ac6aa-d725-4d6c-bc92-d4f99882842f	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:03.867817-05
c083ed3a-1baa-42b0-9320-7be07bf45aaa	86a2c8b1-90b7-47c6-b90a-6a6944f49414	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:04.859068-05
f15a11ef-4ab0-4e1d-9f90-5fd6f4d5b85e	56b630d8-a2ea-4f3e-9acb-9bccbee86955	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 12:15:56.063093-05
23deeaa9-a362-4141-97ec-aa3b77d76cdd	56b630d8-a2ea-4f3e-9acb-9bccbee86955	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 12:15:56.063093-05
398e716e-5425-41c4-927c-077ed1e43663	de93d678-09a3-4332-9ac1-ed9e1ef119b7	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 12:15:56.683691-05
49768704-2a6b-4471-8aee-1a3be47b0a27	de93d678-09a3-4332-9ac1-ed9e1ef119b7	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 12:15:56.683691-05
0d8a6f85-19ac-4355-9b35-e757fa9b2da3	9ffad944-0748-43f2-8c50-ed573e4e8c19	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 12:15:58.056428-05
29cfaef3-7fbd-4ca9-9684-125a5ad914c5	9ffad944-0748-43f2-8c50-ed573e4e8c19	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 12:15:58.056428-05
efa35f63-6cc2-4949-aed5-e0a80f24fe80	86a2c8b1-90b7-47c6-b90a-6a6944f49414	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:04.859068-05
8799e252-c38d-4967-a098-901c884811d6	795720a4-19ac-4e1b-8b07-4f45c5823fd8	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:06.040138-05
4fc23d45-bdd7-44bd-b70b-7862702effd5	795720a4-19ac-4e1b-8b07-4f45c5823fd8	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:06.040138-05
9230e4b2-8dcc-45eb-aae5-0ee68641f357	9be1b916-0010-4f7e-89dc-d345b2452d5b	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:30.15546-05
6adc0829-23c7-45b6-83b9-ec2bb0268d55	6cf91698-b30e-4092-b46d-4005a8dae99b	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 13:11:23.591152-05
a377cb1f-7a0c-4f0a-b13e-5820d7e85f64	6cf91698-b30e-4092-b46d-4005a8dae99b	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 13:11:23.591152-05
9a83d0ec-8f0a-4ed8-8a51-8982d5a3efc5	8adf6f40-c312-4a8f-ac48-8fbf31944d53	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 13:11:24.330032-05
21c89325-4119-459c-9b69-56fa9bf7d738	8adf6f40-c312-4a8f-ac48-8fbf31944d53	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 13:11:24.330032-05
b92dd021-7224-41a3-aa3e-13a5eb1e55c2	9ffc90e7-d448-4abc-bb04-544901c14a30	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 13:11:25.473929-05
2615ab6b-7514-43f3-a084-9990e5666644	9ffc90e7-d448-4abc-bb04-544901c14a30	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 13:11:25.473929-05
860aa4db-2c89-4337-b1f6-88ebed5fae32	9be1b916-0010-4f7e-89dc-d345b2452d5b	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:30.15546-05
73fa9394-5451-4b1e-af54-cb279e482b8d	56b850df-3abb-4812-9498-2f2ccba31508	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:31.925186-05
6dfdabb9-740a-4a16-8fcc-83f1f4af9c9a	56b850df-3abb-4812-9498-2f2ccba31508	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:31.925186-05
08ea5053-6eac-4591-9b17-503b63278684	21edbd2d-92b8-458a-933e-0337e799bb60	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:41.095764-05
96ee9e8b-7665-409d-b621-9b2f98d98469	5c144462-4810-40c7-811f-6e820a779e9a	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 13:19:19.664565-05
dc2bd729-2415-45d6-b493-35799d90b020	5c144462-4810-40c7-811f-6e820a779e9a	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 13:19:19.664565-05
f8fa13a3-21de-4bb4-a4a2-d11f4a5f4f44	b946625b-3fa5-4aed-a023-d096e8fa2476	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 13:19:20.306026-05
74f3f35f-a91e-4b5a-b999-b4eb35a57758	b946625b-3fa5-4aed-a023-d096e8fa2476	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 13:19:20.306026-05
37a74186-5f6f-490d-97a2-a310444154fa	52686dbc-b17d-4407-88c3-cb0e87d13754	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 13:19:21.443299-05
d654b13c-f573-41fb-b2c3-7e70baf4bc56	52686dbc-b17d-4407-88c3-cb0e87d13754	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 13:19:21.443299-05
be31dc67-3708-4ac1-be21-9bdde896301a	21edbd2d-92b8-458a-933e-0337e799bb60	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:41.095764-05
d7b92a7b-ce8b-43c4-82da-6b051f7b97b7	0cebc6f7-4862-4ee3-9731-ac7ad9450830	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:43.194902-05
b67cf1f6-67ac-45ca-ba2d-61ec798a8bba	0cebc6f7-4862-4ee3-9731-ac7ad9450830	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:43.194902-05
d2549f8d-a505-417b-b8df-d9499eaf9831	2bfb3707-124d-44bf-9977-820b8fdfc21c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 13:31:45.78706-05
07e20603-625f-4158-87c3-2464b94ddeb4	2bfb3707-124d-44bf-9977-820b8fdfc21c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 13:31:45.78706-05
17dae63d-cc0c-45e5-b5ff-e4c63f775895	29caca55-2628-46cc-9889-12cf70c0a7cb	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 13:31:46.693077-05
78a2fc83-4d3e-4799-ac1b-3988b098af71	29caca55-2628-46cc-9889-12cf70c0a7cb	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 13:31:46.693077-05
03210256-754e-412d-9620-bc6c497c5527	cc0f243b-34ef-4458-96cd-93eee3497633	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 13:31:47.946233-05
cc03a688-fc83-4ff4-98a0-216e43554617	cc0f243b-34ef-4458-96cd-93eee3497633	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 13:31:47.946233-05
3666bd1e-dcd5-41fa-bdfb-d0dd2a275d24	ef3610ec-2575-4be6-a8cd-f15f580818df	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 17:32:13.572344-05
e7a295c0-af2b-461d-a904-c6bd0b85a531	ef3610ec-2575-4be6-a8cd-f15f580818df	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 17:32:13.572344-05
8051be49-f67e-4aa2-9ccf-517ecf998be8	40b0318f-e20b-419a-aad9-9e94e773855f	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 17:32:14.234865-05
1847f41b-5ae0-4b00-af18-765d5071845f	40b0318f-e20b-419a-aad9-9e94e773855f	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 17:32:14.234865-05
00bfd4ed-4dcd-49dc-a5d4-349a46f5fe35	b7e4e75e-62d3-4067-8d3b-e7778844fe1f	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 17:32:15.486074-05
feb5f30e-2ea9-4769-8083-1389dad34a8f	b7e4e75e-62d3-4067-8d3b-e7778844fe1f	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 17:32:15.486074-05
9e72dfd8-6425-44c3-b729-3985e1749dc7	3f056c1d-9345-4cec-a785-65f53a83b8b9	\N	terms	v1.0	t	\N	node	2026-07-23 17:14:55.592494-05
7c8f10d6-1e14-4c9b-98c2-efea02c51e89	3f056c1d-9345-4cec-a785-65f53a83b8b9	\N	privacy	v1.0	t	\N	node	2026-07-23 17:14:55.592494-05
ae07011a-623b-4fa4-b3c1-be099b3308ad	1138d83b-30b7-42e4-b4b6-a764f5928205	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:42.96233-05
5cad4a50-e593-4e48-a697-9ed89cf14c22	1138d83b-30b7-42e4-b4b6-a764f5928205	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:42.96233-05
27313387-501c-46ac-94fe-f1d87a6ffe40	0a4b778c-485d-4a1b-9179-ea7b9e7fff83	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 17:41:46.064724-05
cc4985a9-a239-4558-8a97-1aec126a9349	0a4b778c-485d-4a1b-9179-ea7b9e7fff83	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 17:41:46.064724-05
c199974b-a151-4772-8791-6f35f2415ded	b8f64bfe-0851-4c9a-bc85-45a237051395	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 17:41:46.828796-05
3a85db1f-96c9-448a-855d-044dd6ad21f3	b8f64bfe-0851-4c9a-bc85-45a237051395	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 17:41:46.828796-05
912505ae-9066-4346-96b1-970086860c2f	17ac4148-215f-4a55-8b89-a3432ab05b92	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 17:41:48.182305-05
84a2f7b7-e5e2-47c7-b4f5-4e47fcaf3f2e	17ac4148-215f-4a55-8b89-a3432ab05b92	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 17:41:48.182305-05
c9933ad1-64e2-4e88-9a8f-586785cd5a7e	9979afd1-5bca-4e19-900c-fe6559262ee7	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 17:43:30.9375-05
aec2023e-f40e-4798-900e-0ff2075277fc	9979afd1-5bca-4e19-900c-fe6559262ee7	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 17:43:30.9375-05
54559997-ad99-40ea-8b20-9e80262db49d	5c6653f9-4ef8-4e42-a8d8-4136412a13aa	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 17:43:31.51018-05
c1354424-fa64-49c6-9c5e-a0fd585b6a50	5c6653f9-4ef8-4e42-a8d8-4136412a13aa	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 17:43:31.51018-05
39a121c9-ccf0-4eca-98f6-f78f458b3d05	a085aa28-b809-49a8-bec8-d8391ede1b70	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 17:43:32.642316-05
4905d51e-2756-4d26-9f3a-838120193306	a085aa28-b809-49a8-bec8-d8391ede1b70	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 17:43:32.642316-05
97945b8c-a184-474e-aad9-b592eb07e5a5	f8b3843c-55ca-4bd9-9888-efc3c6eed559	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:03:22.074527-05
2f134035-1c87-43a1-a084-60099bec01f5	f8b3843c-55ca-4bd9-9888-efc3c6eed559	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:03:22.074527-05
5b50f239-40b9-4285-8c7d-1559fa50887a	8ea82a91-46bd-456c-8539-6ae502d2dd21	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:03:22.652897-05
8acf933c-3998-4025-9605-2d73d8f8857f	8ea82a91-46bd-456c-8539-6ae502d2dd21	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:03:22.652897-05
23a995fd-521a-441f-b305-266dba160df8	c687923f-5b25-4d6e-a5ef-f5e89b8c0cf2	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:03:23.67967-05
a4e2da4a-f12e-4e73-9df5-3aa39dac6c67	c687923f-5b25-4d6e-a5ef-f5e89b8c0cf2	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:03:23.67967-05
6a5a5284-8d23-42ec-a862-6207ef731beb	428d7be5-1e52-4cec-9268-4dc360d64778	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:04:23.939426-05
00bc3bd7-a831-4be8-befc-a2398d70c195	428d7be5-1e52-4cec-9268-4dc360d64778	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:04:23.939426-05
b76bf59e-070a-41e8-ab08-a42301a95e5d	23bbe1da-da24-424f-b978-6e08c3b154b7	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:04:24.647142-05
ec9d5e05-d262-41c8-948c-5b27f9dfea08	23bbe1da-da24-424f-b978-6e08c3b154b7	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:04:24.647142-05
9d1827ae-34c1-4cbb-b0a8-8da147b1e711	30394294-13f3-4a22-a056-c14fca1f6ac4	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:04:25.643429-05
932b2f09-1fff-42bf-aa31-90e859941395	30394294-13f3-4a22-a056-c14fca1f6ac4	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:04:25.643429-05
51c18fe0-888c-47e1-9328-33641e2a418e	305a9faa-3edf-4245-bc7e-3b0217bd51b2	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:45:18.061347-05
8a583b39-9eb8-4757-894f-1862842b4611	305a9faa-3edf-4245-bc7e-3b0217bd51b2	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:45:18.061347-05
7a6b9936-3546-4772-b69b-c08c32b8083e	17deff3b-82c1-4060-af04-ea5a68cfc217	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:45:18.869895-05
1ac013ca-276e-4ef0-8e4e-bbf9999fe522	17deff3b-82c1-4060-af04-ea5a68cfc217	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:45:18.869895-05
9634de0e-753f-4553-93ec-b7859eb2c029	fc10fb8e-09bc-4eaf-85a0-5b49a3d18ebb	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:45:19.979193-05
9b9f9d6e-52b9-4cc5-b668-e3f75ca54245	fc10fb8e-09bc-4eaf-85a0-5b49a3d18ebb	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:45:19.979193-05
79d3d582-09b4-4c40-893b-01c788a9049c	2b6436ca-e882-4749-a4cd-eb38d3861046	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:45:28.661312-05
df861202-4069-48f0-ac32-7b1f6b23db42	2b6436ca-e882-4749-a4cd-eb38d3861046	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:45:28.661312-05
06a6a25c-9ea2-4e23-85ba-48f28bd43523	4ac7da40-bfed-4a3c-9288-bf3df1c155aa	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:45:29.608156-05
afe10011-4a61-4042-9202-422360d401d7	4ac7da40-bfed-4a3c-9288-bf3df1c155aa	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:45:29.608156-05
060fade5-f98a-4943-91cc-53f678633df1	48ba5c10-a774-4b21-bca3-f2f3cc653e7d	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:45:30.818895-05
50f6bc8c-7ff7-49cf-be23-4c101fe36877	48ba5c10-a774-4b21-bca3-f2f3cc653e7d	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:45:30.818895-05
c83de0fe-5578-4971-8475-e3ee3841372b	6252ece0-c608-483f-8f93-cf15e1a3644d	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:48:52.308703-05
934ac175-0a8d-48f5-8b3e-e77e6ea5c743	6252ece0-c608-483f-8f93-cf15e1a3644d	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:48:52.308703-05
90d73e61-505b-42a7-b671-67e6be352dc9	2726fd44-8326-4b2e-840e-e041f9b7b1c9	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:48:53.090929-05
40976843-3a45-400a-962f-05f77a9ba235	2726fd44-8326-4b2e-840e-e041f9b7b1c9	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:48:53.090929-05
70a43ead-fc0a-4dab-8f3f-2baeffd83210	0e1a2125-f484-4770-8701-c3a0ab346997	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 18:48:54.306085-05
8c8e72ce-f77a-4d59-90a1-92c83e81d13e	0e1a2125-f484-4770-8701-c3a0ab346997	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 18:48:54.306085-05
d6c3c2b2-8bf6-4a94-b8a1-bdf4f64fe966	a6ca1e85-393f-431b-9c8c-95a17ff328e2	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 20:12:27.982395-05
988a1817-5e47-4498-8930-ecc888160c25	a6ca1e85-393f-431b-9c8c-95a17ff328e2	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 20:12:27.982395-05
fc36755c-5098-4b37-8d2e-8fe8a223f8f7	96609694-d769-4975-b470-3f0af63f5e33	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 20:12:28.98904-05
9d69ff67-a427-47c4-87b1-3c7a5c44be62	96609694-d769-4975-b470-3f0af63f5e33	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 20:12:28.98904-05
2ae91623-3944-4dfa-a5c0-6c5c6dab453f	61adcf55-e33d-4616-9540-6bf74acf3a5b	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 20:12:29.968085-05
790f840a-7897-4caf-a5ba-ff87396b0645	61adcf55-e33d-4616-9540-6bf74acf3a5b	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 20:12:29.968085-05
9921d2b6-b778-4fc5-9330-b28df67b4710	68a4164c-2d5a-495e-8309-b23864a68542	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:32.255203-05
c329c851-8833-4bef-be83-b578bb886f09	68a4164c-2d5a-495e-8309-b23864a68542	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:32.255203-05
f5930336-eaa6-4c23-a12d-14f8c3cb3f02	79f86ba9-f562-45a4-929a-f9fe13d52cd5	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:45.732475-05
e81693ae-e4f2-43cc-968f-b1f6317b0c40	79f86ba9-f562-45a4-929a-f9fe13d52cd5	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:45.732475-05
970bc69e-6d20-44ef-98a0-46f96a3b7c62	e9d3ea42-7b6f-466f-84f1-8ce015dc82bb	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 20:22:14.712478-05
7c46b119-e19d-4619-ad09-feb758bf817d	e9d3ea42-7b6f-466f-84f1-8ce015dc82bb	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 20:22:14.712478-05
7a78c345-0952-4878-8aca-f880aedfcb1f	6c4e6d0b-fe54-469f-8382-29d716df1b84	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 20:22:15.369039-05
79f3a003-ce72-4ff5-a2dc-3f7e33e4f140	6c4e6d0b-fe54-469f-8382-29d716df1b84	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 20:22:15.369039-05
baa08026-4e50-403c-8807-1c7e119f3e46	ecac1ef0-7578-457a-b476-ffed8ece11a5	\N	terms	v1.0	t	38.242.194.196	node	2026-07-19 20:22:16.690399-05
73735533-6c09-4a4e-af46-a9c19685c8e3	ecac1ef0-7578-457a-b476-ffed8ece11a5	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-19 20:22:16.690399-05
5120e034-852c-46ea-b6c2-f3f17e881047	ef914522-e769-45cb-9cd5-977b076c608d	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:46.72683-05
97dafb54-ad4a-4e52-ae08-3d05a753be6c	ef914522-e769-45cb-9cd5-977b076c608d	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:46.72683-05
b3d81463-3832-4748-a2df-0d33add06c2d	d9f87de1-51c8-4e83-a749-0ca28d099664	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:47.831901-05
8849159c-6d59-47c7-a6ef-2f3b62c77a69	d9f87de1-51c8-4e83-a749-0ca28d099664	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:47.831901-05
792ad60a-aa03-43a0-8c80-d8c0402fb6c1	9f779994-accb-4e3d-9e8a-57a4874040d4	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:48.344095-05
d9cff744-ef54-4468-a73c-e86c14495406	9f779994-accb-4e3d-9e8a-57a4874040d4	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:48.344095-05
26ebb42b-62f7-4c32-9291-085420901e8a	7950c817-5ff1-41a6-99aa-9681c3e93af3	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:48.835597-05
317470b7-dd20-4dd2-ae13-e504d8735428	7950c817-5ff1-41a6-99aa-9681c3e93af3	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:48.835597-05
0afa2b0b-66f9-4c7b-a1bf-00f2538d8ef8	a52a1e88-60af-4475-8cc1-72549ada4791	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:49.84888-05
cd08c99e-c573-4f7e-b179-856b4a0f5818	a52a1e88-60af-4475-8cc1-72549ada4791	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:49.84888-05
57e24e51-ec6f-41ed-ba41-163874b6d1fd	df011129-d85d-48e0-8ff2-4089c0c8a9e1	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:50.390842-05
be6e8525-4ecc-4c49-8473-1724cb0821a5	df011129-d85d-48e0-8ff2-4089c0c8a9e1	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:50.390842-05
9b780d55-18df-411c-ad0a-3f33ecea7166	4cd88e16-2c5b-4f73-adbd-31687cd2479c	\N	terms	v1.0	t	\N	node	2026-07-23 17:52:51.404468-05
83134d13-7ac9-4058-a396-661f2ff77ecc	4cd88e16-2c5b-4f73-adbd-31687cd2479c	\N	privacy	v1.0	t	\N	node	2026-07-23 17:52:51.404468-05
e214fa74-00f8-42d5-813f-c61722f26192	f0e7bbe5-1605-44b6-b069-0af7ea817e88	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 10:57:28.344476-05
ac9576c8-9eab-4e54-95cd-5a9d1b481592	f0e7bbe5-1605-44b6-b069-0af7ea817e88	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 10:57:28.344476-05
bcdd81ed-3a76-452f-939f-3f2b895de298	bc7718fd-3b93-458c-ba8b-758ecddb780e	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 10:57:28.899058-05
94201054-a31d-4c31-9938-ee05273d0bef	bc7718fd-3b93-458c-ba8b-758ecddb780e	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 10:57:28.899058-05
c4b41bdb-edd8-4049-a105-cca92a6035fa	e2542781-e1e2-4f2d-aa64-b12cd3dd57cb	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 10:57:30.070605-05
4a9b14a4-8e1f-4092-bda4-72a214384b54	e2542781-e1e2-4f2d-aa64-b12cd3dd57cb	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 10:57:30.070605-05
511f9656-689f-453d-bece-598cc7c2b2ff	5acb6a2f-b74b-4062-bbb6-5d4cca2469c1	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 11:29:02.591779-05
bccecd7c-bf1f-43fd-8374-55c54a547df3	5acb6a2f-b74b-4062-bbb6-5d4cca2469c1	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 11:29:02.591779-05
cde08129-7574-452f-9106-3e4d2d7d2359	a01cbd8a-2791-4e65-8a3b-54644f066d14	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 11:29:03.163132-05
40eeff14-f2bf-45f8-9042-1d4086c1ca7d	a01cbd8a-2791-4e65-8a3b-54644f066d14	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 11:29:03.163132-05
084d8355-9c51-40d2-b966-5367290e06ba	08e6e8b1-bacc-422d-a016-757ad0097e34	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 11:29:04.550748-05
91092ad2-d014-43f2-983e-b42d1ccd3f1d	08e6e8b1-bacc-422d-a016-757ad0097e34	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 11:29:04.550748-05
04eed424-2d26-425e-af29-2b1a83f9c85e	c58f2748-72d6-4f77-a619-9edc69aa8280	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 13:31:07.024143-05
e815c45a-7b51-4094-bb53-a5c5c18b78ba	c58f2748-72d6-4f77-a619-9edc69aa8280	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 13:31:07.024143-05
cecfa5f0-d2fe-457b-949f-04414fd092db	b848fc6a-1aa4-4a93-b77d-3d99d3fe5edd	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 13:31:07.653108-05
1ccfd2aa-73ef-4ed1-ab29-cdfb81acadc0	b848fc6a-1aa4-4a93-b77d-3d99d3fe5edd	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 13:31:07.653108-05
98bd8fbe-19e5-4090-8e68-1de85e61516e	a3f6ab64-5241-438e-87c5-76f9311714cf	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 13:31:09.099092-05
ec9ebab4-86f5-45c6-8703-cb22eb2b80ab	a3f6ab64-5241-438e-87c5-76f9311714cf	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 13:31:09.099092-05
987041e5-b037-4f6b-aab1-7b65707b3ed3	01dec765-be94-4c67-8846-59dc5632a5cc	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:34.62478-05
3812aa0c-266e-4990-9600-201264ae6d71	01dec765-be94-4c67-8846-59dc5632a5cc	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:34.62478-05
e9e41b2f-6bfb-431a-9326-ed1bd3d01c21	388d9c08-9f4b-41f0-8063-d106ad467f24	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:35.622464-05
a5eca953-b48a-41cd-afb6-771eeed5940d	388d9c08-9f4b-41f0-8063-d106ad467f24	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:35.622464-05
e99a24dc-d9c5-4242-918e-5c21fe6faeb1	8570bc16-2c62-4272-a085-ac8cef7a8a2d	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:36.719736-05
279c39f1-8e7e-4ef3-bf5b-0220f992c8a7	8570bc16-2c62-4272-a085-ac8cef7a8a2d	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:36.719736-05
5c5d7b68-8080-4cf6-9eba-9494f2cb574e	04c0f8a6-1d9f-4146-ac02-37644a1ebaf7	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:37.187502-05
126bf5b0-e880-49f3-9084-52e11b75ed72	04c0f8a6-1d9f-4146-ac02-37644a1ebaf7	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:37.187502-05
99e2fa39-b686-4f82-a666-ee87b793adea	1194fa3c-f9ba-478a-8ea3-06e21fe605ca	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:37.665667-05
832c9d76-a7c5-4cc0-bf66-008f00184986	1194fa3c-f9ba-478a-8ea3-06e21fe605ca	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:37.665667-05
48739884-e085-490f-b896-7104a427fe5c	7be30b09-9afe-433a-932b-bcd384a401ec	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:38.726708-05
d372922d-691f-44c0-bc0b-efe5b27abe43	7be30b09-9afe-433a-932b-bcd384a401ec	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:38.726708-05
d62c547f-78bc-4008-9569-50bf665c4c20	e1a34ea8-4651-4f49-befd-231e113becca	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 16:46:03.231787-05
b6d49eed-f978-4efb-b0cc-afe6c2d57a6a	e1a34ea8-4651-4f49-befd-231e113becca	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 16:46:03.231787-05
409b3d67-b31c-43ea-9d29-7fd114fc03de	2d8137da-1ab9-4109-8acc-c0c0d90a66f2	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 16:46:04.248359-05
05c802c2-9971-4689-8e6f-9895f44871bc	2d8137da-1ab9-4109-8acc-c0c0d90a66f2	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 16:46:04.248359-05
74488675-00c4-4b46-a092-a5d2d2e9507a	49b91607-d983-49e2-9b30-206a9dcacf39	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 16:46:06.013783-05
24e30d30-7eac-4503-817d-b3afe0451237	49b91607-d983-49e2-9b30-206a9dcacf39	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 16:46:06.013783-05
78dbcdd7-9933-4068-88de-466bb6b0984a	24d1d4f1-6236-4d31-badd-846670de514e	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:39.37414-05
9e27d80d-40b3-4346-92f6-db857d7ea714	24d1d4f1-6236-4d31-badd-846670de514e	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:39.37414-05
7dd45f26-b36f-4ac9-9dbc-ff30d10ad546	7f86fc8c-bc26-40db-bc7c-f6d1275fdc11	\N	terms	v1.0	t	\N	node	2026-07-23 17:15:40.455994-05
79cb95da-87cc-4164-be8e-97c6c3bce6f3	7f86fc8c-bc26-40db-bc7c-f6d1275fdc11	\N	privacy	v1.0	t	\N	node	2026-07-23 17:15:40.455994-05
85c3ef79-4f67-4286-81a7-0539f0313049	51d84e70-3991-4b59-86fa-619dbf6be258	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 16:59:11.417519-05
9a410f00-6268-4fdd-862f-854871542cb9	51d84e70-3991-4b59-86fa-619dbf6be258	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 16:59:11.417519-05
38fd7429-8ace-44c8-9df5-596c8c3109fe	057d6c59-5466-4b00-96bd-b05cf65d7f1b	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 16:59:11.941997-05
447fff6c-636f-449d-9913-b5428cb6158c	057d6c59-5466-4b00-96bd-b05cf65d7f1b	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 16:59:11.941997-05
cda02bda-d2df-4abe-9843-b63ffccae33c	4abff3f5-58dc-4592-8e7b-f8576c8c35af	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 16:59:12.917789-05
99fe0050-4fd3-41be-a010-8e7a18f505b6	4abff3f5-58dc-4592-8e7b-f8576c8c35af	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 16:59:12.917789-05
e83d898f-4b41-40fa-8c44-2ef69da688a7	d17f4bfd-48c5-4ec0-abe7-bada1ad9e510	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 17:08:04.520363-05
9a29d5f7-1933-49d7-be3e-c2e8a593d75b	d17f4bfd-48c5-4ec0-abe7-bada1ad9e510	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 17:08:04.520363-05
a28ae8c3-db60-4562-9c98-16f590c4d034	34e29ed7-9421-495a-bfa8-2cc97dd9e85c	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 17:08:05.486155-05
f37f1d6d-abac-4d8d-9e28-0a2623965513	34e29ed7-9421-495a-bfa8-2cc97dd9e85c	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 17:08:05.486155-05
61c1c6b9-1870-4e09-813d-c7be0609d2bc	cb9a7294-8e69-4e21-b1dd-7b3d099c0f31	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 17:08:06.703177-05
ae5c8700-3c25-4893-9b82-a2494b540cb5	cb9a7294-8e69-4e21-b1dd-7b3d099c0f31	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 17:08:06.703177-05
88a629f3-1bc5-4519-99b7-2e983d6cd537	b07344b3-e4e0-42c3-91bd-1828ccd1d37a	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 19:07:52.420171-05
cb631d66-f190-4bc6-a526-f2be1985e2eb	b07344b3-e4e0-42c3-91bd-1828ccd1d37a	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 19:07:52.420171-05
dcedde1b-b83c-48a8-bb8d-4c2070256939	9acd16c4-657a-47a5-b233-6cd15b3f5bdc	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 19:07:53.002563-05
64d9d1b6-cbaf-4b4b-9962-8bb3c4d97412	9acd16c4-657a-47a5-b233-6cd15b3f5bdc	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 19:07:53.002563-05
66f71cda-5084-4db7-99b8-a4baf16dd071	a46c5338-59e8-4a5a-aa29-80f8e7b86211	\N	terms	v1.0	t	38.242.194.196	node	2026-07-20 19:07:53.977117-05
577d1bf1-18d9-4389-af3f-f629027ba0c6	a46c5338-59e8-4a5a-aa29-80f8e7b86211	\N	privacy	v1.0	t	38.242.194.196	node	2026-07-20 19:07:53.977117-05
856e0aef-df65-473c-8cbc-cc4ecfc9dc93	d246c130-8da1-4f01-89a3-1cd60a813263	\N	terms	v1.0	t	\N	node	2026-07-20 19:36:58.116596-05
35463428-090f-472c-9e1e-3b4dfd391dc1	d246c130-8da1-4f01-89a3-1cd60a813263	\N	privacy	v1.0	t	\N	node	2026-07-20 19:36:58.116596-05
6640699a-5efd-42e4-8a6d-539bdb1df386	525f1ea1-a6ed-4397-9bd0-f71bcb3dba75	\N	terms	v1.0	t	\N	node	2026-07-20 19:36:58.753995-05
5c6d8599-4ba0-45ae-ba72-4ba73495c1d9	525f1ea1-a6ed-4397-9bd0-f71bcb3dba75	\N	privacy	v1.0	t	\N	node	2026-07-20 19:36:58.753995-05
e6a43174-9d98-42ea-b2e1-831344fffaa0	07c709cd-b640-4a88-ab4b-ef211dc36f56	\N	terms	v1.0	t	\N	node	2026-07-20 19:36:59.75145-05
50111f6e-a9e5-4d16-abcc-16decea00655	07c709cd-b640-4a88-ab4b-ef211dc36f56	\N	privacy	v1.0	t	\N	node	2026-07-20 19:36:59.75145-05
edac70fd-e704-4cee-a4bb-1d8aafc0ce68	11102364-7a38-4b24-af96-5063147a1a49	\N	terms	v1.0	t	\N	node	2026-07-23 17:16:06.253786-05
49ce0cc2-bb92-4852-b128-348c3fe7d77a	11102364-7a38-4b24-af96-5063147a1a49	\N	privacy	v1.0	t	\N	node	2026-07-23 17:16:06.253786-05
33edde0e-3105-4d74-abec-875bdbf92d43	9290ed56-10e0-4054-b66b-5e9456e71a87	\N	terms	v1.0	t	\N	node	2026-07-20 20:03:29.624758-05
713e0637-5f49-4c78-a293-6c210063fa87	9290ed56-10e0-4054-b66b-5e9456e71a87	\N	privacy	v1.0	t	\N	node	2026-07-20 20:03:29.624758-05
47d219d4-d8f8-4e31-b3f7-5cbaf8504bd7	177a60cf-7527-438d-a262-1f969d63c09e	\N	terms	v1.0	t	\N	node	2026-07-20 20:03:30.271889-05
bf2c81dd-7e3a-4995-ab23-a0a4fe772165	177a60cf-7527-438d-a262-1f969d63c09e	\N	privacy	v1.0	t	\N	node	2026-07-20 20:03:30.271889-05
753ad3e1-c4d4-4046-974a-2fb07338af34	27edd1fa-3f95-45b3-86f4-4dd9a92f6e28	\N	terms	v1.0	t	\N	node	2026-07-20 20:03:31.303349-05
5aa6e664-5439-4df0-af5b-8d7db0028da3	27edd1fa-3f95-45b3-86f4-4dd9a92f6e28	\N	privacy	v1.0	t	\N	node	2026-07-20 20:03:31.303349-05
edf4f974-30e9-468a-b85b-4b7010158412	1603205f-d1a7-4793-ad10-c7cf45586703	\N	terms	v1.0	t	\N	node	2026-07-20 20:27:04.094359-05
38b2dd1c-ab87-4dd9-8228-27aca590f559	1603205f-d1a7-4793-ad10-c7cf45586703	\N	privacy	v1.0	t	\N	node	2026-07-20 20:27:04.094359-05
83f563e9-797a-4b5d-ad72-63b41620ae80	b7821822-a887-4439-ab85-beeb70ad9c48	\N	terms	v1.0	t	\N	node	2026-07-20 20:27:04.922949-05
99d0677d-f7d0-47a7-9fbe-97d7b903c0dd	b7821822-a887-4439-ab85-beeb70ad9c48	\N	privacy	v1.0	t	\N	node	2026-07-20 20:27:04.922949-05
9f652149-f7f4-45f8-b464-702cf8ef9579	67be03dc-cb89-4ee7-aad2-9d7ec6d0ca69	\N	terms	v1.0	t	\N	node	2026-07-20 20:27:06.413847-05
6f0c0c4c-7fd3-4c1b-be09-b604ea3cad53	67be03dc-cb89-4ee7-aad2-9d7ec6d0ca69	\N	privacy	v1.0	t	\N	node	2026-07-20 20:27:06.413847-05
a7b5c504-2748-4eec-8e79-11aa1d9ba95a	e8c8d9e8-d7a3-4f29-a4c9-89899db0f2c2	\N	terms	v1.0	t	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-07-22 09:16:46.312921-05
4bbe0d7b-9200-435e-abea-f1ced40af56d	e8c8d9e8-d7a3-4f29-a4c9-89899db0f2c2	\N	privacy	v1.0	t	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-07-22 09:16:46.312921-05
\.


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contact_messages (id, name, email, subject, message, read, created_at) FROM stdin;
bcbfac6a-e0ef-4a3a-8aea-77205f5579b9	Test	test@test.com	Test	Test message	f	2026-06-21 20:39:15.600638-05
09eeba08-9476-4401-b5cf-c6815bf45cce	Test	test@test.com	Hola	Funciona	f	2026-06-21 20:40:37.646731-05
280f3a28-4b96-4f4f-b62e-5c8ffe9ecfce	Test	test@test.com	Sin asunto	Hello	f	2026-06-22 11:10:36.958474-05
0fc6a1ac-1cd4-4cab-8905-4f46ada37b9b	Test	test@test.com	Sin asunto	Hello	f	2026-06-22 11:13:04.396365-05
fa6bc113-b573-4d42-9f63-b8e9a4c1c9df	Test	test@test.com	Sin asunto	Hello	f	2026-06-22 11:14:12.135383-05
a3733496-94c6-430f-8186-6ac54da4a61f	a	a@b.com	Sin asunto	x	f	2026-06-28 16:07:18.616954-05
08c85a9a-f51f-49ca-b7cf-3852d7540e25	a	a@b.com	Sin asunto	x	f	2026-06-28 16:07:18.770231-05
431a16cd-5cd6-4918-9495-6bb696c7a3dc	a	a@b.com	Sin asunto	x	f	2026-06-28 16:07:18.876481-05
71b4a313-c3ca-45e6-b0e2-f5e2603e0463	a	a@b.com	Sin asunto	x	f	2026-06-28 16:07:18.993911-05
eaca4ec3-3419-47bd-8b07-2096cdf84f56	a	a@b.com	Sin asunto	x	f	2026-06-28 16:07:19.105253-05
bf4c2cb7-be7d-4033-9d5d-9cdcb56d237e	x	x@x.com	x	x	f	2026-06-29 02:45:16.162931-05
673c7f1b-952d-497b-b54b-1bac9d8ed4c9	x	x@x.com	x	x	f	2026-06-29 02:45:16.215562-05
767f4dd9-9567-4402-adf0-4e10d9bce94e	x	x@x.com	x	x	f	2026-06-29 02:45:16.329736-05
be77bb5b-f351-4b24-a12a-d2da58491538	x	x@x.com	x	x	f	2026-06-29 02:45:16.38881-05
d9673cf5-0d6c-490b-bae4-a814f534c977	x	x@x.com	x	x	f	2026-06-29 02:45:16.422121-05
ca75beb1-1844-45f7-97d4-e65878fbaf28	test	a@a.com	Sin asunto	x	f	2026-07-06 15:09:25.029544-05
d99c38dc-1f60-40c6-bc10-d3f670eb80af	test	a@a.com	Sin asunto	x	f	2026-07-06 15:09:25.113913-05
8c0cbd55-64cf-4483-854d-af6e72e4eaad	test	a@a.com	Sin asunto	x	f	2026-07-06 15:09:25.204757-05
701beb41-d4fe-4428-b482-c9c22833fb09	test	a@a.com	Sin asunto	x	f	2026-07-06 15:09:25.295275-05
3eec3e78-b56f-4ee5-a0b6-45c9902799fc	test	a@a.com	Sin asunto	x	f	2026-07-06 15:09:25.383697-05
\.


--
-- Data for Name: email_verification_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_verification_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
97ba28ce-4149-452d-8770-c972c4371d3a	e8c8d9e8-d7a3-4f29-a4c9-89899db0f2c2	wzQPlhFLxCfIVNntvYkO+6EseuQs1yOgtE5gMegEtlM=	2026-07-23 09:16:46.369-05	2026-07-22 09:19:23.372619-05	2026-07-22 09:16:46.370025-05
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.favorites (id, buyer_id, vendor_id, created_at) FROM stdin;
\.


--
-- Data for Name: job_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_runs (id, job_name, payload, ran_at) FROM stdin;
1	business-hours	{"ts": "2026-07-16T17:20:35.869Z", "updated": 0}	2026-07-16 12:20:35.87197-05
2	business-hours	{"ts": "2026-07-16T17:26:58.770Z", "updated": 0}	2026-07-16 12:26:58.772075-05
3	business-hours	{"ts": "2026-07-16T17:35:18.907Z", "updated": 0}	2026-07-16 12:35:18.908684-05
4	business-hours	{"ts": "2026-07-16T17:41:39.393Z", "updated": 0}	2026-07-16 12:41:39.396706-05
5	business-hours	{"ts": "2026-07-16T17:46:39.394Z", "updated": 0}	2026-07-16 12:46:39.395858-05
6	business-hours	{"ts": "2026-07-16T17:51:39.290Z", "updated": 0}	2026-07-16 12:51:39.291494-05
7	business-hours	{"ts": "2026-07-16T17:56:39.307Z", "updated": 0}	2026-07-16 12:56:39.30855-05
8	location-history-prune	{"deleted": 0}	2026-07-16 13:00:15.009958-05
9	business-hours	{"ts": "2026-07-16T18:05:13.709Z", "updated": 0}	2026-07-16 13:05:13.71065-05
10	business-hours	{"ts": "2026-07-16T18:10:13.136Z", "updated": 0}	2026-07-16 13:10:13.137375-05
11	business-hours	{"ts": "2026-07-16T18:15:13.103Z", "updated": 0}	2026-07-16 13:15:13.105896-05
12	business-hours	{"ts": "2026-07-16T18:20:13.307Z", "updated": 0}	2026-07-16 13:20:13.309275-05
13	location-history-prune	{"deleted": 0}	2026-07-16 13:22:44.031976-05
14	business-hours	{"ts": "2026-07-16T18:27:43.068Z", "updated": 0}	2026-07-16 13:27:43.069831-05
15	business-hours	{"ts": "2026-07-16T18:32:43.265Z", "updated": 0}	2026-07-16 13:32:43.267475-05
16	business-hours	{"ts": "2026-07-16T18:37:43.100Z", "updated": 0}	2026-07-16 13:37:43.100808-05
17	business-hours	{"ts": "2026-07-16T18:42:43.247Z", "updated": 0}	2026-07-16 13:42:43.249707-05
18	business-hours	{"ts": "2026-07-16T18:47:43.114Z", "updated": 0}	2026-07-16 13:47:43.115154-05
19	business-hours	{"ts": "2026-07-16T18:52:43.135Z", "updated": 0}	2026-07-16 13:52:43.136181-05
20	business-hours	{"ts": "2026-07-16T18:57:43.197Z", "updated": 0}	2026-07-16 13:57:43.198593-05
21	business-hours	{"ts": "2026-07-16T19:02:43.407Z", "updated": 0}	2026-07-16 14:02:43.408611-05
22	business-hours	{"ts": "2026-07-16T19:07:43.194Z", "updated": 0}	2026-07-16 14:07:43.195368-05
23	business-hours	{"ts": "2026-07-16T19:12:43.273Z", "updated": 0}	2026-07-16 14:12:43.275909-05
24	business-hours	{"ts": "2026-07-16T19:17:43.379Z", "updated": 0}	2026-07-16 14:17:43.381818-05
25	business-hours	{"ts": "2026-07-16T19:22:43.268Z", "updated": 0}	2026-07-16 14:22:43.271528-05
26	business-hours	{"ts": "2026-07-16T19:27:43.311Z", "updated": 0}	2026-07-16 14:27:43.312695-05
27	business-hours	{"ts": "2026-07-16T19:32:43.368Z", "updated": 0}	2026-07-16 14:32:43.369318-05
28	business-hours	{"ts": "2026-07-16T19:37:43.293Z", "updated": 0}	2026-07-16 14:37:43.296036-05
29	business-hours	{"ts": "2026-07-16T19:42:43.345Z", "updated": 0}	2026-07-16 14:42:43.345838-05
30	business-hours	{"ts": "2026-07-16T19:47:43.377Z", "updated": 0}	2026-07-16 14:47:43.380104-05
31	business-hours	{"ts": "2026-07-16T19:52:43.361Z", "updated": 0}	2026-07-16 14:52:43.361824-05
32	business-hours	{"ts": "2026-07-16T19:57:43.389Z", "updated": 0}	2026-07-16 14:57:43.389955-05
33	business-hours	{"ts": "2026-07-16T20:02:43.384Z", "updated": 0}	2026-07-16 15:02:43.385503-05
34	business-hours	{"ts": "2026-07-16T20:07:43.435Z", "updated": 0}	2026-07-16 15:07:43.441712-05
35	business-hours	{"ts": "2026-07-16T20:12:43.412Z", "updated": 0}	2026-07-16 15:12:43.413637-05
36	business-hours	{"ts": "2026-07-16T20:17:43.529Z", "updated": 0}	2026-07-16 15:17:43.533518-05
37	business-hours	{"ts": "2026-07-16T20:22:43.586Z", "updated": 0}	2026-07-16 15:22:43.640336-05
38	business-hours	{"ts": "2026-07-16T20:27:43.452Z", "updated": 0}	2026-07-16 15:27:43.453774-05
39	business-hours	{"ts": "2026-07-16T20:32:43.469Z", "updated": 0}	2026-07-16 15:32:43.471709-05
40	location-history-prune	{"deleted": 0}	2026-07-16 15:36:01.023204-05
41	business-hours	{"ts": "2026-07-16T20:40:59.756Z", "updated": 0}	2026-07-16 15:40:59.757559-05
42	business-hours	{"ts": "2026-07-16T20:45:59.660Z", "updated": 0}	2026-07-16 15:45:59.66111-05
43	business-hours	{"ts": "2026-07-16T20:50:59.722Z", "updated": 0}	2026-07-16 15:50:59.722797-05
44	business-hours	{"ts": "2026-07-16T20:55:59.679Z", "updated": 0}	2026-07-16 15:55:59.679589-05
45	business-hours	{"ts": "2026-07-16T21:00:59.677Z", "updated": 0}	2026-07-16 16:00:59.678261-05
46	business-hours	{"ts": "2026-07-16T21:05:59.679Z", "updated": 0}	2026-07-16 16:05:59.679868-05
47	business-hours	{"ts": "2026-07-16T21:10:59.739Z", "updated": 0}	2026-07-16 16:10:59.741578-05
48	location-history-prune	{"deleted": 0}	2026-07-16 16:13:18.48726-05
49	business-hours	{"ts": "2026-07-16T21:18:16.945Z", "updated": 0}	2026-07-16 16:18:16.947453-05
50	business-hours	{"ts": "2026-07-16T21:23:16.886Z", "updated": 0}	2026-07-16 16:23:16.887436-05
51	business-hours	{"ts": "2026-07-16T21:28:16.862Z", "updated": 0}	2026-07-16 16:28:16.864202-05
52	business-hours	{"ts": "2026-07-16T21:33:16.870Z", "updated": 0}	2026-07-16 16:33:16.871789-05
53	business-hours	{"ts": "2026-07-16T21:38:16.879Z", "updated": 0}	2026-07-16 16:38:16.880489-05
54	business-hours	{"ts": "2026-07-16T21:43:16.929Z", "updated": 0}	2026-07-16 16:43:16.934024-05
55	location-history-prune	{"deleted": 0}	2026-07-16 16:45:41.439226-05
56	business-hours	{"ts": "2026-07-16T21:50:40.375Z", "updated": 0}	2026-07-16 16:50:40.376091-05
57	business-hours	{"ts": "2026-07-16T21:55:40.563Z", "updated": 0}	2026-07-16 16:55:40.564084-05
58	location-history-prune	{"deleted": 0}	2026-07-16 16:57:43.979943-05
59	business-hours	{"ts": "2026-07-16T22:02:42.990Z", "updated": 0}	2026-07-16 17:02:42.991805-05
60	business-hours	{"ts": "2026-07-16T22:07:42.988Z", "updated": 0}	2026-07-16 17:07:42.989305-05
61	business-hours	{"ts": "2026-07-16T22:12:42.979Z", "updated": 0}	2026-07-16 17:12:42.981918-05
62	business-hours	{"ts": "2026-07-16T22:17:43.019Z", "updated": 0}	2026-07-16 17:17:43.019849-05
63	business-hours	{"ts": "2026-07-16T22:22:43.091Z", "updated": 0}	2026-07-16 17:22:43.091424-05
64	business-hours	{"ts": "2026-07-16T22:27:42.974Z", "updated": 0}	2026-07-16 17:27:42.975195-05
65	business-hours	{"ts": "2026-07-16T22:32:43.009Z", "updated": 0}	2026-07-16 17:32:43.010336-05
66	business-hours	{"ts": "2026-07-16T22:37:42.983Z", "updated": 0}	2026-07-16 17:37:42.98408-05
67	business-hours	{"ts": "2026-07-16T22:42:43.063Z", "updated": 0}	2026-07-16 17:42:43.064417-05
68	business-hours	{"ts": "2026-07-16T22:47:43.007Z", "updated": 0}	2026-07-16 17:47:43.010438-05
69	business-hours	{"ts": "2026-07-16T22:52:43.085Z", "updated": 0}	2026-07-16 17:52:43.08632-05
70	business-hours	{"ts": "2026-07-16T22:57:43.045Z", "updated": 0}	2026-07-16 17:57:43.047605-05
71	business-hours	{"ts": "2026-07-16T23:02:43.074Z", "updated": 0}	2026-07-16 18:02:43.077866-05
72	business-hours	{"ts": "2026-07-16T23:07:43.039Z", "updated": 0}	2026-07-16 18:07:43.040776-05
73	business-hours	{"ts": "2026-07-16T23:12:43.063Z", "updated": 0}	2026-07-16 18:12:43.066251-05
74	business-hours	{"ts": "2026-07-16T23:17:43.049Z", "updated": 0}	2026-07-16 18:17:43.049874-05
75	business-hours	{"ts": "2026-07-16T23:22:43.070Z", "updated": 0}	2026-07-16 18:22:43.070642-05
76	business-hours	{"ts": "2026-07-16T23:27:43.019Z", "updated": 0}	2026-07-16 18:27:43.020247-05
77	business-hours	{"ts": "2026-07-16T23:32:43.034Z", "updated": 0}	2026-07-16 18:32:43.040314-05
78	business-hours	{"ts": "2026-07-16T23:37:43.017Z", "updated": 0}	2026-07-16 18:37:43.018275-05
79	business-hours	{"ts": "2026-07-16T23:42:43.089Z", "updated": 0}	2026-07-16 18:42:43.090859-05
80	business-hours	{"ts": "2026-07-16T23:47:43.024Z", "updated": 0}	2026-07-16 18:47:43.027705-05
81	business-hours	{"ts": "2026-07-16T23:52:43.042Z", "updated": 0}	2026-07-16 18:52:43.046673-05
82	business-hours	{"ts": "2026-07-16T23:57:43.079Z", "updated": 0}	2026-07-16 18:57:43.082435-05
83	business-hours	{"ts": "2026-07-17T00:02:43.055Z", "updated": 0}	2026-07-16 19:02:43.05599-05
84	business-hours	{"ts": "2026-07-17T00:07:43.056Z", "updated": 0}	2026-07-16 19:07:43.05754-05
85	business-hours	{"ts": "2026-07-17T00:12:43.072Z", "updated": 0}	2026-07-16 19:12:43.074449-05
86	business-hours	{"ts": "2026-07-17T00:17:43.025Z", "updated": 0}	2026-07-16 19:17:43.026163-05
87	business-hours	{"ts": "2026-07-17T00:22:43.052Z", "updated": 0}	2026-07-16 19:22:43.053223-05
88	business-hours	{"ts": "2026-07-17T00:27:43.087Z", "updated": 0}	2026-07-16 19:27:43.088342-05
89	business-hours	{"ts": "2026-07-17T00:32:43.065Z", "updated": 0}	2026-07-16 19:32:43.065954-05
90	business-hours	{"ts": "2026-07-17T00:37:43.069Z", "updated": 0}	2026-07-16 19:37:43.070165-05
91	business-hours	{"ts": "2026-07-17T00:42:43.092Z", "updated": 0}	2026-07-16 19:42:43.092972-05
92	business-hours	{"ts": "2026-07-17T00:47:43.160Z", "updated": 0}	2026-07-16 19:47:43.16477-05
93	business-hours	{"ts": "2026-07-17T00:52:43.132Z", "updated": 0}	2026-07-16 19:52:43.133614-05
94	business-hours	{"ts": "2026-07-17T00:57:43.146Z", "updated": 0}	2026-07-16 19:57:43.147372-05
95	business-hours	{"ts": "2026-07-17T01:02:43.174Z", "updated": 0}	2026-07-16 20:02:43.175264-05
96	business-hours	{"ts": "2026-07-17T01:07:43.234Z", "updated": 0}	2026-07-16 20:07:43.235115-05
97	business-hours	{"ts": "2026-07-17T01:12:43.201Z", "updated": 0}	2026-07-16 20:12:43.202204-05
98	business-hours	{"ts": "2026-07-17T01:17:43.307Z", "updated": 0}	2026-07-16 20:17:43.309073-05
99	business-hours	{"ts": "2026-07-17T01:22:43.223Z", "updated": 0}	2026-07-16 20:22:43.224915-05
100	business-hours	{"ts": "2026-07-17T01:27:43.237Z", "updated": 0}	2026-07-16 20:27:43.238365-05
101	business-hours	{"ts": "2026-07-17T01:32:43.296Z", "updated": 0}	2026-07-16 20:32:43.297242-05
102	business-hours	{"ts": "2026-07-17T01:37:43.269Z", "updated": 0}	2026-07-16 20:37:43.271648-05
103	business-hours	{"ts": "2026-07-17T01:42:43.330Z", "updated": 0}	2026-07-16 20:42:43.338546-05
104	business-hours	{"ts": "2026-07-17T01:47:43.407Z", "updated": 0}	2026-07-16 20:47:43.407586-05
105	business-hours	{"ts": "2026-07-17T01:52:43.367Z", "updated": 0}	2026-07-16 20:52:43.368206-05
106	business-hours	{"ts": "2026-07-17T01:57:43.371Z", "updated": 0}	2026-07-16 20:57:43.372982-05
107	business-hours	{"ts": "2026-07-17T02:02:43.386Z", "updated": 0}	2026-07-16 21:02:43.387473-05
108	business-hours	{"ts": "2026-07-17T02:07:43.482Z", "updated": 0}	2026-07-16 21:07:43.483114-05
109	business-hours	{"ts": "2026-07-17T02:12:43.495Z", "updated": 0}	2026-07-16 21:12:43.496112-05
110	business-hours	{"ts": "2026-07-17T02:17:43.625Z", "updated": 0}	2026-07-16 21:17:43.629405-05
111	business-hours	{"ts": "2026-07-17T02:22:43.574Z", "updated": 0}	2026-07-16 21:22:43.575222-05
112	business-hours	{"ts": "2026-07-17T02:27:43.485Z", "updated": 0}	2026-07-16 21:27:43.486551-05
113	business-hours	{"ts": "2026-07-17T02:32:43.685Z", "updated": 0}	2026-07-16 21:32:43.68645-05
114	business-hours	{"ts": "2026-07-17T02:37:43.506Z", "updated": 0}	2026-07-16 21:37:43.507481-05
115	business-hours	{"ts": "2026-07-17T02:42:43.598Z", "updated": 0}	2026-07-16 21:42:43.599187-05
116	business-hours	{"ts": "2026-07-17T02:47:43.603Z", "updated": 0}	2026-07-16 21:47:43.61077-05
117	business-hours	{"ts": "2026-07-17T02:52:43.587Z", "updated": 0}	2026-07-16 21:52:43.58932-05
118	business-hours	{"ts": "2026-07-17T02:57:43.654Z", "updated": 0}	2026-07-16 21:57:43.655517-05
119	business-hours	{"ts": "2026-07-17T03:02:43.681Z", "updated": 0}	2026-07-16 22:02:43.682829-05
120	business-hours	{"ts": "2026-07-17T03:07:43.639Z", "updated": 0}	2026-07-16 22:07:43.641341-05
121	business-hours	{"ts": "2026-07-17T03:12:43.709Z", "updated": 0}	2026-07-16 22:12:43.711356-05
122	business-hours	{"ts": "2026-07-17T03:17:43.645Z", "updated": 0}	2026-07-16 22:17:43.645772-05
123	business-hours	{"ts": "2026-07-17T03:22:43.668Z", "updated": 0}	2026-07-16 22:22:43.66842-05
124	business-hours	{"ts": "2026-07-17T03:27:43.663Z", "updated": 0}	2026-07-16 22:27:43.663523-05
125	business-hours	{"ts": "2026-07-17T03:32:43.753Z", "updated": 0}	2026-07-16 22:32:43.760722-05
126	business-hours	{"ts": "2026-07-17T03:37:43.660Z", "updated": 0}	2026-07-16 22:37:43.660787-05
127	business-hours	{"ts": "2026-07-17T03:42:43.795Z", "updated": 0}	2026-07-16 22:42:43.795706-05
128	business-hours	{"ts": "2026-07-17T03:47:43.665Z", "updated": 0}	2026-07-16 22:47:43.666163-05
129	business-hours	{"ts": "2026-07-17T03:52:43.691Z", "updated": 0}	2026-07-16 22:52:43.691922-05
130	location-history-prune	{"deleted": 0}	2026-07-16 22:57:44.557828-05
131	business-hours	{"ts": "2026-07-17T04:02:43.308Z", "updated": 0}	2026-07-16 23:02:43.309267-05
132	business-hours	{"ts": "2026-07-17T04:07:43.314Z", "updated": 0}	2026-07-16 23:07:43.316647-05
133	business-hours	{"ts": "2026-07-17T04:12:43.316Z", "updated": 0}	2026-07-16 23:12:43.317136-05
134	business-hours	{"ts": "2026-07-17T04:17:43.413Z", "updated": 0}	2026-07-16 23:17:43.414042-05
135	business-hours	{"ts": "2026-07-17T04:22:43.347Z", "updated": 0}	2026-07-16 23:22:43.350065-05
136	business-hours	{"ts": "2026-07-17T04:27:43.367Z", "updated": 0}	2026-07-16 23:27:43.368469-05
137	business-hours	{"ts": "2026-07-17T04:32:43.342Z", "updated": 0}	2026-07-16 23:32:43.343572-05
138	business-hours	{"ts": "2026-07-17T04:37:43.339Z", "updated": 0}	2026-07-16 23:37:43.339943-05
139	business-hours	{"ts": "2026-07-17T04:42:43.379Z", "updated": 0}	2026-07-16 23:42:43.38009-05
140	business-hours	{"ts": "2026-07-17T04:47:43.364Z", "updated": 0}	2026-07-16 23:47:43.364533-05
141	business-hours	{"ts": "2026-07-17T04:52:43.376Z", "updated": 0}	2026-07-16 23:52:43.381828-05
142	business-hours	{"ts": "2026-07-17T04:57:43.367Z", "updated": 0}	2026-07-16 23:57:43.368976-05
143	business-hours	{"ts": "2026-07-17T05:02:43.422Z", "updated": 0}	2026-07-17 00:02:43.427571-05
144	business-hours	{"ts": "2026-07-17T05:07:43.356Z", "updated": 0}	2026-07-17 00:07:43.356976-05
145	business-hours	{"ts": "2026-07-17T05:12:43.364Z", "updated": 0}	2026-07-17 00:12:43.364776-05
146	location-history-prune	{"deleted": 0}	2026-07-17 00:14:34.777536-05
147	location-history-prune	{"deleted": 0}	2026-07-17 00:19:31.552491-05
148	business-hours	{"ts": "2026-07-17T05:24:30.446Z", "updated": 0}	2026-07-17 00:24:30.447103-05
149	location-history-prune	{"deleted": 0}	2026-07-17 00:24:40.162975-05
150	business-hours	{"ts": "2026-07-17T05:29:38.722Z", "updated": 0}	2026-07-17 00:29:38.724938-05
151	business-hours	{"ts": "2026-07-17T05:34:38.817Z", "updated": 0}	2026-07-17 00:34:38.818495-05
152	business-hours	{"ts": "2026-07-17T05:39:38.778Z", "updated": 0}	2026-07-17 00:39:38.779875-05
153	location-history-prune	{"deleted": 0}	2026-07-17 00:40:57.125761-05
154	business-hours	{"ts": "2026-07-17T05:45:56.281Z", "updated": 0}	2026-07-17 00:45:56.282064-05
155	business-hours	{"ts": "2026-07-17T05:50:56.245Z", "updated": 0}	2026-07-17 00:50:56.246177-05
156	business-hours	{"ts": "2026-07-17T05:55:56.308Z", "updated": 0}	2026-07-17 00:55:56.314023-05
157	business-hours	{"ts": "2026-07-17T06:00:56.255Z", "updated": 0}	2026-07-17 01:00:56.256648-05
158	business-hours	{"ts": "2026-07-17T06:05:56.325Z", "updated": 0}	2026-07-17 01:05:56.32649-05
159	business-hours	{"ts": "2026-07-17T06:10:56.270Z", "updated": 0}	2026-07-17 01:10:56.271521-05
160	business-hours	{"ts": "2026-07-17T06:15:56.471Z", "updated": 0}	2026-07-17 01:15:56.472416-05
161	business-hours	{"ts": "2026-07-17T06:20:56.416Z", "updated": 0}	2026-07-17 01:20:56.417522-05
162	business-hours	{"ts": "2026-07-17T06:25:56.347Z", "updated": 0}	2026-07-17 01:25:56.352764-05
163	business-hours	{"ts": "2026-07-17T06:30:56.689Z", "updated": 0}	2026-07-17 01:30:56.692016-05
164	business-hours	{"ts": "2026-07-17T06:35:56.385Z", "updated": 0}	2026-07-17 01:35:56.387959-05
165	business-hours	{"ts": "2026-07-17T06:40:56.392Z", "updated": 0}	2026-07-17 01:40:56.39344-05
166	business-hours	{"ts": "2026-07-17T06:45:56.417Z", "updated": 0}	2026-07-17 01:45:56.420312-05
167	business-hours	{"ts": "2026-07-17T06:50:56.466Z", "updated": 0}	2026-07-17 01:50:56.484109-05
168	location-history-prune	{"deleted": 0}	2026-07-17 01:51:32.506262-05
169	business-hours	{"ts": "2026-07-17T06:56:31.338Z", "updated": 0}	2026-07-17 01:56:31.340028-05
170	business-hours	{"ts": "2026-07-17T07:01:31.296Z", "updated": 0}	2026-07-17 02:01:31.296695-05
171	business-hours	{"ts": "2026-07-17T07:06:31.305Z", "updated": 0}	2026-07-17 02:06:31.306742-05
172	business-hours	{"ts": "2026-07-17T07:11:31.318Z", "updated": 0}	2026-07-17 02:11:31.322101-05
173	business-hours	{"ts": "2026-07-17T07:16:31.417Z", "updated": 0}	2026-07-17 02:16:31.419247-05
174	business-hours	{"ts": "2026-07-17T07:21:31.510Z", "updated": 0}	2026-07-17 02:21:31.511903-05
175	business-hours	{"ts": "2026-07-17T07:26:31.403Z", "updated": 0}	2026-07-17 02:26:31.40527-05
176	business-hours	{"ts": "2026-07-17T07:31:31.545Z", "updated": 0}	2026-07-17 02:31:31.547454-05
177	business-hours	{"ts": "2026-07-17T07:36:31.576Z", "updated": 0}	2026-07-17 02:36:31.576961-05
178	business-hours	{"ts": "2026-07-17T07:41:31.604Z", "updated": 0}	2026-07-17 02:41:31.606856-05
179	business-hours	{"ts": "2026-07-17T07:46:31.528Z", "updated": 0}	2026-07-17 02:46:31.529005-05
180	business-hours	{"ts": "2026-07-17T07:51:31.531Z", "updated": 0}	2026-07-17 02:51:31.533138-05
181	business-hours	{"ts": "2026-07-17T07:56:31.664Z", "updated": 0}	2026-07-17 02:56:31.665375-05
182	business-hours	{"ts": "2026-07-17T08:01:31.665Z", "updated": 0}	2026-07-17 03:01:31.666472-05
183	business-hours	{"ts": "2026-07-17T08:06:31.619Z", "updated": 0}	2026-07-17 03:06:31.625065-05
184	business-hours	{"ts": "2026-07-17T08:11:31.601Z", "updated": 0}	2026-07-17 03:11:31.602882-05
185	business-hours	{"ts": "2026-07-17T08:16:31.603Z", "updated": 0}	2026-07-17 03:16:31.605986-05
186	business-hours	{"ts": "2026-07-17T08:21:31.654Z", "updated": 0}	2026-07-17 03:21:31.656253-05
187	business-hours	{"ts": "2026-07-17T08:26:31.713Z", "updated": 0}	2026-07-17 03:26:31.724456-05
188	business-hours	{"ts": "2026-07-17T08:31:31.776Z", "updated": 0}	2026-07-17 03:31:31.77711-05
189	business-hours	{"ts": "2026-07-17T08:36:31.728Z", "updated": 0}	2026-07-17 03:36:31.730478-05
190	business-hours	{"ts": "2026-07-17T08:41:31.779Z", "updated": 0}	2026-07-17 03:41:31.787732-05
191	business-hours	{"ts": "2026-07-17T08:46:31.745Z", "updated": 0}	2026-07-17 03:46:31.746014-05
192	business-hours	{"ts": "2026-07-17T08:51:31.760Z", "updated": 0}	2026-07-17 03:51:31.761626-05
193	business-hours	{"ts": "2026-07-17T08:56:31.772Z", "updated": 0}	2026-07-17 03:56:31.772887-05
194	business-hours	{"ts": "2026-07-17T09:01:31.887Z", "updated": 0}	2026-07-17 04:01:31.893678-05
195	business-hours	{"ts": "2026-07-17T09:06:31.958Z", "updated": 0}	2026-07-17 04:06:31.960356-05
196	business-hours	{"ts": "2026-07-17T09:11:31.865Z", "updated": 0}	2026-07-17 04:11:31.866788-05
197	business-hours	{"ts": "2026-07-17T09:16:32.260Z", "updated": 0}	2026-07-17 04:16:32.267566-05
198	business-hours	{"ts": "2026-07-17T09:21:31.911Z", "updated": 0}	2026-07-17 04:21:31.912219-05
199	business-hours	{"ts": "2026-07-17T09:26:31.900Z", "updated": 0}	2026-07-17 04:26:31.901519-05
266	location-history-prune	{"deleted": 0}	2026-07-17 09:51:39.981611-05
200	business-hours	{"ts": "2026-07-17T09:31:32.143Z", "updated": 0}	2026-07-17 04:31:32.146494-05
201	business-hours	{"ts": "2026-07-17T09:36:31.898Z", "updated": 0}	2026-07-17 04:36:31.9-05
202	business-hours	{"ts": "2026-07-17T09:41:31.924Z", "updated": 0}	2026-07-17 04:41:31.930642-05
203	business-hours	{"ts": "2026-07-17T09:46:32.018Z", "updated": 0}	2026-07-17 04:46:32.019816-05
204	business-hours	{"ts": "2026-07-17T09:51:31.989Z", "updated": 0}	2026-07-17 04:51:31.991196-05
205	business-hours	{"ts": "2026-07-17T09:56:31.942Z", "updated": 0}	2026-07-17 04:56:31.942771-05
206	business-hours	{"ts": "2026-07-17T10:01:31.978Z", "updated": 0}	2026-07-17 05:01:31.979402-05
207	business-hours	{"ts": "2026-07-17T10:06:31.977Z", "updated": 0}	2026-07-17 05:06:31.978841-05
208	business-hours	{"ts": "2026-07-17T10:11:31.997Z", "updated": 0}	2026-07-17 05:11:31.99935-05
209	business-hours	{"ts": "2026-07-17T10:16:32.018Z", "updated": 0}	2026-07-17 05:16:32.019185-05
210	business-hours	{"ts": "2026-07-17T10:21:32.307Z", "updated": 0}	2026-07-17 05:21:32.314238-05
211	business-hours	{"ts": "2026-07-17T10:26:32.239Z", "updated": 0}	2026-07-17 05:26:32.266179-05
212	business-hours	{"ts": "2026-07-17T10:31:32.039Z", "updated": 0}	2026-07-17 05:31:32.040276-05
213	business-hours	{"ts": "2026-07-17T10:36:32.067Z", "updated": 0}	2026-07-17 05:36:32.067958-05
214	business-hours	{"ts": "2026-07-17T10:41:32.075Z", "updated": 0}	2026-07-17 05:41:32.076305-05
215	business-hours	{"ts": "2026-07-17T10:46:32.109Z", "updated": 0}	2026-07-17 05:46:32.110602-05
216	business-hours	{"ts": "2026-07-17T10:51:32.174Z", "updated": 0}	2026-07-17 05:51:32.175104-05
217	business-hours	{"ts": "2026-07-17T10:56:32.146Z", "updated": 0}	2026-07-17 05:56:32.146758-05
218	business-hours	{"ts": "2026-07-17T11:01:32.180Z", "updated": 0}	2026-07-17 06:01:32.181102-05
219	business-hours	{"ts": "2026-07-17T11:06:32.171Z", "updated": 0}	2026-07-17 06:06:32.17179-05
220	business-hours	{"ts": "2026-07-17T11:11:32.305Z", "updated": 0}	2026-07-17 06:11:32.311094-05
221	business-hours	{"ts": "2026-07-17T11:16:32.237Z", "updated": 0}	2026-07-17 06:16:32.237818-05
222	business-hours	{"ts": "2026-07-17T11:21:32.347Z", "updated": 0}	2026-07-17 06:21:32.349369-05
223	business-hours	{"ts": "2026-07-17T11:26:32.245Z", "updated": 0}	2026-07-17 06:26:32.246525-05
224	business-hours	{"ts": "2026-07-17T11:31:32.240Z", "updated": 0}	2026-07-17 06:31:32.241677-05
225	business-hours	{"ts": "2026-07-17T11:36:32.297Z", "updated": 0}	2026-07-17 06:36:32.299174-05
226	business-hours	{"ts": "2026-07-17T11:41:32.272Z", "updated": 0}	2026-07-17 06:41:32.272994-05
227	business-hours	{"ts": "2026-07-17T11:46:32.524Z", "updated": 0}	2026-07-17 06:46:32.526203-05
228	business-hours	{"ts": "2026-07-17T11:51:32.364Z", "updated": 0}	2026-07-17 06:51:32.365246-05
229	business-hours	{"ts": "2026-07-17T11:56:32.290Z", "updated": 0}	2026-07-17 06:56:32.29157-05
230	business-hours	{"ts": "2026-07-17T12:01:32.882Z", "updated": 0}	2026-07-17 07:01:32.924798-05
231	business-hours	{"ts": "2026-07-17T12:06:32.319Z", "updated": 0}	2026-07-17 07:06:32.320164-05
232	business-hours	{"ts": "2026-07-17T12:11:32.374Z", "updated": 0}	2026-07-17 07:11:32.37935-05
233	business-hours	{"ts": "2026-07-17T12:16:32.368Z", "updated": 0}	2026-07-17 07:16:32.369101-05
234	business-hours	{"ts": "2026-07-17T12:21:32.436Z", "updated": 0}	2026-07-17 07:21:32.437732-05
235	business-hours	{"ts": "2026-07-17T12:26:32.359Z", "updated": 0}	2026-07-17 07:26:32.360067-05
236	business-hours	{"ts": "2026-07-17T12:31:32.465Z", "updated": 0}	2026-07-17 07:31:32.469766-05
237	business-hours	{"ts": "2026-07-17T12:36:32.395Z", "updated": 0}	2026-07-17 07:36:32.397872-05
238	business-hours	{"ts": "2026-07-17T12:41:32.418Z", "updated": 0}	2026-07-17 07:41:32.422201-05
239	business-hours	{"ts": "2026-07-17T12:46:32.432Z", "updated": 0}	2026-07-17 07:46:32.433226-05
240	business-hours	{"ts": "2026-07-17T12:51:32.430Z", "updated": 0}	2026-07-17 07:51:32.431423-05
241	business-hours	{"ts": "2026-07-17T12:56:32.508Z", "updated": 0}	2026-07-17 07:56:32.50957-05
242	business-hours	{"ts": "2026-07-17T13:01:32.585Z", "updated": 0}	2026-07-17 08:01:32.586869-05
243	business-hours	{"ts": "2026-07-17T13:06:32.482Z", "updated": 0}	2026-07-17 08:06:32.484814-05
244	business-hours	{"ts": "2026-07-17T13:11:32.486Z", "updated": 0}	2026-07-17 08:11:32.486854-05
245	business-hours	{"ts": "2026-07-17T13:16:32.506Z", "updated": 0}	2026-07-17 08:16:32.507987-05
246	business-hours	{"ts": "2026-07-17T13:21:32.559Z", "updated": 0}	2026-07-17 08:21:32.560116-05
247	business-hours	{"ts": "2026-07-17T13:26:32.543Z", "updated": 0}	2026-07-17 08:26:32.544332-05
248	business-hours	{"ts": "2026-07-17T13:31:32.538Z", "updated": 0}	2026-07-17 08:31:32.540436-05
249	business-hours	{"ts": "2026-07-17T13:36:32.566Z", "updated": 0}	2026-07-17 08:36:32.567853-05
250	business-hours	{"ts": "2026-07-17T13:41:32.574Z", "updated": 0}	2026-07-17 08:41:32.575771-05
251	business-hours	{"ts": "2026-07-17T13:46:32.735Z", "updated": 0}	2026-07-17 08:46:32.740026-05
252	location-history-prune	{"deleted": 0}	2026-07-17 08:47:55.507688-05
253	business-hours	{"ts": "2026-07-17T13:52:54.492Z", "updated": 0}	2026-07-17 08:52:54.4953-05
254	business-hours	{"ts": "2026-07-17T13:57:54.540Z", "updated": 0}	2026-07-17 08:57:54.542155-05
255	business-hours	{"ts": "2026-07-17T14:02:54.500Z", "updated": 0}	2026-07-17 09:02:54.50117-05
256	business-hours	{"ts": "2026-07-17T14:07:54.470Z", "updated": 0}	2026-07-17 09:07:54.470842-05
257	business-hours	{"ts": "2026-07-17T14:12:54.484Z", "updated": 0}	2026-07-17 09:12:54.484648-05
258	business-hours	{"ts": "2026-07-17T14:17:54.473Z", "updated": 0}	2026-07-17 09:17:54.47461-05
259	business-hours	{"ts": "2026-07-17T14:22:54.472Z", "updated": 0}	2026-07-17 09:22:54.474103-05
260	business-hours	{"ts": "2026-07-17T14:27:54.472Z", "updated": 0}	2026-07-17 09:27:54.47274-05
261	business-hours	{"ts": "2026-07-17T14:32:54.526Z", "updated": 0}	2026-07-17 09:32:54.527949-05
262	location-history-prune	{"deleted": 0}	2026-07-17 09:36:17.025561-05
263	business-hours	{"ts": "2026-07-17T14:41:16.428Z", "updated": 0}	2026-07-17 09:41:16.430893-05
264	business-hours	{"ts": "2026-07-17T14:46:16.501Z", "updated": 0}	2026-07-17 09:46:16.511497-05
265	business-hours	{"ts": "2026-07-17T14:51:16.388Z", "updated": 0}	2026-07-17 09:51:16.389432-05
267	location-history-prune	{"deleted": 0}	2026-07-17 09:52:57.16827-05
268	business-hours	{"ts": "2026-07-17T14:57:55.684Z", "updated": 0}	2026-07-17 09:57:55.685153-05
269	business-hours	{"ts": "2026-07-17T15:02:55.981Z", "updated": 0}	2026-07-17 10:02:55.981514-05
270	business-hours	{"ts": "2026-07-17T15:07:55.718Z", "updated": 0}	2026-07-17 10:07:55.718933-05
271	business-hours	{"ts": "2026-07-17T15:12:55.724Z", "updated": 0}	2026-07-17 10:12:55.725845-05
272	business-hours	{"ts": "2026-07-17T15:17:55.719Z", "updated": 0}	2026-07-17 10:17:55.719915-05
273	business-hours	{"ts": "2026-07-17T15:22:55.716Z", "updated": 0}	2026-07-17 10:22:55.71976-05
274	business-hours	{"ts": "2026-07-17T15:27:55.722Z", "updated": 0}	2026-07-17 10:27:55.724383-05
275	location-history-prune	{"deleted": 0}	2026-07-17 10:32:57.537024-05
276	location-history-prune	{"deleted": 0}	2026-07-17 10:52:30.186864-05
277	business-hours	{"ts": "2026-07-17T15:57:26.743Z", "updated": 0}	2026-07-17 10:57:26.749541-05
278	business-hours	{"ts": "2026-07-17T16:02:26.637Z", "updated": 0}	2026-07-17 11:02:26.637725-05
279	business-hours	{"ts": "2026-07-17T16:07:26.776Z", "updated": 0}	2026-07-17 11:07:26.778084-05
280	business-hours	{"ts": "2026-07-17T16:12:26.777Z", "updated": 0}	2026-07-17 11:12:26.777833-05
281	location-history-prune	{"deleted": 0}	2026-07-17 11:16:38.139564-05
282	business-hours	{"ts": "2026-07-17T16:21:36.478Z", "updated": 0}	2026-07-17 11:21:36.478845-05
283	business-hours	{"ts": "2026-07-17T16:26:36.690Z", "updated": 0}	2026-07-17 11:26:36.690856-05
284	business-hours	{"ts": "2026-07-17T16:31:36.798Z", "updated": 0}	2026-07-17 11:31:36.817854-05
285	business-hours	{"ts": "2026-07-17T16:36:36.586Z", "updated": 0}	2026-07-17 11:36:36.586875-05
286	business-hours	{"ts": "2026-07-17T16:41:36.509Z", "updated": 0}	2026-07-17 11:41:36.512074-05
287	business-hours	{"ts": "2026-07-17T16:46:36.761Z", "updated": 0}	2026-07-17 11:46:36.90267-05
288	business-hours	{"ts": "2026-07-17T16:51:36.539Z", "updated": 0}	2026-07-17 11:51:36.541333-05
289	business-hours	{"ts": "2026-07-17T16:56:36.838Z", "updated": 0}	2026-07-17 11:56:36.838848-05
290	business-hours	{"ts": "2026-07-17T17:01:36.587Z", "updated": 0}	2026-07-17 12:01:36.590089-05
291	location-history-prune	{"deleted": 0}	2026-07-17 12:03:33.27778-05
292	business-hours	{"ts": "2026-07-17T17:08:32.458Z", "updated": 0}	2026-07-17 12:08:32.458959-05
293	business-hours	{"ts": "2026-07-17T17:13:32.457Z", "updated": 0}	2026-07-17 12:13:32.458131-05
294	business-hours	{"ts": "2026-07-17T17:18:32.483Z", "updated": 0}	2026-07-17 12:18:32.484504-05
295	business-hours	{"ts": "2026-07-17T17:23:32.606Z", "updated": 0}	2026-07-17 12:23:32.60697-05
296	location-history-prune	{"deleted": 0}	2026-07-17 12:24:59.601915-05
297	business-hours	{"ts": "2026-07-17T17:29:58.830Z", "updated": 0}	2026-07-17 12:29:58.832476-05
298	business-hours	{"ts": "2026-07-17T17:34:58.906Z", "updated": 0}	2026-07-17 12:34:58.907324-05
299	business-hours	{"ts": "2026-07-17T17:39:58.868Z", "updated": 0}	2026-07-17 12:39:58.869144-05
300	business-hours	{"ts": "2026-07-17T17:44:58.879Z", "updated": 0}	2026-07-17 12:44:58.880864-05
301	business-hours	{"ts": "2026-07-17T17:49:58.839Z", "updated": 0}	2026-07-17 12:49:58.840323-05
302	business-hours	{"ts": "2026-07-17T17:54:58.866Z", "updated": 0}	2026-07-17 12:54:58.867481-05
303	business-hours	{"ts": "2026-07-17T17:59:58.888Z", "updated": 0}	2026-07-17 12:59:58.888984-05
304	business-hours	{"ts": "2026-07-17T18:04:58.983Z", "updated": 0}	2026-07-17 13:04:58.983938-05
305	business-hours	{"ts": "2026-07-17T18:09:58.972Z", "updated": 0}	2026-07-17 13:09:58.974164-05
306	business-hours	{"ts": "2026-07-17T18:14:58.973Z", "updated": 0}	2026-07-17 13:14:58.974089-05
307	business-hours	{"ts": "2026-07-17T18:19:59.213Z", "updated": 0}	2026-07-17 13:19:59.214485-05
308	business-hours	{"ts": "2026-07-17T18:24:59.216Z", "updated": 0}	2026-07-17 13:24:59.217924-05
309	business-hours	{"ts": "2026-07-17T18:29:59.017Z", "updated": 0}	2026-07-17 13:29:59.021-05
310	business-hours	{"ts": "2026-07-17T18:34:59.032Z", "updated": 0}	2026-07-17 13:34:59.038436-05
311	business-hours	{"ts": "2026-07-17T18:39:59.073Z", "updated": 0}	2026-07-17 13:39:59.08043-05
312	business-hours	{"ts": "2026-07-17T18:44:59.081Z", "updated": 0}	2026-07-17 13:44:59.082321-05
313	business-hours	{"ts": "2026-07-17T18:49:59.079Z", "updated": 0}	2026-07-17 13:49:59.081082-05
314	business-hours	{"ts": "2026-07-17T18:54:59.181Z", "updated": 0}	2026-07-17 13:54:59.182259-05
315	business-hours	{"ts": "2026-07-17T18:59:59.146Z", "updated": 0}	2026-07-17 13:59:59.161203-05
316	business-hours	{"ts": "2026-07-17T19:04:59.280Z", "updated": 0}	2026-07-17 14:04:59.281554-05
317	business-hours	{"ts": "2026-07-17T19:09:59.172Z", "updated": 0}	2026-07-17 14:09:59.173213-05
318	business-hours	{"ts": "2026-07-17T19:14:59.169Z", "updated": 0}	2026-07-17 14:14:59.16961-05
319	business-hours	{"ts": "2026-07-17T19:19:59.283Z", "updated": 0}	2026-07-17 14:19:59.284386-05
320	business-hours	{"ts": "2026-07-17T19:24:59.231Z", "updated": 0}	2026-07-17 14:24:59.232069-05
321	location-history-prune	{"deleted": 0}	2026-07-17 14:28:28.846964-05
322	business-hours	{"ts": "2026-07-17T19:33:27.167Z", "updated": 0}	2026-07-17 14:33:27.167814-05
323	location-history-prune	{"deleted": 0}	2026-07-17 14:37:31.148821-05
324	business-hours	{"ts": "2026-07-17T19:42:30.496Z", "updated": 0}	2026-07-17 14:42:30.498312-05
325	business-hours	{"ts": "2026-07-17T19:47:30.800Z", "updated": 0}	2026-07-17 14:47:30.802343-05
326	business-hours	{"ts": "2026-07-17T19:52:30.593Z", "updated": 0}	2026-07-17 14:52:30.607424-05
327	business-hours	{"ts": "2026-07-17T19:57:30.419Z", "updated": 0}	2026-07-17 14:57:30.419714-05
328	business-hours	{"ts": "2026-07-17T20:02:30.464Z", "updated": 0}	2026-07-17 15:02:30.473737-05
329	business-hours	{"ts": "2026-07-17T20:07:30.417Z", "updated": 0}	2026-07-17 15:07:30.418615-05
330	location-history-prune	{"deleted": 0}	2026-07-17 15:09:35.328904-05
331	business-hours	{"ts": "2026-07-17T20:14:34.615Z", "updated": 0}	2026-07-17 15:14:34.616521-05
332	business-hours	{"ts": "2026-07-17T20:19:34.694Z", "updated": 12}	2026-07-17 15:19:34.695393-05
333	business-hours	{"ts": "2026-07-17T20:24:34.656Z", "updated": 12}	2026-07-17 15:24:34.659086-05
334	business-hours	{"ts": "2026-07-17T20:29:34.713Z", "updated": 12}	2026-07-17 15:29:34.717209-05
335	business-hours	{"ts": "2026-07-17T20:34:34.692Z", "updated": 12}	2026-07-17 15:34:34.693043-05
336	business-hours	{"ts": "2026-07-17T20:39:34.672Z", "updated": 12}	2026-07-17 15:39:34.673376-05
337	business-hours	{"ts": "2026-07-17T20:44:34.707Z", "updated": 12}	2026-07-17 15:44:34.708015-05
338	business-hours	{"ts": "2026-07-17T20:49:34.752Z", "updated": 12}	2026-07-17 15:49:34.755222-05
339	business-hours	{"ts": "2026-07-17T20:54:34.750Z", "updated": 12}	2026-07-17 15:54:34.751368-05
340	business-hours	{"ts": "2026-07-17T20:59:34.799Z", "updated": 12}	2026-07-17 15:59:34.818244-05
341	business-hours	{"ts": "2026-07-17T21:04:34.807Z", "updated": 12}	2026-07-17 16:04:34.808047-05
342	business-hours	{"ts": "2026-07-17T21:09:34.971Z", "updated": 12}	2026-07-17 16:09:34.972803-05
343	business-hours	{"ts": "2026-07-17T21:14:35.102Z", "updated": 12}	2026-07-17 16:14:35.10973-05
344	business-hours	{"ts": "2026-07-17T21:19:35.007Z", "updated": 12}	2026-07-17 16:19:35.009004-05
345	business-hours	{"ts": "2026-07-17T21:24:34.972Z", "updated": 12}	2026-07-17 16:24:34.97307-05
346	business-hours	{"ts": "2026-07-17T21:29:34.963Z", "updated": 12}	2026-07-17 16:29:34.96425-05
347	business-hours	{"ts": "2026-07-17T21:34:35.034Z", "updated": 12}	2026-07-17 16:34:35.037348-05
348	business-hours	{"ts": "2026-07-17T21:39:35.134Z", "updated": 12}	2026-07-17 16:39:35.135553-05
349	business-hours	{"ts": "2026-07-17T21:44:35.186Z", "updated": 12}	2026-07-17 16:44:35.197412-05
350	location-history-prune	{"deleted": 0}	2026-07-17 16:48:39.992453-05
351	business-hours	{"ts": "2026-07-17T21:53:38.983Z", "updated": 12}	2026-07-17 16:53:38.985361-05
352	business-hours	{"ts": "2026-07-17T21:58:39.013Z", "updated": 12}	2026-07-17 16:58:39.024786-05
353	business-hours	{"ts": "2026-07-17T22:03:39.103Z", "updated": 12}	2026-07-17 17:03:39.104444-05
354	business-hours	{"ts": "2026-07-17T22:08:39.045Z", "updated": 12}	2026-07-17 17:08:39.046896-05
355	business-hours	{"ts": "2026-07-17T22:13:39.040Z", "updated": 12}	2026-07-17 17:13:39.041756-05
356	business-hours	{"ts": "2026-07-17T22:18:39.091Z", "updated": 12}	2026-07-17 17:18:39.092757-05
357	business-hours	{"ts": "2026-07-17T22:23:39.081Z", "updated": 12}	2026-07-17 17:23:39.08258-05
358	business-hours	{"ts": "2026-07-17T22:28:39.096Z", "updated": 12}	2026-07-17 17:28:39.0975-05
359	business-hours	{"ts": "2026-07-17T22:33:39.078Z", "updated": 12}	2026-07-17 17:33:39.079748-05
360	business-hours	{"ts": "2026-07-17T22:38:39.166Z", "updated": 12}	2026-07-17 17:38:39.172173-05
361	business-hours	{"ts": "2026-07-17T22:43:39.164Z", "updated": 12}	2026-07-17 17:43:39.164981-05
362	business-hours	{"ts": "2026-07-17T22:48:39.178Z", "updated": 12}	2026-07-17 17:48:39.179217-05
363	business-hours	{"ts": "2026-07-17T22:53:39.188Z", "updated": 12}	2026-07-17 17:53:39.189537-05
364	business-hours	{"ts": "2026-07-17T22:58:39.190Z", "updated": 12}	2026-07-17 17:58:39.190784-05
365	business-hours	{"ts": "2026-07-17T23:03:39.185Z", "updated": 12}	2026-07-17 18:03:39.186655-05
366	business-hours	{"ts": "2026-07-17T23:08:39.211Z", "updated": 12}	2026-07-17 18:08:39.212133-05
367	business-hours	{"ts": "2026-07-17T23:13:39.213Z", "updated": 12}	2026-07-17 18:13:39.213757-05
368	business-hours	{"ts": "2026-07-17T23:18:39.345Z", "updated": 12}	2026-07-17 18:18:39.345855-05
369	business-hours	{"ts": "2026-07-17T23:23:39.222Z", "updated": 12}	2026-07-17 18:23:39.222923-05
370	business-hours	{"ts": "2026-07-17T23:28:39.267Z", "updated": 12}	2026-07-17 18:28:39.267943-05
371	business-hours	{"ts": "2026-07-17T23:33:39.317Z", "updated": 12}	2026-07-17 18:33:39.320983-05
372	business-hours	{"ts": "2026-07-17T23:38:39.322Z", "updated": 12}	2026-07-17 18:38:39.32524-05
373	business-hours	{"ts": "2026-07-17T23:43:39.329Z", "updated": 12}	2026-07-17 18:43:39.330587-05
374	business-hours	{"ts": "2026-07-17T23:48:39.344Z", "updated": 12}	2026-07-17 18:48:39.345323-05
375	business-hours	{"ts": "2026-07-17T23:53:39.417Z", "updated": 12}	2026-07-17 18:53:39.417887-05
376	business-hours	{"ts": "2026-07-17T23:58:39.409Z", "updated": 12}	2026-07-17 18:58:39.410778-05
377	business-hours	{"ts": "2026-07-18T00:03:39.415Z", "updated": 12}	2026-07-17 19:03:39.416876-05
378	business-hours	{"ts": "2026-07-18T00:08:39.459Z", "updated": 12}	2026-07-17 19:08:39.459896-05
379	business-hours	{"ts": "2026-07-18T00:13:39.496Z", "updated": 12}	2026-07-17 19:13:39.497402-05
380	business-hours	{"ts": "2026-07-18T00:18:39.548Z", "updated": 12}	2026-07-17 19:18:39.549122-05
381	business-hours	{"ts": "2026-07-18T00:23:39.506Z", "updated": 12}	2026-07-17 19:23:39.507526-05
382	business-hours	{"ts": "2026-07-18T00:28:39.524Z", "updated": 12}	2026-07-17 19:28:39.525735-05
383	business-hours	{"ts": "2026-07-18T00:33:39.548Z", "updated": 12}	2026-07-17 19:33:39.548722-05
384	business-hours	{"ts": "2026-07-18T00:38:39.551Z", "updated": 12}	2026-07-17 19:38:39.55223-05
385	business-hours	{"ts": "2026-07-18T00:43:39.607Z", "updated": 12}	2026-07-17 19:43:39.614815-05
386	business-hours	{"ts": "2026-07-18T00:48:39.558Z", "updated": 12}	2026-07-17 19:48:39.558935-05
387	location-history-prune	{"deleted": 0}	2026-07-17 19:53:05.649733-05
388	location-history-prune	{"deleted": 0}	2026-07-17 19:55:47.96897-05
389	location-history-prune	{"deleted": 0}	2026-07-17 19:58:58.338355-05
390	location-history-prune	{"deleted": 0}	2026-07-17 20:02:22.195996-05
391	business-hours	{"ts": "2026-07-18T01:07:21.310Z", "updated": 12}	2026-07-17 20:07:21.311325-05
392	business-hours	{"ts": "2026-07-18T01:12:21.282Z", "updated": 12}	2026-07-17 20:12:21.283331-05
393	business-hours	{"ts": "2026-07-18T01:17:21.382Z", "updated": 12}	2026-07-17 20:17:21.383909-05
394	business-hours	{"ts": "2026-07-18T01:22:21.286Z", "updated": 12}	2026-07-17 20:22:21.288138-05
395	business-hours	{"ts": "2026-07-18T01:27:21.287Z", "updated": 12}	2026-07-17 20:27:21.28813-05
396	business-hours	{"ts": "2026-07-18T01:32:21.284Z", "updated": 12}	2026-07-17 20:32:21.285383-05
397	business-hours	{"ts": "2026-07-18T01:37:21.326Z", "updated": 12}	2026-07-17 20:37:21.326818-05
398	business-hours	{"ts": "2026-07-18T01:42:21.330Z", "updated": 12}	2026-07-17 20:42:21.331401-05
399	business-hours	{"ts": "2026-07-18T01:47:21.388Z", "updated": 12}	2026-07-17 20:47:21.389702-05
662	location-history-prune	{"deleted": 0}	2026-07-18 18:32:28.857775-05
400	business-hours	{"ts": "2026-07-18T01:52:21.436Z", "updated": 12}	2026-07-17 20:52:21.438388-05
401	business-hours	{"ts": "2026-07-18T01:57:21.403Z", "updated": 12}	2026-07-17 20:57:21.404338-05
402	business-hours	{"ts": "2026-07-18T02:02:21.434Z", "updated": 12}	2026-07-17 21:02:21.440222-05
403	business-hours	{"ts": "2026-07-18T02:07:21.528Z", "updated": 12}	2026-07-17 21:07:21.529357-05
404	business-hours	{"ts": "2026-07-18T02:12:21.504Z", "updated": 12}	2026-07-17 21:12:21.507755-05
405	business-hours	{"ts": "2026-07-18T02:17:21.628Z", "updated": 12}	2026-07-17 21:17:21.629438-05
406	business-hours	{"ts": "2026-07-18T02:22:21.597Z", "updated": 12}	2026-07-17 21:22:21.597841-05
407	business-hours	{"ts": "2026-07-18T02:27:21.583Z", "updated": 12}	2026-07-17 21:27:21.584505-05
408	business-hours	{"ts": "2026-07-18T02:32:21.616Z", "updated": 12}	2026-07-17 21:32:21.629739-05
409	business-hours	{"ts": "2026-07-18T02:37:21.632Z", "updated": 12}	2026-07-17 21:37:21.633627-05
410	business-hours	{"ts": "2026-07-18T02:42:21.634Z", "updated": 12}	2026-07-17 21:42:21.636829-05
411	business-hours	{"ts": "2026-07-18T02:47:21.666Z", "updated": 12}	2026-07-17 21:47:21.667206-05
412	business-hours	{"ts": "2026-07-18T02:52:21.888Z", "updated": 12}	2026-07-17 21:52:21.891033-05
413	business-hours	{"ts": "2026-07-18T02:57:21.680Z", "updated": 12}	2026-07-17 21:57:21.681139-05
414	business-hours	{"ts": "2026-07-18T03:02:21.786Z", "updated": 12}	2026-07-17 22:02:21.787057-05
415	business-hours	{"ts": "2026-07-18T03:07:21.753Z", "updated": 12}	2026-07-17 22:07:21.75406-05
416	business-hours	{"ts": "2026-07-18T03:12:21.721Z", "updated": 12}	2026-07-17 22:12:21.722546-05
417	business-hours	{"ts": "2026-07-18T03:17:21.821Z", "updated": 12}	2026-07-17 22:17:21.82494-05
418	business-hours	{"ts": "2026-07-18T03:22:21.777Z", "updated": 12}	2026-07-17 22:22:21.780874-05
419	business-hours	{"ts": "2026-07-18T03:27:21.802Z", "updated": 12}	2026-07-17 22:27:21.805-05
420	business-hours	{"ts": "2026-07-18T03:32:21.793Z", "updated": 12}	2026-07-17 22:32:21.794339-05
421	business-hours	{"ts": "2026-07-18T03:37:21.875Z", "updated": 12}	2026-07-17 22:37:21.875792-05
422	business-hours	{"ts": "2026-07-18T03:42:21.955Z", "updated": 12}	2026-07-17 22:42:21.956016-05
423	business-hours	{"ts": "2026-07-18T03:47:21.892Z", "updated": 12}	2026-07-17 22:47:21.894056-05
424	business-hours	{"ts": "2026-07-18T03:52:21.935Z", "updated": 12}	2026-07-17 22:52:21.93898-05
425	business-hours	{"ts": "2026-07-18T03:57:21.969Z", "updated": 12}	2026-07-17 22:57:21.978343-05
426	business-hours	{"ts": "2026-07-18T04:02:21.959Z", "updated": 12}	2026-07-17 23:02:21.96067-05
427	business-hours	{"ts": "2026-07-18T04:07:21.964Z", "updated": 12}	2026-07-17 23:07:21.964998-05
428	business-hours	{"ts": "2026-07-18T04:12:21.979Z", "updated": 12}	2026-07-17 23:12:21.986316-05
429	business-hours	{"ts": "2026-07-18T04:17:22.056Z", "updated": 12}	2026-07-17 23:17:22.057846-05
430	business-hours	{"ts": "2026-07-18T04:22:22.023Z", "updated": 12}	2026-07-17 23:22:22.025771-05
431	business-hours	{"ts": "2026-07-18T04:27:22.022Z", "updated": 12}	2026-07-17 23:27:22.023487-05
432	business-hours	{"ts": "2026-07-18T04:32:22.094Z", "updated": 12}	2026-07-17 23:32:22.09571-05
433	business-hours	{"ts": "2026-07-18T04:37:22.048Z", "updated": 12}	2026-07-17 23:37:22.050243-05
434	business-hours	{"ts": "2026-07-18T04:42:22.071Z", "updated": 12}	2026-07-17 23:42:22.072088-05
435	business-hours	{"ts": "2026-07-18T04:47:22.092Z", "updated": 12}	2026-07-17 23:47:22.093907-05
436	business-hours	{"ts": "2026-07-18T04:52:22.134Z", "updated": 12}	2026-07-17 23:52:22.13578-05
437	business-hours	{"ts": "2026-07-18T04:57:22.111Z", "updated": 12}	2026-07-17 23:57:22.112073-05
438	business-hours	{"ts": "2026-07-18T05:02:22.179Z", "updated": 12}	2026-07-18 00:02:22.180905-05
439	business-hours	{"ts": "2026-07-18T05:07:22.180Z", "updated": 12}	2026-07-18 00:07:22.181806-05
440	business-hours	{"ts": "2026-07-18T05:12:22.177Z", "updated": 12}	2026-07-18 00:12:22.178479-05
441	business-hours	{"ts": "2026-07-18T05:17:22.261Z", "updated": 12}	2026-07-18 00:17:22.261976-05
442	business-hours	{"ts": "2026-07-18T05:22:22.216Z", "updated": 12}	2026-07-18 00:22:22.217267-05
443	business-hours	{"ts": "2026-07-18T05:27:22.271Z", "updated": 12}	2026-07-18 00:27:22.272933-05
444	business-hours	{"ts": "2026-07-18T05:32:22.268Z", "updated": 12}	2026-07-18 00:32:22.26935-05
445	business-hours	{"ts": "2026-07-18T05:37:22.263Z", "updated": 12}	2026-07-18 00:37:22.26478-05
446	business-hours	{"ts": "2026-07-18T05:42:22.282Z", "updated": 12}	2026-07-18 00:42:22.282967-05
447	business-hours	{"ts": "2026-07-18T05:47:22.307Z", "updated": 12}	2026-07-18 00:47:22.308598-05
448	business-hours	{"ts": "2026-07-18T05:52:22.318Z", "updated": 12}	2026-07-18 00:52:22.319051-05
449	business-hours	{"ts": "2026-07-18T05:57:22.321Z", "updated": 12}	2026-07-18 00:57:22.322235-05
450	business-hours	{"ts": "2026-07-18T06:02:22.368Z", "updated": 12}	2026-07-18 01:02:22.373276-05
451	business-hours	{"ts": "2026-07-18T06:07:22.398Z", "updated": 12}	2026-07-18 01:07:22.399475-05
452	business-hours	{"ts": "2026-07-18T06:12:22.394Z", "updated": 12}	2026-07-18 01:12:22.395715-05
453	business-hours	{"ts": "2026-07-18T06:17:22.480Z", "updated": 12}	2026-07-18 01:17:22.484681-05
454	business-hours	{"ts": "2026-07-18T06:22:22.401Z", "updated": 12}	2026-07-18 01:22:22.403062-05
455	business-hours	{"ts": "2026-07-18T06:27:22.417Z", "updated": 12}	2026-07-18 01:27:22.418991-05
456	business-hours	{"ts": "2026-07-18T06:32:22.434Z", "updated": 12}	2026-07-18 01:32:22.44116-05
457	business-hours	{"ts": "2026-07-18T06:37:22.483Z", "updated": 12}	2026-07-18 01:37:22.484195-05
458	business-hours	{"ts": "2026-07-18T06:42:22.479Z", "updated": 12}	2026-07-18 01:42:22.480503-05
459	business-hours	{"ts": "2026-07-18T06:47:22.499Z", "updated": 12}	2026-07-18 01:47:22.500993-05
460	business-hours	{"ts": "2026-07-18T06:52:22.506Z", "updated": 12}	2026-07-18 01:52:22.508127-05
461	business-hours	{"ts": "2026-07-18T06:57:22.505Z", "updated": 12}	2026-07-18 01:57:22.506166-05
462	business-hours	{"ts": "2026-07-18T07:02:22.528Z", "updated": 12}	2026-07-18 02:02:22.529513-05
463	business-hours	{"ts": "2026-07-18T07:07:22.491Z", "updated": 12}	2026-07-18 02:07:22.492603-05
464	business-hours	{"ts": "2026-07-18T07:12:22.557Z", "updated": 12}	2026-07-18 02:12:22.559841-05
730	location-history-prune	{"deleted": 0}	2026-07-18 23:52:50.940437-05
465	business-hours	{"ts": "2026-07-18T07:17:22.681Z", "updated": 12}	2026-07-18 02:17:22.685057-05
466	business-hours	{"ts": "2026-07-18T07:22:22.588Z", "updated": 12}	2026-07-18 02:22:22.589918-05
467	business-hours	{"ts": "2026-07-18T07:27:22.588Z", "updated": 12}	2026-07-18 02:27:22.589305-05
468	business-hours	{"ts": "2026-07-18T07:32:22.622Z", "updated": 12}	2026-07-18 02:32:22.623058-05
469	business-hours	{"ts": "2026-07-18T07:37:22.621Z", "updated": 12}	2026-07-18 02:37:22.624166-05
470	business-hours	{"ts": "2026-07-18T07:42:22.655Z", "updated": 12}	2026-07-18 02:42:22.656548-05
471	business-hours	{"ts": "2026-07-18T07:47:22.682Z", "updated": 12}	2026-07-18 02:47:22.683225-05
472	business-hours	{"ts": "2026-07-18T07:52:22.680Z", "updated": 12}	2026-07-18 02:52:22.681435-05
473	business-hours	{"ts": "2026-07-18T07:57:22.683Z", "updated": 12}	2026-07-18 02:57:22.684738-05
474	business-hours	{"ts": "2026-07-18T08:02:22.700Z", "updated": 12}	2026-07-18 03:02:22.701665-05
475	business-hours	{"ts": "2026-07-18T08:07:22.702Z", "updated": 12}	2026-07-18 03:07:22.70391-05
476	business-hours	{"ts": "2026-07-18T08:12:22.717Z", "updated": 12}	2026-07-18 03:12:22.718537-05
477	business-hours	{"ts": "2026-07-18T08:17:22.872Z", "updated": 12}	2026-07-18 03:17:22.873463-05
478	business-hours	{"ts": "2026-07-18T08:22:22.739Z", "updated": 12}	2026-07-18 03:22:22.741811-05
479	business-hours	{"ts": "2026-07-18T08:27:22.768Z", "updated": 12}	2026-07-18 03:27:22.769038-05
480	business-hours	{"ts": "2026-07-18T08:32:22.784Z", "updated": 12}	2026-07-18 03:32:22.78692-05
481	business-hours	{"ts": "2026-07-18T08:37:22.755Z", "updated": 12}	2026-07-18 03:37:22.756577-05
482	business-hours	{"ts": "2026-07-18T08:42:23.002Z", "updated": 12}	2026-07-18 03:42:23.007394-05
483	business-hours	{"ts": "2026-07-18T08:47:22.784Z", "updated": 12}	2026-07-18 03:47:22.786634-05
484	business-hours	{"ts": "2026-07-18T08:52:22.806Z", "updated": 12}	2026-07-18 03:52:22.807752-05
485	business-hours	{"ts": "2026-07-18T08:57:22.790Z", "updated": 12}	2026-07-18 03:57:22.791715-05
486	business-hours	{"ts": "2026-07-18T09:02:22.829Z", "updated": 12}	2026-07-18 04:02:22.832205-05
487	business-hours	{"ts": "2026-07-18T09:07:22.838Z", "updated": 12}	2026-07-18 04:07:22.839638-05
488	business-hours	{"ts": "2026-07-18T09:12:22.830Z", "updated": 12}	2026-07-18 04:12:22.830888-05
489	business-hours	{"ts": "2026-07-18T09:17:23.014Z", "updated": 12}	2026-07-18 04:17:23.015591-05
490	business-hours	{"ts": "2026-07-18T09:22:22.870Z", "updated": 12}	2026-07-18 04:22:22.871921-05
491	business-hours	{"ts": "2026-07-18T09:27:22.872Z", "updated": 12}	2026-07-18 04:27:22.873524-05
492	business-hours	{"ts": "2026-07-18T09:32:22.910Z", "updated": 12}	2026-07-18 04:32:22.9121-05
493	business-hours	{"ts": "2026-07-18T09:37:22.892Z", "updated": 12}	2026-07-18 04:37:22.893767-05
494	business-hours	{"ts": "2026-07-18T09:42:22.932Z", "updated": 12}	2026-07-18 04:42:22.934685-05
495	business-hours	{"ts": "2026-07-18T09:47:22.908Z", "updated": 12}	2026-07-18 04:47:22.909069-05
496	business-hours	{"ts": "2026-07-18T09:52:22.952Z", "updated": 12}	2026-07-18 04:52:22.954557-05
497	business-hours	{"ts": "2026-07-18T09:57:22.935Z", "updated": 12}	2026-07-18 04:57:22.935717-05
498	business-hours	{"ts": "2026-07-18T10:02:22.983Z", "updated": 12}	2026-07-18 05:02:22.985072-05
499	business-hours	{"ts": "2026-07-18T10:07:22.976Z", "updated": 12}	2026-07-18 05:07:22.977909-05
500	business-hours	{"ts": "2026-07-18T10:12:22.970Z", "updated": 12}	2026-07-18 05:12:22.971019-05
501	business-hours	{"ts": "2026-07-18T10:17:23.066Z", "updated": 12}	2026-07-18 05:17:23.067527-05
502	business-hours	{"ts": "2026-07-18T10:22:22.988Z", "updated": 12}	2026-07-18 05:22:22.989624-05
503	business-hours	{"ts": "2026-07-18T10:27:23.008Z", "updated": 12}	2026-07-18 05:27:23.010691-05
504	business-hours	{"ts": "2026-07-18T10:32:23.026Z", "updated": 12}	2026-07-18 05:32:23.041113-05
505	business-hours	{"ts": "2026-07-18T10:37:23.067Z", "updated": 12}	2026-07-18 05:37:23.075527-05
506	business-hours	{"ts": "2026-07-18T10:42:23.120Z", "updated": 12}	2026-07-18 05:42:23.121477-05
507	business-hours	{"ts": "2026-07-18T10:47:23.077Z", "updated": 12}	2026-07-18 05:47:23.08007-05
508	business-hours	{"ts": "2026-07-18T10:52:23.078Z", "updated": 12}	2026-07-18 05:52:23.090484-05
509	business-hours	{"ts": "2026-07-18T10:57:23.054Z", "updated": 12}	2026-07-18 05:57:23.055498-05
510	business-hours	{"ts": "2026-07-18T11:02:23.108Z", "updated": 12}	2026-07-18 06:02:23.109701-05
511	business-hours	{"ts": "2026-07-18T11:07:23.089Z", "updated": 12}	2026-07-18 06:07:23.090518-05
512	business-hours	{"ts": "2026-07-18T11:12:23.062Z", "updated": 12}	2026-07-18 06:12:23.063148-05
513	business-hours	{"ts": "2026-07-18T11:17:23.348Z", "updated": 12}	2026-07-18 06:17:23.349242-05
514	business-hours	{"ts": "2026-07-18T11:22:23.087Z", "updated": 12}	2026-07-18 06:22:23.088441-05
515	business-hours	{"ts": "2026-07-18T11:27:23.099Z", "updated": 12}	2026-07-18 06:27:23.099957-05
516	business-hours	{"ts": "2026-07-18T11:32:23.109Z", "updated": 12}	2026-07-18 06:32:23.110504-05
517	business-hours	{"ts": "2026-07-18T11:37:23.103Z", "updated": 12}	2026-07-18 06:37:23.1041-05
518	business-hours	{"ts": "2026-07-18T11:42:23.171Z", "updated": 12}	2026-07-18 06:42:23.173017-05
519	business-hours	{"ts": "2026-07-18T11:47:23.110Z", "updated": 12}	2026-07-18 06:47:23.111059-05
520	business-hours	{"ts": "2026-07-18T11:52:23.157Z", "updated": 12}	2026-07-18 06:52:23.158845-05
521	business-hours	{"ts": "2026-07-18T11:57:23.194Z", "updated": 12}	2026-07-18 06:57:23.195088-05
522	business-hours	{"ts": "2026-07-18T12:02:23.177Z", "updated": 12}	2026-07-18 07:02:23.179237-05
523	business-hours	{"ts": "2026-07-18T12:07:23.161Z", "updated": 12}	2026-07-18 07:07:23.162317-05
524	business-hours	{"ts": "2026-07-18T12:12:23.229Z", "updated": 12}	2026-07-18 07:12:23.230177-05
525	business-hours	{"ts": "2026-07-18T12:17:23.287Z", "updated": 12}	2026-07-18 07:17:23.288218-05
526	business-hours	{"ts": "2026-07-18T12:22:23.162Z", "updated": 12}	2026-07-18 07:22:23.164639-05
527	business-hours	{"ts": "2026-07-18T12:27:23.180Z", "updated": 12}	2026-07-18 07:27:23.183392-05
528	business-hours	{"ts": "2026-07-18T12:32:23.184Z", "updated": 12}	2026-07-18 07:32:23.185249-05
529	business-hours	{"ts": "2026-07-18T12:37:23.170Z", "updated": 12}	2026-07-18 07:37:23.171466-05
1243	location-history-prune	{"deleted": 0}	2026-07-20 16:46:39.247995-05
530	business-hours	{"ts": "2026-07-18T12:42:23.189Z", "updated": 12}	2026-07-18 07:42:23.190334-05
531	business-hours	{"ts": "2026-07-18T12:47:23.187Z", "updated": 12}	2026-07-18 07:47:23.188334-05
532	business-hours	{"ts": "2026-07-18T12:52:23.191Z", "updated": 12}	2026-07-18 07:52:23.192523-05
533	business-hours	{"ts": "2026-07-18T12:57:23.182Z", "updated": 12}	2026-07-18 07:57:23.182748-05
534	business-hours	{"ts": "2026-07-18T13:02:23.272Z", "updated": 12}	2026-07-18 08:02:23.275705-05
535	business-hours	{"ts": "2026-07-18T13:07:23.216Z", "updated": 12}	2026-07-18 08:07:23.217857-05
536	business-hours	{"ts": "2026-07-18T13:12:23.264Z", "updated": 12}	2026-07-18 08:12:23.26708-05
537	business-hours	{"ts": "2026-07-18T13:17:23.319Z", "updated": 12}	2026-07-18 08:17:23.328399-05
538	business-hours	{"ts": "2026-07-18T13:22:23.223Z", "updated": 12}	2026-07-18 08:22:23.224469-05
539	business-hours	{"ts": "2026-07-18T13:27:23.235Z", "updated": 12}	2026-07-18 08:27:23.236018-05
540	business-hours	{"ts": "2026-07-18T13:32:23.410Z", "updated": 12}	2026-07-18 08:32:23.412253-05
541	business-hours	{"ts": "2026-07-18T13:37:23.273Z", "updated": 12}	2026-07-18 08:37:23.276168-05
542	business-hours	{"ts": "2026-07-18T13:42:23.244Z", "updated": 12}	2026-07-18 08:42:23.245567-05
543	business-hours	{"ts": "2026-07-18T13:47:23.232Z", "updated": 12}	2026-07-18 08:47:23.232964-05
544	business-hours	{"ts": "2026-07-18T13:52:23.266Z", "updated": 12}	2026-07-18 08:52:23.267336-05
545	business-hours	{"ts": "2026-07-18T13:57:23.267Z", "updated": 12}	2026-07-18 08:57:23.268006-05
546	business-hours	{"ts": "2026-07-18T14:02:23.263Z", "updated": 12}	2026-07-18 09:02:23.264324-05
547	business-hours	{"ts": "2026-07-18T14:07:23.329Z", "updated": 12}	2026-07-18 09:07:23.336457-05
548	business-hours	{"ts": "2026-07-18T14:12:23.317Z", "updated": 12}	2026-07-18 09:12:23.320195-05
549	business-hours	{"ts": "2026-07-18T14:17:23.406Z", "updated": 12}	2026-07-18 09:17:23.40807-05
550	business-hours	{"ts": "2026-07-18T14:22:23.263Z", "updated": 12}	2026-07-18 09:22:23.264028-05
551	business-hours	{"ts": "2026-07-18T14:27:23.281Z", "updated": 12}	2026-07-18 09:27:23.282554-05
552	business-hours	{"ts": "2026-07-18T14:32:23.286Z", "updated": 12}	2026-07-18 09:32:23.287042-05
553	business-hours	{"ts": "2026-07-18T14:37:23.308Z", "updated": 12}	2026-07-18 09:37:23.309316-05
554	business-hours	{"ts": "2026-07-18T14:42:23.374Z", "updated": 12}	2026-07-18 09:42:23.375368-05
555	business-hours	{"ts": "2026-07-18T14:47:23.391Z", "updated": 12}	2026-07-18 09:47:23.393175-05
556	business-hours	{"ts": "2026-07-18T14:52:23.412Z", "updated": 12}	2026-07-18 09:52:23.413592-05
557	business-hours	{"ts": "2026-07-18T14:57:23.423Z", "updated": 12}	2026-07-18 09:57:23.423534-05
558	business-hours	{"ts": "2026-07-18T15:02:23.437Z", "updated": 12}	2026-07-18 10:02:23.439148-05
559	business-hours	{"ts": "2026-07-18T15:07:23.434Z", "updated": 12}	2026-07-18 10:07:23.43553-05
560	business-hours	{"ts": "2026-07-18T15:12:23.485Z", "updated": 12}	2026-07-18 10:12:23.485635-05
561	business-hours	{"ts": "2026-07-18T15:17:23.554Z", "updated": 12}	2026-07-18 10:17:23.555107-05
562	business-hours	{"ts": "2026-07-18T15:22:23.448Z", "updated": 12}	2026-07-18 10:22:23.448644-05
563	business-hours	{"ts": "2026-07-18T15:27:23.443Z", "updated": 12}	2026-07-18 10:27:23.443807-05
564	business-hours	{"ts": "2026-07-18T15:32:23.535Z", "updated": 12}	2026-07-18 10:32:23.537398-05
565	business-hours	{"ts": "2026-07-18T15:37:23.504Z", "updated": 12}	2026-07-18 10:37:23.505375-05
566	business-hours	{"ts": "2026-07-18T15:42:23.580Z", "updated": 12}	2026-07-18 10:42:23.583515-05
567	business-hours	{"ts": "2026-07-18T15:47:23.524Z", "updated": 12}	2026-07-18 10:47:23.525235-05
568	business-hours	{"ts": "2026-07-18T15:52:23.564Z", "updated": 12}	2026-07-18 10:52:23.565853-05
569	location-history-prune	{"deleted": 0}	2026-07-18 10:53:44.089831-05
570	location-history-prune	{"deleted": 0}	2026-07-18 10:58:07.280261-05
571	business-hours	{"ts": "2026-07-18T16:03:06.417Z", "updated": 12}	2026-07-18 11:03:06.419009-05
572	business-hours	{"ts": "2026-07-18T16:08:06.424Z", "updated": 12}	2026-07-18 11:08:06.42507-05
573	business-hours	{"ts": "2026-07-18T16:13:06.409Z", "updated": 12}	2026-07-18 11:13:06.409716-05
574	business-hours	{"ts": "2026-07-18T16:18:06.499Z", "updated": 12}	2026-07-18 11:18:06.500203-05
575	business-hours	{"ts": "2026-07-18T16:23:06.426Z", "updated": 12}	2026-07-18 11:23:06.426866-05
576	business-hours	{"ts": "2026-07-18T16:28:06.427Z", "updated": 12}	2026-07-18 11:28:06.434929-05
577	business-hours	{"ts": "2026-07-18T16:33:06.470Z", "updated": 12}	2026-07-18 11:33:06.470893-05
578	business-hours	{"ts": "2026-07-18T16:38:06.463Z", "updated": 12}	2026-07-18 11:38:06.46424-05
579	business-hours	{"ts": "2026-07-18T16:43:06.611Z", "updated": 12}	2026-07-18 11:43:06.61296-05
580	business-hours	{"ts": "2026-07-18T16:48:06.530Z", "updated": 12}	2026-07-18 11:48:06.532245-05
581	business-hours	{"ts": "2026-07-18T16:53:06.568Z", "updated": 12}	2026-07-18 11:53:06.57054-05
582	business-hours	{"ts": "2026-07-18T16:58:06.643Z", "updated": 12}	2026-07-18 11:58:06.644054-05
583	business-hours	{"ts": "2026-07-18T17:03:06.614Z", "updated": 12}	2026-07-18 12:03:06.615778-05
584	business-hours	{"ts": "2026-07-18T17:08:06.683Z", "updated": 12}	2026-07-18 12:08:06.684444-05
585	business-hours	{"ts": "2026-07-18T17:13:06.672Z", "updated": 12}	2026-07-18 12:13:06.672867-05
586	business-hours	{"ts": "2026-07-18T17:18:06.894Z", "updated": 12}	2026-07-18 12:18:06.895586-05
587	business-hours	{"ts": "2026-07-18T17:23:06.724Z", "updated": 12}	2026-07-18 12:23:06.72917-05
588	business-hours	{"ts": "2026-07-18T17:28:06.755Z", "updated": 12}	2026-07-18 12:28:06.757077-05
589	business-hours	{"ts": "2026-07-18T17:33:06.778Z", "updated": 12}	2026-07-18 12:33:06.788742-05
590	business-hours	{"ts": "2026-07-18T17:38:06.984Z", "updated": 12}	2026-07-18 12:38:06.988171-05
591	business-hours	{"ts": "2026-07-18T17:43:06.813Z", "updated": 12}	2026-07-18 12:43:06.814359-05
592	business-hours	{"ts": "2026-07-18T17:48:06.921Z", "updated": 12}	2026-07-18 12:48:06.931223-05
593	business-hours	{"ts": "2026-07-18T17:53:06.862Z", "updated": 12}	2026-07-18 12:53:06.863207-05
594	business-hours	{"ts": "2026-07-18T17:58:06.880Z", "updated": 12}	2026-07-18 12:58:06.882384-05
595	business-hours	{"ts": "2026-07-18T18:03:06.910Z", "updated": 12}	2026-07-18 13:03:06.911337-05
596	business-hours	{"ts": "2026-07-18T18:08:06.950Z", "updated": 12}	2026-07-18 13:08:06.952882-05
597	business-hours	{"ts": "2026-07-18T18:13:07.051Z", "updated": 12}	2026-07-18 13:13:07.053095-05
598	business-hours	{"ts": "2026-07-18T18:18:07.130Z", "updated": 12}	2026-07-18 13:18:07.134542-05
599	business-hours	{"ts": "2026-07-18T18:23:07.024Z", "updated": 12}	2026-07-18 13:23:07.027146-05
600	business-hours	{"ts": "2026-07-18T18:28:07.058Z", "updated": 12}	2026-07-18 13:28:07.059771-05
601	business-hours	{"ts": "2026-07-18T18:33:07.044Z", "updated": 12}	2026-07-18 13:33:07.045458-05
602	business-hours	{"ts": "2026-07-18T18:38:07.183Z", "updated": 12}	2026-07-18 13:38:07.185309-05
603	business-hours	{"ts": "2026-07-18T18:43:07.078Z", "updated": 12}	2026-07-18 13:43:07.079672-05
604	business-hours	{"ts": "2026-07-18T18:48:07.175Z", "updated": 12}	2026-07-18 13:48:07.176666-05
605	business-hours	{"ts": "2026-07-18T18:53:07.126Z", "updated": 12}	2026-07-18 13:53:07.131366-05
606	business-hours	{"ts": "2026-07-18T18:58:07.116Z", "updated": 12}	2026-07-18 13:58:07.117417-05
607	business-hours	{"ts": "2026-07-18T19:03:07.190Z", "updated": 12}	2026-07-18 14:03:07.195741-05
608	business-hours	{"ts": "2026-07-18T19:08:07.176Z", "updated": 12}	2026-07-18 14:08:07.177164-05
609	business-hours	{"ts": "2026-07-18T19:13:07.196Z", "updated": 12}	2026-07-18 14:13:07.196854-05
610	business-hours	{"ts": "2026-07-18T19:18:07.315Z", "updated": 12}	2026-07-18 14:18:07.319368-05
611	business-hours	{"ts": "2026-07-18T19:23:07.287Z", "updated": 12}	2026-07-18 14:23:07.288798-05
612	business-hours	{"ts": "2026-07-18T19:28:07.240Z", "updated": 12}	2026-07-18 14:28:07.244543-05
613	business-hours	{"ts": "2026-07-18T19:33:07.280Z", "updated": 12}	2026-07-18 14:33:07.281077-05
614	business-hours	{"ts": "2026-07-18T19:38:07.276Z", "updated": 12}	2026-07-18 14:38:07.277184-05
615	business-hours	{"ts": "2026-07-18T19:43:07.339Z", "updated": 12}	2026-07-18 14:43:07.340154-05
616	business-hours	{"ts": "2026-07-18T19:48:07.408Z", "updated": 12}	2026-07-18 14:48:07.411595-05
617	business-hours	{"ts": "2026-07-18T19:53:07.434Z", "updated": 12}	2026-07-18 14:53:07.441762-05
618	business-hours	{"ts": "2026-07-18T19:58:07.328Z", "updated": 12}	2026-07-18 14:58:07.329244-05
619	business-hours	{"ts": "2026-07-18T20:03:07.366Z", "updated": 12}	2026-07-18 15:03:07.36766-05
620	business-hours	{"ts": "2026-07-18T20:08:07.485Z", "updated": 12}	2026-07-18 15:08:07.486788-05
621	business-hours	{"ts": "2026-07-18T20:13:07.429Z", "updated": 12}	2026-07-18 15:13:07.447222-05
622	business-hours	{"ts": "2026-07-18T20:18:07.474Z", "updated": 12}	2026-07-18 15:18:07.476506-05
623	business-hours	{"ts": "2026-07-18T20:23:07.401Z", "updated": 12}	2026-07-18 15:23:07.40301-05
624	business-hours	{"ts": "2026-07-18T20:28:07.436Z", "updated": 12}	2026-07-18 15:28:07.439459-05
625	business-hours	{"ts": "2026-07-18T20:33:07.490Z", "updated": 12}	2026-07-18 15:33:07.491138-05
626	business-hours	{"ts": "2026-07-18T20:38:07.440Z", "updated": 12}	2026-07-18 15:38:07.441122-05
627	business-hours	{"ts": "2026-07-18T20:43:07.472Z", "updated": 12}	2026-07-18 15:43:07.473655-05
628	business-hours	{"ts": "2026-07-18T20:48:07.473Z", "updated": 12}	2026-07-18 15:48:07.474441-05
629	business-hours	{"ts": "2026-07-18T20:53:07.537Z", "updated": 12}	2026-07-18 15:53:07.541868-05
630	business-hours	{"ts": "2026-07-18T20:58:07.478Z", "updated": 12}	2026-07-18 15:58:07.479149-05
631	business-hours	{"ts": "2026-07-18T21:03:07.486Z", "updated": 12}	2026-07-18 16:03:07.488899-05
632	business-hours	{"ts": "2026-07-18T21:08:07.513Z", "updated": 12}	2026-07-18 16:08:07.514556-05
633	business-hours	{"ts": "2026-07-18T21:13:07.523Z", "updated": 12}	2026-07-18 16:13:07.524715-05
634	business-hours	{"ts": "2026-07-18T21:18:07.763Z", "updated": 12}	2026-07-18 16:18:07.764043-05
635	business-hours	{"ts": "2026-07-18T21:23:07.560Z", "updated": 12}	2026-07-18 16:23:07.56178-05
636	business-hours	{"ts": "2026-07-18T21:28:07.576Z", "updated": 12}	2026-07-18 16:28:07.578877-05
637	business-hours	{"ts": "2026-07-18T21:33:07.710Z", "updated": 12}	2026-07-18 16:33:07.712852-05
638	business-hours	{"ts": "2026-07-18T21:38:07.594Z", "updated": 12}	2026-07-18 16:38:07.597094-05
639	business-hours	{"ts": "2026-07-18T21:43:07.617Z", "updated": 12}	2026-07-18 16:43:07.618407-05
640	business-hours	{"ts": "2026-07-18T21:48:07.639Z", "updated": 12}	2026-07-18 16:48:07.641344-05
641	business-hours	{"ts": "2026-07-18T21:53:07.669Z", "updated": 12}	2026-07-18 16:53:07.67098-05
642	business-hours	{"ts": "2026-07-18T21:58:07.681Z", "updated": 12}	2026-07-18 16:58:07.682045-05
643	business-hours	{"ts": "2026-07-18T22:03:07.669Z", "updated": 12}	2026-07-18 17:03:07.669699-05
644	business-hours	{"ts": "2026-07-18T22:08:07.865Z", "updated": 12}	2026-07-18 17:08:07.866781-05
645	business-hours	{"ts": "2026-07-18T22:13:07.705Z", "updated": 12}	2026-07-18 17:13:07.706494-05
646	business-hours	{"ts": "2026-07-18T22:18:07.768Z", "updated": 12}	2026-07-18 17:18:07.76854-05
647	business-hours	{"ts": "2026-07-18T22:23:07.759Z", "updated": 12}	2026-07-18 17:23:07.760611-05
648	location-history-prune	{"deleted": 0}	2026-07-18 17:27:38.2893-05
649	business-hours	{"ts": "2026-07-18T22:32:37.641Z", "updated": 12}	2026-07-18 17:32:37.652645-05
650	business-hours	{"ts": "2026-07-18T22:37:37.449Z", "updated": 12}	2026-07-18 17:37:37.451986-05
651	business-hours	{"ts": "2026-07-18T22:42:37.502Z", "updated": 12}	2026-07-18 17:42:37.505594-05
652	business-hours	{"ts": "2026-07-18T22:47:37.458Z", "updated": 12}	2026-07-18 17:47:37.460925-05
653	business-hours	{"ts": "2026-07-18T22:52:37.474Z", "updated": 12}	2026-07-18 17:52:37.476274-05
654	business-hours	{"ts": "2026-07-18T22:57:37.489Z", "updated": 12}	2026-07-18 17:57:37.490223-05
655	business-hours	{"ts": "2026-07-18T23:02:37.499Z", "updated": 12}	2026-07-18 18:02:37.501261-05
656	business-hours	{"ts": "2026-07-18T23:07:37.484Z", "updated": 12}	2026-07-18 18:07:37.485608-05
657	location-history-prune	{"deleted": 0}	2026-07-18 18:08:30.08834-05
658	business-hours	{"ts": "2026-07-18T23:13:29.369Z", "updated": 12}	2026-07-18 18:13:29.370184-05
659	business-hours	{"ts": "2026-07-18T23:18:29.455Z", "updated": 12}	2026-07-18 18:18:29.456138-05
660	business-hours	{"ts": "2026-07-18T23:23:29.369Z", "updated": 12}	2026-07-18 18:23:29.370589-05
661	business-hours	{"ts": "2026-07-18T23:28:29.336Z", "updated": 12}	2026-07-18 18:28:29.337157-05
663	business-hours	{"ts": "2026-07-18T23:37:28.041Z", "updated": 12}	2026-07-18 18:37:28.041781-05
664	location-history-prune	{"deleted": 0}	2026-07-18 18:37:58.001814-05
665	business-hours	{"ts": "2026-07-18T23:42:57.110Z", "updated": 12}	2026-07-18 18:42:57.11225-05
666	business-hours	{"ts": "2026-07-18T23:47:57.120Z", "updated": 12}	2026-07-18 18:47:57.12191-05
667	business-hours	{"ts": "2026-07-18T23:52:57.112Z", "updated": 12}	2026-07-18 18:52:57.114386-05
668	business-hours	{"ts": "2026-07-18T23:57:57.110Z", "updated": 12}	2026-07-18 18:57:57.111377-05
669	business-hours	{"ts": "2026-07-19T00:02:57.146Z", "updated": 12}	2026-07-18 19:02:57.147739-05
670	business-hours	{"ts": "2026-07-19T00:07:57.176Z", "updated": 12}	2026-07-18 19:07:57.17948-05
671	business-hours	{"ts": "2026-07-19T00:12:57.240Z", "updated": 12}	2026-07-18 19:12:57.242323-05
672	location-history-prune	{"deleted": 0}	2026-07-18 19:16:47.321248-05
673	business-hours	{"ts": "2026-07-19T00:21:46.139Z", "updated": 12}	2026-07-18 19:21:46.140669-05
674	business-hours	{"ts": "2026-07-19T00:26:46.229Z", "updated": 12}	2026-07-18 19:26:46.230331-05
675	location-history-prune	{"deleted": 0}	2026-07-18 19:34:16.214935-05
676	location-history-prune	{"deleted": 0}	2026-07-18 19:36:59.994961-05
677	business-hours	{"ts": "2026-07-19T00:41:59.282Z", "updated": 12}	2026-07-18 19:41:59.283204-05
678	business-hours	{"ts": "2026-07-19T00:46:59.285Z", "updated": 12}	2026-07-18 19:46:59.286747-05
679	business-hours	{"ts": "2026-07-19T00:51:59.273Z", "updated": 12}	2026-07-18 19:51:59.274296-05
680	business-hours	{"ts": "2026-07-19T00:56:59.283Z", "updated": 12}	2026-07-18 19:56:59.284049-05
681	business-hours	{"ts": "2026-07-19T01:01:59.337Z", "updated": 12}	2026-07-18 20:01:59.338683-05
682	business-hours	{"ts": "2026-07-19T01:06:59.341Z", "updated": 12}	2026-07-18 20:06:59.341419-05
683	business-hours	{"ts": "2026-07-19T01:11:59.395Z", "updated": 12}	2026-07-18 20:11:59.396546-05
684	business-hours	{"ts": "2026-07-19T01:16:59.408Z", "updated": 12}	2026-07-18 20:16:59.409602-05
685	business-hours	{"ts": "2026-07-19T01:21:59.449Z", "updated": 12}	2026-07-18 20:21:59.449778-05
686	business-hours	{"ts": "2026-07-19T01:26:59.460Z", "updated": 12}	2026-07-18 20:26:59.461052-05
687	business-hours	{"ts": "2026-07-19T01:31:59.453Z", "updated": 12}	2026-07-18 20:31:59.454565-05
688	business-hours	{"ts": "2026-07-19T01:36:59.491Z", "updated": 12}	2026-07-18 20:36:59.491759-05
689	business-hours	{"ts": "2026-07-19T01:41:59.495Z", "updated": 12}	2026-07-18 20:41:59.495581-05
690	business-hours	{"ts": "2026-07-19T01:46:59.558Z", "updated": 12}	2026-07-18 20:46:59.559632-05
691	business-hours	{"ts": "2026-07-19T01:51:59.529Z", "updated": 12}	2026-07-18 20:51:59.530496-05
692	business-hours	{"ts": "2026-07-19T01:56:59.558Z", "updated": 12}	2026-07-18 20:56:59.559701-05
693	business-hours	{"ts": "2026-07-19T02:01:59.549Z", "updated": 12}	2026-07-18 21:01:59.552971-05
694	business-hours	{"ts": "2026-07-19T02:06:59.675Z", "updated": 12}	2026-07-18 21:06:59.67802-05
695	business-hours	{"ts": "2026-07-19T02:11:59.597Z", "updated": 12}	2026-07-18 21:11:59.598527-05
696	business-hours	{"ts": "2026-07-19T02:16:59.599Z", "updated": 12}	2026-07-18 21:16:59.600198-05
697	business-hours	{"ts": "2026-07-19T02:21:59.675Z", "updated": 12}	2026-07-18 21:21:59.676627-05
698	business-hours	{"ts": "2026-07-19T02:26:59.693Z", "updated": 12}	2026-07-18 21:26:59.69442-05
699	business-hours	{"ts": "2026-07-19T02:31:59.668Z", "updated": 12}	2026-07-18 21:31:59.668945-05
700	business-hours	{"ts": "2026-07-19T02:36:59.710Z", "updated": 12}	2026-07-18 21:36:59.712004-05
701	business-hours	{"ts": "2026-07-19T02:41:59.711Z", "updated": 12}	2026-07-18 21:41:59.7123-05
702	business-hours	{"ts": "2026-07-19T02:46:59.726Z", "updated": 12}	2026-07-18 21:46:59.727672-05
703	business-hours	{"ts": "2026-07-19T02:51:59.762Z", "updated": 8}	2026-07-18 21:51:59.763163-05
704	business-hours	{"ts": "2026-07-19T02:56:59.768Z", "updated": 8}	2026-07-18 21:56:59.769805-05
705	business-hours	{"ts": "2026-07-19T03:01:59.786Z", "updated": 8}	2026-07-18 22:01:59.786692-05
706	business-hours	{"ts": "2026-07-19T03:06:59.793Z", "updated": 8}	2026-07-18 22:06:59.794613-05
707	location-history-prune	{"deleted": 0}	2026-07-18 22:08:34.426635-05
708	location-history-prune	{"deleted": 0}	2026-07-18 22:12:35.073966-05
709	business-hours	{"ts": "2026-07-19T03:17:33.952Z", "updated": 8}	2026-07-18 22:17:33.955353-05
710	business-hours	{"ts": "2026-07-19T03:22:33.972Z", "updated": 8}	2026-07-18 22:22:33.973343-05
711	location-history-prune	{"deleted": 0}	2026-07-18 22:23:04.769016-05
712	business-hours	{"ts": "2026-07-19T03:28:03.387Z", "updated": 8}	2026-07-18 22:28:03.387854-05
713	business-hours	{"ts": "2026-07-19T03:33:03.384Z", "updated": 8}	2026-07-18 22:33:03.384693-05
714	business-hours	{"ts": "2026-07-19T03:38:03.424Z", "updated": 8}	2026-07-18 22:38:03.427169-05
715	location-history-prune	{"deleted": 0}	2026-07-18 22:40:06.808362-05
716	business-hours	{"ts": "2026-07-19T03:45:05.342Z", "updated": 8}	2026-07-18 22:45:05.343347-05
717	business-hours	{"ts": "2026-07-19T03:50:05.367Z", "updated": 8}	2026-07-18 22:50:05.369252-05
718	business-hours	{"ts": "2026-07-19T03:55:05.333Z", "updated": 8}	2026-07-18 22:55:05.33412-05
719	business-hours	{"ts": "2026-07-19T04:00:05.408Z", "updated": 8}	2026-07-18 23:00:05.411516-05
720	business-hours	{"ts": "2026-07-19T04:05:05.362Z", "updated": 8}	2026-07-18 23:05:05.363416-05
721	business-hours	{"ts": "2026-07-19T04:10:05.362Z", "updated": 8}	2026-07-18 23:10:05.363715-05
722	business-hours	{"ts": "2026-07-19T04:15:05.380Z", "updated": 8}	2026-07-18 23:15:05.381453-05
723	business-hours	{"ts": "2026-07-19T04:20:05.425Z", "updated": 8}	2026-07-18 23:20:05.430924-05
724	business-hours	{"ts": "2026-07-19T04:25:05.522Z", "updated": 8}	2026-07-18 23:25:05.524394-05
725	business-hours	{"ts": "2026-07-19T04:30:05.391Z", "updated": 8}	2026-07-18 23:30:05.393094-05
726	business-hours	{"ts": "2026-07-19T04:35:05.390Z", "updated": 8}	2026-07-18 23:35:05.392011-05
727	business-hours	{"ts": "2026-07-19T04:40:05.411Z", "updated": 8}	2026-07-18 23:40:05.41197-05
728	business-hours	{"ts": "2026-07-19T04:45:05.416Z", "updated": 8}	2026-07-18 23:45:05.430124-05
729	business-hours	{"ts": "2026-07-19T04:50:05.521Z", "updated": 8}	2026-07-18 23:50:05.522313-05
731	business-hours	{"ts": "2026-07-19T04:57:49.648Z", "updated": 8}	2026-07-18 23:57:49.650068-05
732	location-history-prune	{"deleted": 0}	2026-07-18 23:58:20.401514-05
733	business-hours	{"ts": "2026-07-19T05:03:19.183Z", "updated": 8}	2026-07-19 00:03:19.184239-05
734	business-hours	{"ts": "2026-07-19T05:08:19.169Z", "updated": 8}	2026-07-19 00:08:19.1702-05
735	business-hours	{"ts": "2026-07-19T05:13:19.170Z", "updated": 8}	2026-07-19 00:13:19.170684-05
736	business-hours	{"ts": "2026-07-19T05:18:19.284Z", "updated": 8}	2026-07-19 00:18:19.285669-05
737	location-history-prune	{"deleted": 0}	2026-07-19 00:20:41.379833-05
738	location-history-prune	{"deleted": 0}	2026-07-19 00:23:50.188658-05
739	location-history-prune	{"deleted": 0}	2026-07-19 00:26:12.737452-05
740	business-hours	{"ts": "2026-07-19T05:31:11.837Z", "updated": 8}	2026-07-19 00:31:11.840477-05
741	business-hours	{"ts": "2026-07-19T05:36:11.872Z", "updated": 8}	2026-07-19 00:36:11.875508-05
742	business-hours	{"ts": "2026-07-19T05:41:11.842Z", "updated": 8}	2026-07-19 00:41:11.842781-05
743	location-history-prune	{"deleted": 0}	2026-07-19 00:43:17.417678-05
744	location-history-prune	{"deleted": 0}	2026-07-19 00:47:11.877116-05
745	business-hours	{"ts": "2026-07-19T05:52:11.033Z", "updated": 8}	2026-07-19 00:52:11.035851-05
746	business-hours	{"ts": "2026-07-19T05:57:11.136Z", "updated": 8}	2026-07-19 00:57:11.137218-05
747	business-hours	{"ts": "2026-07-19T06:02:10.970Z", "updated": 8}	2026-07-19 01:02:10.971175-05
748	business-hours	{"ts": "2026-07-19T06:07:11.016Z", "updated": 8}	2026-07-19 01:07:11.017423-05
749	business-hours	{"ts": "2026-07-19T06:12:10.988Z", "updated": 8}	2026-07-19 01:12:10.991732-05
750	business-hours	{"ts": "2026-07-19T06:17:11.169Z", "updated": 8}	2026-07-19 01:17:11.170329-05
751	business-hours	{"ts": "2026-07-19T06:22:11.011Z", "updated": 8}	2026-07-19 01:22:11.012591-05
752	business-hours	{"ts": "2026-07-19T06:27:11.011Z", "updated": 8}	2026-07-19 01:27:11.012113-05
753	business-hours	{"ts": "2026-07-19T06:32:11.042Z", "updated": 8}	2026-07-19 01:32:11.042857-05
754	business-hours	{"ts": "2026-07-19T06:37:11.059Z", "updated": 8}	2026-07-19 01:37:11.06009-05
755	business-hours	{"ts": "2026-07-19T06:42:11.114Z", "updated": 8}	2026-07-19 01:42:11.115694-05
756	business-hours	{"ts": "2026-07-19T06:47:11.090Z", "updated": 8}	2026-07-19 01:47:11.091231-05
757	business-hours	{"ts": "2026-07-19T06:52:11.115Z", "updated": 8}	2026-07-19 01:52:11.115699-05
758	business-hours	{"ts": "2026-07-19T06:57:11.188Z", "updated": 8}	2026-07-19 01:57:11.189411-05
759	location-history-prune	{"deleted": 0}	2026-07-19 01:58:10.304176-05
760	business-hours	{"ts": "2026-07-19T07:03:09.461Z", "updated": 8}	2026-07-19 02:03:09.462698-05
761	business-hours	{"ts": "2026-07-19T07:08:09.436Z", "updated": 8}	2026-07-19 02:08:09.43979-05
762	business-hours	{"ts": "2026-07-19T07:13:09.455Z", "updated": 8}	2026-07-19 02:13:09.460125-05
763	business-hours	{"ts": "2026-07-19T07:18:09.524Z", "updated": 8}	2026-07-19 02:18:09.528037-05
764	business-hours	{"ts": "2026-07-19T07:23:09.483Z", "updated": 8}	2026-07-19 02:23:09.483816-05
765	business-hours	{"ts": "2026-07-19T07:28:09.668Z", "updated": 8}	2026-07-19 02:28:09.669242-05
766	business-hours	{"ts": "2026-07-19T07:33:09.699Z", "updated": 8}	2026-07-19 02:33:09.704506-05
767	business-hours	{"ts": "2026-07-19T07:38:09.563Z", "updated": 8}	2026-07-19 02:38:09.564653-05
768	business-hours	{"ts": "2026-07-19T07:43:09.581Z", "updated": 8}	2026-07-19 02:43:09.582726-05
769	business-hours	{"ts": "2026-07-19T07:48:09.563Z", "updated": 8}	2026-07-19 02:48:09.563692-05
770	business-hours	{"ts": "2026-07-19T07:53:09.611Z", "updated": 8}	2026-07-19 02:53:09.616038-05
771	business-hours	{"ts": "2026-07-19T07:58:09.591Z", "updated": 8}	2026-07-19 02:58:09.59205-05
772	business-hours	{"ts": "2026-07-19T08:03:09.640Z", "updated": 8}	2026-07-19 03:03:09.645051-05
773	business-hours	{"ts": "2026-07-19T08:08:09.651Z", "updated": 8}	2026-07-19 03:08:09.652219-05
774	business-hours	{"ts": "2026-07-19T08:13:09.684Z", "updated": 8}	2026-07-19 03:13:09.684986-05
775	business-hours	{"ts": "2026-07-19T08:18:09.767Z", "updated": 8}	2026-07-19 03:18:09.768541-05
776	business-hours	{"ts": "2026-07-19T08:23:09.725Z", "updated": 8}	2026-07-19 03:23:09.726367-05
777	business-hours	{"ts": "2026-07-19T08:28:09.747Z", "updated": 8}	2026-07-19 03:28:09.750467-05
778	business-hours	{"ts": "2026-07-19T08:33:09.762Z", "updated": 8}	2026-07-19 03:33:09.762825-05
779	business-hours	{"ts": "2026-07-19T08:38:09.780Z", "updated": 8}	2026-07-19 03:38:09.781419-05
780	business-hours	{"ts": "2026-07-19T08:43:09.822Z", "updated": 8}	2026-07-19 03:43:09.823631-05
781	business-hours	{"ts": "2026-07-19T08:48:09.827Z", "updated": 8}	2026-07-19 03:48:09.828031-05
782	business-hours	{"ts": "2026-07-19T08:53:09.887Z", "updated": 8}	2026-07-19 03:53:09.889635-05
783	business-hours	{"ts": "2026-07-19T08:58:09.912Z", "updated": 8}	2026-07-19 03:58:09.915174-05
784	business-hours	{"ts": "2026-07-19T09:03:09.890Z", "updated": 8}	2026-07-19 04:03:09.891791-05
785	business-hours	{"ts": "2026-07-19T09:08:09.983Z", "updated": 8}	2026-07-19 04:08:09.98453-05
786	business-hours	{"ts": "2026-07-19T09:13:09.903Z", "updated": 8}	2026-07-19 04:13:09.905159-05
787	business-hours	{"ts": "2026-07-19T09:18:10.042Z", "updated": 8}	2026-07-19 04:18:10.043641-05
788	business-hours	{"ts": "2026-07-19T09:23:09.945Z", "updated": 8}	2026-07-19 04:23:09.94591-05
789	business-hours	{"ts": "2026-07-19T09:28:09.994Z", "updated": 8}	2026-07-19 04:28:09.995317-05
790	business-hours	{"ts": "2026-07-19T09:33:09.988Z", "updated": 8}	2026-07-19 04:33:09.997691-05
791	business-hours	{"ts": "2026-07-19T09:38:10.003Z", "updated": 8}	2026-07-19 04:38:10.004254-05
792	business-hours	{"ts": "2026-07-19T09:43:09.994Z", "updated": 8}	2026-07-19 04:43:09.999006-05
793	business-hours	{"ts": "2026-07-19T09:48:09.979Z", "updated": 8}	2026-07-19 04:48:09.981537-05
794	business-hours	{"ts": "2026-07-19T09:53:09.990Z", "updated": 8}	2026-07-19 04:53:09.991348-05
795	business-hours	{"ts": "2026-07-19T09:58:09.989Z", "updated": 8}	2026-07-19 04:58:09.990066-05
796	business-hours	{"ts": "2026-07-19T10:03:10.002Z", "updated": 8}	2026-07-19 05:03:10.004331-05
797	business-hours	{"ts": "2026-07-19T10:08:10.209Z", "updated": 8}	2026-07-19 05:08:10.212128-05
798	business-hours	{"ts": "2026-07-19T10:13:10.118Z", "updated": 8}	2026-07-19 05:13:10.120496-05
799	business-hours	{"ts": "2026-07-19T10:18:10.142Z", "updated": 8}	2026-07-19 05:18:10.143963-05
800	business-hours	{"ts": "2026-07-19T10:23:10.084Z", "updated": 8}	2026-07-19 05:23:10.085552-05
801	business-hours	{"ts": "2026-07-19T10:28:10.167Z", "updated": 8}	2026-07-19 05:28:10.174405-05
802	business-hours	{"ts": "2026-07-19T10:33:10.208Z", "updated": 8}	2026-07-19 05:33:10.209133-05
803	business-hours	{"ts": "2026-07-19T10:38:10.188Z", "updated": 8}	2026-07-19 05:38:10.190623-05
804	business-hours	{"ts": "2026-07-19T10:43:10.184Z", "updated": 8}	2026-07-19 05:43:10.185148-05
805	business-hours	{"ts": "2026-07-19T10:48:10.195Z", "updated": 8}	2026-07-19 05:48:10.198983-05
806	business-hours	{"ts": "2026-07-19T10:53:10.208Z", "updated": 8}	2026-07-19 05:53:10.209203-05
807	business-hours	{"ts": "2026-07-19T10:58:10.196Z", "updated": 8}	2026-07-19 05:58:10.197483-05
808	business-hours	{"ts": "2026-07-19T11:03:10.251Z", "updated": 8}	2026-07-19 06:03:10.253415-05
809	business-hours	{"ts": "2026-07-19T11:08:10.293Z", "updated": 8}	2026-07-19 06:08:10.294859-05
810	business-hours	{"ts": "2026-07-19T11:13:10.232Z", "updated": 8}	2026-07-19 06:13:10.233229-05
811	business-hours	{"ts": "2026-07-19T11:18:10.341Z", "updated": 8}	2026-07-19 06:18:10.342383-05
812	business-hours	{"ts": "2026-07-19T11:23:10.287Z", "updated": 8}	2026-07-19 06:23:10.288181-05
813	business-hours	{"ts": "2026-07-19T11:28:10.388Z", "updated": 8}	2026-07-19 06:28:10.390112-05
814	business-hours	{"ts": "2026-07-19T11:33:10.266Z", "updated": 8}	2026-07-19 06:33:10.266757-05
815	business-hours	{"ts": "2026-07-19T11:38:10.308Z", "updated": 8}	2026-07-19 06:38:10.310591-05
816	business-hours	{"ts": "2026-07-19T11:43:10.333Z", "updated": 8}	2026-07-19 06:43:10.335217-05
817	business-hours	{"ts": "2026-07-19T11:48:10.353Z", "updated": 8}	2026-07-19 06:48:10.357403-05
818	business-hours	{"ts": "2026-07-19T11:53:10.377Z", "updated": 8}	2026-07-19 06:53:10.378602-05
819	business-hours	{"ts": "2026-07-19T11:58:10.351Z", "updated": 8}	2026-07-19 06:58:10.353537-05
820	business-hours	{"ts": "2026-07-19T12:03:10.399Z", "updated": 8}	2026-07-19 07:03:10.408639-05
821	business-hours	{"ts": "2026-07-19T12:08:10.368Z", "updated": 8}	2026-07-19 07:08:10.369274-05
822	business-hours	{"ts": "2026-07-19T12:13:10.391Z", "updated": 8}	2026-07-19 07:13:10.391927-05
823	business-hours	{"ts": "2026-07-19T12:18:10.466Z", "updated": 8}	2026-07-19 07:18:10.467055-05
824	business-hours	{"ts": "2026-07-19T12:23:10.442Z", "updated": 8}	2026-07-19 07:23:10.446797-05
825	business-hours	{"ts": "2026-07-19T12:28:10.427Z", "updated": 8}	2026-07-19 07:28:10.428947-05
826	business-hours	{"ts": "2026-07-19T12:33:10.452Z", "updated": 8}	2026-07-19 07:33:10.453095-05
827	business-hours	{"ts": "2026-07-19T12:38:10.450Z", "updated": 8}	2026-07-19 07:38:10.451312-05
828	business-hours	{"ts": "2026-07-19T12:43:10.452Z", "updated": 8}	2026-07-19 07:43:10.453171-05
829	business-hours	{"ts": "2026-07-19T12:48:10.500Z", "updated": 8}	2026-07-19 07:48:10.502779-05
830	business-hours	{"ts": "2026-07-19T12:53:10.488Z", "updated": 8}	2026-07-19 07:53:10.48951-05
831	business-hours	{"ts": "2026-07-19T12:58:10.532Z", "updated": 8}	2026-07-19 07:58:10.533645-05
832	business-hours	{"ts": "2026-07-19T13:03:10.527Z", "updated": 8}	2026-07-19 08:03:10.527902-05
833	business-hours	{"ts": "2026-07-19T13:08:10.554Z", "updated": 8}	2026-07-19 08:08:10.554931-05
834	business-hours	{"ts": "2026-07-19T13:13:10.585Z", "updated": 8}	2026-07-19 08:13:10.587302-05
835	business-hours	{"ts": "2026-07-19T13:18:10.698Z", "updated": 8}	2026-07-19 08:18:10.705183-05
836	business-hours	{"ts": "2026-07-19T13:23:10.575Z", "updated": 8}	2026-07-19 08:23:10.578075-05
837	business-hours	{"ts": "2026-07-19T13:28:10.650Z", "updated": 8}	2026-07-19 08:28:10.654238-05
838	business-hours	{"ts": "2026-07-19T13:33:10.631Z", "updated": 8}	2026-07-19 08:33:10.631848-05
839	business-hours	{"ts": "2026-07-19T13:38:10.628Z", "updated": 8}	2026-07-19 08:38:10.629354-05
840	business-hours	{"ts": "2026-07-19T13:43:10.644Z", "updated": 8}	2026-07-19 08:43:10.646073-05
841	business-hours	{"ts": "2026-07-19T13:48:10.629Z", "updated": 8}	2026-07-19 08:48:10.630807-05
842	business-hours	{"ts": "2026-07-19T13:53:10.671Z", "updated": 8}	2026-07-19 08:53:10.674436-05
843	business-hours	{"ts": "2026-07-19T13:58:10.656Z", "updated": 8}	2026-07-19 08:58:10.656608-05
844	business-hours	{"ts": "2026-07-19T14:03:10.677Z", "updated": 8}	2026-07-19 09:03:10.678135-05
845	business-hours	{"ts": "2026-07-19T14:08:10.704Z", "updated": 8}	2026-07-19 09:08:10.70547-05
846	business-hours	{"ts": "2026-07-19T14:13:10.719Z", "updated": 8}	2026-07-19 09:13:10.723732-05
847	business-hours	{"ts": "2026-07-19T14:18:11.176Z", "updated": 8}	2026-07-19 09:18:11.177823-05
848	location-history-prune	{"deleted": 0}	2026-07-19 09:19:30.856748-05
849	location-history-prune	{"deleted": 0}	2026-07-19 09:22:36.752865-05
850	business-hours	{"ts": "2026-07-19T14:27:35.918Z", "updated": 8}	2026-07-19 09:27:35.922547-05
851	business-hours	{"ts": "2026-07-19T14:32:35.915Z", "updated": 8}	2026-07-19 09:32:35.91614-05
852	location-history-prune	{"deleted": 0}	2026-07-19 09:34:04.149399-05
853	business-hours	{"ts": "2026-07-19T14:39:02.334Z", "updated": 8}	2026-07-19 09:39:02.466566-05
854	business-hours	{"ts": "2026-07-19T14:44:02.400Z", "updated": 8}	2026-07-19 09:44:02.401272-05
855	business-hours	{"ts": "2026-07-19T14:49:02.395Z", "updated": 8}	2026-07-19 09:49:02.396431-05
856	business-hours	{"ts": "2026-07-19T14:54:02.298Z", "updated": 8}	2026-07-19 09:54:02.307036-05
857	location-history-prune	{"deleted": 0}	2026-07-19 09:54:23.131354-05
858	business-hours	{"ts": "2026-07-19T14:59:21.804Z", "updated": 8}	2026-07-19 09:59:21.805446-05
859	business-hours	{"ts": "2026-07-19T15:04:21.799Z", "updated": 8}	2026-07-19 10:04:21.800621-05
860	business-hours	{"ts": "2026-07-19T15:09:21.829Z", "updated": 8}	2026-07-19 10:09:21.830216-05
861	business-hours	{"ts": "2026-07-19T15:14:21.868Z", "updated": 8}	2026-07-19 10:14:21.880539-05
862	business-hours	{"ts": "2026-07-19T15:19:21.815Z", "updated": 8}	2026-07-19 10:19:21.816439-05
863	location-history-prune	{"deleted": 0}	2026-07-19 10:23:06.334701-05
1246	location-history-prune	{"deleted": 0}	2026-07-20 16:59:24.204818-05
864	business-hours	{"ts": "2026-07-19T15:28:05.034Z", "updated": 8}	2026-07-19 10:28:05.034775-05
865	business-hours	{"ts": "2026-07-19T15:33:05.066Z", "updated": 8}	2026-07-19 10:33:05.06898-05
866	business-hours	{"ts": "2026-07-19T15:38:05.030Z", "updated": 8}	2026-07-19 10:38:05.031093-05
867	business-hours	{"ts": "2026-07-19T15:43:05.073Z", "updated": 8}	2026-07-19 10:43:05.075204-05
868	business-hours	{"ts": "2026-07-19T15:48:05.035Z", "updated": 8}	2026-07-19 10:48:05.036406-05
869	business-hours	{"ts": "2026-07-19T15:53:05.085Z", "updated": 8}	2026-07-19 10:53:05.087045-05
870	business-hours	{"ts": "2026-07-19T15:58:05.092Z", "updated": 8}	2026-07-19 10:58:05.092918-05
871	business-hours	{"ts": "2026-07-19T16:03:05.309Z", "updated": 8}	2026-07-19 11:03:05.311458-05
872	business-hours	{"ts": "2026-07-19T16:08:05.210Z", "updated": 8}	2026-07-19 11:08:05.21072-05
873	business-hours	{"ts": "2026-07-19T16:13:05.276Z", "updated": 8}	2026-07-19 11:13:05.277421-05
874	business-hours	{"ts": "2026-07-19T16:18:05.522Z", "updated": 8}	2026-07-19 11:18:05.52688-05
875	location-history-prune	{"deleted": 0}	2026-07-19 11:19:26.003118-05
876	business-hours	{"ts": "2026-07-19T16:24:24.684Z", "updated": 8}	2026-07-19 11:24:24.693836-05
877	business-hours	{"ts": "2026-07-19T16:29:24.532Z", "updated": 8}	2026-07-19 11:29:24.533346-05
878	business-hours	{"ts": "2026-07-19T16:34:24.543Z", "updated": 8}	2026-07-19 11:34:24.543648-05
879	business-hours	{"ts": "2026-07-19T16:39:24.527Z", "updated": 8}	2026-07-19 11:39:24.528353-05
880	business-hours	{"ts": "2026-07-19T16:44:24.549Z", "updated": 8}	2026-07-19 11:44:24.559218-05
881	business-hours	{"ts": "2026-07-19T16:49:24.578Z", "updated": 8}	2026-07-19 11:49:24.579366-05
882	business-hours	{"ts": "2026-07-19T16:54:24.530Z", "updated": 8}	2026-07-19 11:54:24.531014-05
883	business-hours	{"ts": "2026-07-19T16:59:24.567Z", "updated": 8}	2026-07-19 11:59:24.56849-05
884	business-hours	{"ts": "2026-07-19T17:04:24.608Z", "updated": 8}	2026-07-19 12:04:24.613502-05
885	location-history-prune	{"deleted": 0}	2026-07-19 12:05:00.188837-05
886	business-hours	{"ts": "2026-07-19T17:09:58.869Z", "updated": 8}	2026-07-19 12:09:58.870511-05
887	location-history-prune	{"deleted": 0}	2026-07-19 12:10:55.128624-05
888	location-history-prune	{"deleted": 0}	2026-07-19 12:15:26.201953-05
889	business-hours	{"ts": "2026-07-19T17:20:24.830Z", "updated": 8}	2026-07-19 12:20:24.831869-05
890	business-hours	{"ts": "2026-07-19T17:25:24.918Z", "updated": 8}	2026-07-19 12:25:24.91927-05
891	business-hours	{"ts": "2026-07-19T17:30:24.688Z", "updated": 8}	2026-07-19 12:30:24.689012-05
892	business-hours	{"ts": "2026-07-19T17:35:24.683Z", "updated": 8}	2026-07-19 12:35:24.684545-05
893	business-hours	{"ts": "2026-07-19T17:40:24.694Z", "updated": 8}	2026-07-19 12:40:24.696695-05
894	location-history-prune	{"deleted": 0}	2026-07-19 12:43:20.442156-05
895	business-hours	{"ts": "2026-07-19T17:48:19.495Z", "updated": 8}	2026-07-19 12:48:19.496927-05
896	business-hours	{"ts": "2026-07-19T17:53:19.403Z", "updated": 8}	2026-07-19 12:53:19.404084-05
897	business-hours	{"ts": "2026-07-19T17:58:19.423Z", "updated": 8}	2026-07-19 12:58:19.426128-05
898	business-hours	{"ts": "2026-07-19T18:03:19.503Z", "updated": 8}	2026-07-19 13:03:19.504696-05
899	business-hours	{"ts": "2026-07-19T18:08:19.470Z", "updated": 8}	2026-07-19 13:08:19.471816-05
900	business-hours	{"ts": "2026-07-19T18:13:19.448Z", "updated": 8}	2026-07-19 13:13:19.453048-05
901	business-hours	{"ts": "2026-07-19T18:18:19.491Z", "updated": 8}	2026-07-19 13:18:19.493078-05
902	location-history-prune	{"deleted": 0}	2026-07-19 13:21:43.364687-05
903	business-hours	{"ts": "2026-07-19T18:26:42.114Z", "updated": 8}	2026-07-19 13:26:42.116356-05
904	location-history-prune	{"deleted": 0}	2026-07-19 13:31:38.154503-05
905	business-hours	{"ts": "2026-07-19T18:36:36.654Z", "updated": 8}	2026-07-19 13:36:36.655217-05
906	business-hours	{"ts": "2026-07-19T18:41:36.620Z", "updated": 8}	2026-07-19 13:41:36.622459-05
907	business-hours	{"ts": "2026-07-19T18:46:36.624Z", "updated": 8}	2026-07-19 13:46:36.625169-05
908	business-hours	{"ts": "2026-07-19T18:51:36.657Z", "updated": 8}	2026-07-19 13:51:36.658164-05
909	business-hours	{"ts": "2026-07-19T18:56:36.655Z", "updated": 8}	2026-07-19 13:56:36.65644-05
910	business-hours	{"ts": "2026-07-19T19:01:36.669Z", "updated": 8}	2026-07-19 14:01:36.679642-05
911	business-hours	{"ts": "2026-07-19T19:06:36.609Z", "updated": 8}	2026-07-19 14:06:36.611167-05
912	business-hours	{"ts": "2026-07-19T19:11:36.614Z", "updated": 8}	2026-07-19 14:11:36.615218-05
913	business-hours	{"ts": "2026-07-19T19:16:36.650Z", "updated": 8}	2026-07-19 14:16:36.651735-05
914	business-hours	{"ts": "2026-07-19T19:21:36.695Z", "updated": 8}	2026-07-19 14:21:36.696106-05
915	business-hours	{"ts": "2026-07-19T19:26:36.732Z", "updated": 8}	2026-07-19 14:26:36.739259-05
916	business-hours	{"ts": "2026-07-19T19:31:36.678Z", "updated": 8}	2026-07-19 14:31:36.679574-05
917	business-hours	{"ts": "2026-07-19T19:36:36.693Z", "updated": 8}	2026-07-19 14:36:36.694719-05
918	business-hours	{"ts": "2026-07-19T19:41:36.772Z", "updated": 8}	2026-07-19 14:41:36.773385-05
919	business-hours	{"ts": "2026-07-19T19:46:36.759Z", "updated": 8}	2026-07-19 14:46:36.76078-05
920	business-hours	{"ts": "2026-07-19T19:51:36.849Z", "updated": 8}	2026-07-19 14:51:36.850496-05
921	business-hours	{"ts": "2026-07-19T19:56:36.828Z", "updated": 8}	2026-07-19 14:56:36.829012-05
922	business-hours	{"ts": "2026-07-19T20:01:37.072Z", "updated": 8}	2026-07-19 15:01:37.100602-05
923	business-hours	{"ts": "2026-07-19T20:06:36.864Z", "updated": 8}	2026-07-19 15:06:36.865086-05
924	business-hours	{"ts": "2026-07-19T20:11:36.882Z", "updated": 8}	2026-07-19 15:11:36.883573-05
925	business-hours	{"ts": "2026-07-19T20:16:36.901Z", "updated": 8}	2026-07-19 15:16:36.901898-05
926	business-hours	{"ts": "2026-07-19T20:21:36.920Z", "updated": 8}	2026-07-19 15:21:36.921059-05
927	business-hours	{"ts": "2026-07-19T20:26:36.946Z", "updated": 8}	2026-07-19 15:26:36.947427-05
928	business-hours	{"ts": "2026-07-19T20:31:37.013Z", "updated": 8}	2026-07-19 15:31:37.014372-05
929	business-hours	{"ts": "2026-07-19T20:36:37.039Z", "updated": 8}	2026-07-19 15:36:37.04538-05
930	business-hours	{"ts": "2026-07-19T20:41:36.979Z", "updated": 8}	2026-07-19 15:41:36.980486-05
931	business-hours	{"ts": "2026-07-19T20:46:37.030Z", "updated": 8}	2026-07-19 15:46:37.035258-05
932	business-hours	{"ts": "2026-07-19T20:51:37.013Z", "updated": 8}	2026-07-19 15:51:37.013981-05
933	business-hours	{"ts": "2026-07-19T20:56:37.028Z", "updated": 8}	2026-07-19 15:56:37.028693-05
934	business-hours	{"ts": "2026-07-19T21:01:37.068Z", "updated": 8}	2026-07-19 16:01:37.069131-05
935	business-hours	{"ts": "2026-07-19T21:06:37.097Z", "updated": 8}	2026-07-19 16:06:37.098417-05
936	business-hours	{"ts": "2026-07-19T21:11:37.114Z", "updated": 8}	2026-07-19 16:11:37.115726-05
937	business-hours	{"ts": "2026-07-19T21:16:37.130Z", "updated": 8}	2026-07-19 16:16:37.13183-05
938	business-hours	{"ts": "2026-07-19T21:21:37.136Z", "updated": 8}	2026-07-19 16:21:37.13746-05
939	business-hours	{"ts": "2026-07-19T21:26:37.152Z", "updated": 8}	2026-07-19 16:26:37.153839-05
940	business-hours	{"ts": "2026-07-19T21:31:37.176Z", "updated": 8}	2026-07-19 16:31:37.177654-05
941	business-hours	{"ts": "2026-07-19T21:36:37.192Z", "updated": 8}	2026-07-19 16:36:37.193527-05
942	business-hours	{"ts": "2026-07-19T21:41:37.201Z", "updated": 8}	2026-07-19 16:41:37.202195-05
943	business-hours	{"ts": "2026-07-19T21:46:37.186Z", "updated": 8}	2026-07-19 16:46:37.188211-05
944	business-hours	{"ts": "2026-07-19T21:51:37.240Z", "updated": 8}	2026-07-19 16:51:37.240994-05
945	business-hours	{"ts": "2026-07-19T21:56:37.248Z", "updated": 8}	2026-07-19 16:56:37.249067-05
946	business-hours	{"ts": "2026-07-19T22:01:37.272Z", "updated": 8}	2026-07-19 17:01:37.273825-05
947	business-hours	{"ts": "2026-07-19T22:06:37.283Z", "updated": 8}	2026-07-19 17:06:37.283949-05
948	business-hours	{"ts": "2026-07-19T22:11:37.300Z", "updated": 8}	2026-07-19 17:11:37.300853-05
949	business-hours	{"ts": "2026-07-19T22:16:37.289Z", "updated": 8}	2026-07-19 17:16:37.289818-05
950	business-hours	{"ts": "2026-07-19T22:21:37.315Z", "updated": 8}	2026-07-19 17:21:37.316888-05
951	business-hours	{"ts": "2026-07-19T22:26:37.334Z", "updated": 8}	2026-07-19 17:26:37.336136-05
952	business-hours	{"ts": "2026-07-19T22:31:37.355Z", "updated": 8}	2026-07-19 17:31:37.359467-05
953	location-history-prune	{"deleted": 0}	2026-07-19 17:32:23.411383-05
954	business-hours	{"ts": "2026-07-19T22:37:22.249Z", "updated": 8}	2026-07-19 17:37:22.249841-05
955	location-history-prune	{"deleted": 0}	2026-07-19 17:41:32.57138-05
956	business-hours	{"ts": "2026-07-19T22:46:31.450Z", "updated": 8}	2026-07-19 17:46:31.453029-05
957	business-hours	{"ts": "2026-07-19T22:51:31.386Z", "updated": 8}	2026-07-19 17:51:31.387344-05
958	business-hours	{"ts": "2026-07-19T22:56:31.350Z", "updated": 8}	2026-07-19 17:56:31.351205-05
959	business-hours	{"ts": "2026-07-19T23:01:31.401Z", "updated": 8}	2026-07-19 18:01:31.419421-05
960	location-history-prune	{"deleted": 0}	2026-07-19 18:03:11.803269-05
961	business-hours	{"ts": "2026-07-19T23:08:10.496Z", "updated": 8}	2026-07-19 18:08:10.497679-05
962	business-hours	{"ts": "2026-07-19T23:13:10.509Z", "updated": 8}	2026-07-19 18:13:10.509736-05
963	business-hours	{"ts": "2026-07-19T23:18:10.483Z", "updated": 8}	2026-07-19 18:18:10.484043-05
964	business-hours	{"ts": "2026-07-19T23:23:10.481Z", "updated": 8}	2026-07-19 18:23:10.482597-05
965	business-hours	{"ts": "2026-07-19T23:28:10.538Z", "updated": 8}	2026-07-19 18:28:10.53958-05
966	business-hours	{"ts": "2026-07-19T23:33:10.523Z", "updated": 8}	2026-07-19 18:33:10.537164-05
967	business-hours	{"ts": "2026-07-19T23:38:10.559Z", "updated": 8}	2026-07-19 18:38:10.560738-05
968	business-hours	{"ts": "2026-07-19T23:43:10.578Z", "updated": 8}	2026-07-19 18:43:10.579137-05
969	business-hours	{"ts": "2026-07-19T23:48:10.688Z", "updated": 8}	2026-07-19 18:48:10.689769-05
970	location-history-prune	{"deleted": 0}	2026-07-19 18:48:43.393536-05
971	business-hours	{"ts": "2026-07-19T23:53:42.260Z", "updated": 8}	2026-07-19 18:53:42.261012-05
972	business-hours	{"ts": "2026-07-19T23:58:42.279Z", "updated": 8}	2026-07-19 18:58:42.280396-05
973	business-hours	{"ts": "2026-07-20T00:03:42.268Z", "updated": 8}	2026-07-19 19:03:42.269472-05
974	business-hours	{"ts": "2026-07-20T00:08:42.239Z", "updated": 8}	2026-07-19 19:08:42.23989-05
975	business-hours	{"ts": "2026-07-20T00:13:42.231Z", "updated": 8}	2026-07-19 19:13:42.231983-05
976	business-hours	{"ts": "2026-07-20T00:18:42.315Z", "updated": 8}	2026-07-19 19:18:42.315907-05
977	business-hours	{"ts": "2026-07-20T00:23:42.251Z", "updated": 8}	2026-07-19 19:23:42.252164-05
978	business-hours	{"ts": "2026-07-20T00:28:42.268Z", "updated": 8}	2026-07-19 19:28:42.269692-05
979	business-hours	{"ts": "2026-07-20T00:33:42.280Z", "updated": 8}	2026-07-19 19:33:42.28146-05
980	business-hours	{"ts": "2026-07-20T00:38:42.321Z", "updated": 8}	2026-07-19 19:38:42.32458-05
981	business-hours	{"ts": "2026-07-20T00:43:42.321Z", "updated": 8}	2026-07-19 19:43:42.322474-05
982	business-hours	{"ts": "2026-07-20T00:48:42.313Z", "updated": 8}	2026-07-19 19:48:42.314096-05
983	business-hours	{"ts": "2026-07-20T00:53:42.342Z", "updated": 8}	2026-07-19 19:53:42.343666-05
984	business-hours	{"ts": "2026-07-20T00:58:42.355Z", "updated": 8}	2026-07-19 19:58:42.355987-05
985	business-hours	{"ts": "2026-07-20T01:03:42.382Z", "updated": 8}	2026-07-19 20:03:42.383683-05
986	business-hours	{"ts": "2026-07-20T01:08:42.428Z", "updated": 8}	2026-07-19 20:08:42.432522-05
987	business-hours	{"ts": "2026-07-20T01:13:42.433Z", "updated": 8}	2026-07-19 20:13:42.436162-05
988	location-history-prune	{"deleted": 0}	2026-07-19 20:15:20.003148-05
989	business-hours	{"ts": "2026-07-20T01:20:18.782Z", "updated": 8}	2026-07-19 20:20:18.78276-05
990	business-hours	{"ts": "2026-07-20T01:25:18.707Z", "updated": 8}	2026-07-19 20:25:18.710174-05
991	business-hours	{"ts": "2026-07-20T01:30:18.783Z", "updated": 8}	2026-07-19 20:30:18.784254-05
992	business-hours	{"ts": "2026-07-20T01:35:18.811Z", "updated": 8}	2026-07-19 20:35:18.812208-05
993	location-history-prune	{"deleted": 0}	2026-07-19 20:37:22.823682-05
994	business-hours	{"ts": "2026-07-20T01:42:22.111Z", "updated": 8}	2026-07-19 20:42:22.111675-05
995	location-history-prune	{"deleted": 0}	2026-07-19 20:43:09.410949-05
996	business-hours	{"ts": "2026-07-20T01:48:07.766Z", "updated": 8}	2026-07-19 20:48:07.771166-05
997	business-hours	{"ts": "2026-07-20T01:53:07.752Z", "updated": 8}	2026-07-19 20:53:07.753162-05
998	business-hours	{"ts": "2026-07-20T01:58:07.764Z", "updated": 8}	2026-07-19 20:58:07.765041-05
999	business-hours	{"ts": "2026-07-20T02:03:07.756Z", "updated": 8}	2026-07-19 21:03:07.75703-05
1000	business-hours	{"ts": "2026-07-20T02:08:07.783Z", "updated": 8}	2026-07-19 21:08:07.78551-05
1001	business-hours	{"ts": "2026-07-20T02:13:07.779Z", "updated": 8}	2026-07-19 21:13:07.780769-05
1002	business-hours	{"ts": "2026-07-20T02:18:07.858Z", "updated": 8}	2026-07-19 21:18:07.859543-05
1003	business-hours	{"ts": "2026-07-20T02:23:07.770Z", "updated": 8}	2026-07-19 21:23:07.771463-05
1004	business-hours	{"ts": "2026-07-20T02:28:07.787Z", "updated": 8}	2026-07-19 21:28:07.787559-05
1005	business-hours	{"ts": "2026-07-20T02:33:07.792Z", "updated": 8}	2026-07-19 21:33:07.793634-05
1006	business-hours	{"ts": "2026-07-20T02:38:07.779Z", "updated": 8}	2026-07-19 21:38:07.781848-05
1007	business-hours	{"ts": "2026-07-20T02:43:07.780Z", "updated": 8}	2026-07-19 21:43:07.780972-05
1008	business-hours	{"ts": "2026-07-20T02:48:07.790Z", "updated": 8}	2026-07-19 21:48:07.791322-05
1009	business-hours	{"ts": "2026-07-20T02:53:07.782Z", "updated": 8}	2026-07-19 21:53:07.783643-05
1010	business-hours	{"ts": "2026-07-20T02:58:07.948Z", "updated": 8}	2026-07-19 21:58:07.951825-05
1011	business-hours	{"ts": "2026-07-20T03:03:07.789Z", "updated": 8}	2026-07-19 22:03:07.790056-05
1012	business-hours	{"ts": "2026-07-20T03:08:07.861Z", "updated": 8}	2026-07-19 22:08:07.865587-05
1013	business-hours	{"ts": "2026-07-20T03:13:07.870Z", "updated": 8}	2026-07-19 22:13:07.87292-05
1014	business-hours	{"ts": "2026-07-20T03:18:07.822Z", "updated": 8}	2026-07-19 22:18:07.823051-05
1015	business-hours	{"ts": "2026-07-20T03:23:07.783Z", "updated": 8}	2026-07-19 22:23:07.783837-05
1016	business-hours	{"ts": "2026-07-20T03:28:07.859Z", "updated": 8}	2026-07-19 22:28:07.861977-05
1017	business-hours	{"ts": "2026-07-20T03:33:07.807Z", "updated": 8}	2026-07-19 22:33:07.808405-05
1018	business-hours	{"ts": "2026-07-20T03:38:07.802Z", "updated": 8}	2026-07-19 22:38:07.805051-05
1019	business-hours	{"ts": "2026-07-20T03:43:07.834Z", "updated": 8}	2026-07-19 22:43:07.845102-05
1020	business-hours	{"ts": "2026-07-20T03:48:07.788Z", "updated": 8}	2026-07-19 22:48:07.788751-05
1021	business-hours	{"ts": "2026-07-20T03:53:07.792Z", "updated": 8}	2026-07-19 22:53:07.793252-05
1022	business-hours	{"ts": "2026-07-20T03:58:07.888Z", "updated": 8}	2026-07-19 22:58:07.889379-05
1023	location-history-prune	{"deleted": 0}	2026-07-19 22:58:56.895893-05
1024	location-history-prune	{"deleted": 0}	2026-07-19 23:03:49.670416-05
1025	location-history-prune	{"deleted": 0}	2026-07-19 23:08:11.320909-05
1026	business-hours	{"ts": "2026-07-20T04:13:10.484Z", "updated": 8}	2026-07-19 23:13:10.485188-05
1027	business-hours	{"ts": "2026-07-20T04:18:10.565Z", "updated": 8}	2026-07-19 23:18:10.566598-05
1028	business-hours	{"ts": "2026-07-20T04:23:10.486Z", "updated": 8}	2026-07-19 23:23:10.487719-05
1029	business-hours	{"ts": "2026-07-20T04:28:10.505Z", "updated": 8}	2026-07-19 23:28:10.506963-05
1030	business-hours	{"ts": "2026-07-20T04:33:10.497Z", "updated": 8}	2026-07-19 23:33:10.499133-05
1031	business-hours	{"ts": "2026-07-20T04:38:10.513Z", "updated": 8}	2026-07-19 23:38:10.518527-05
1032	business-hours	{"ts": "2026-07-20T04:43:10.569Z", "updated": 8}	2026-07-19 23:43:10.573037-05
1033	business-hours	{"ts": "2026-07-20T04:48:10.570Z", "updated": 8}	2026-07-19 23:48:10.571627-05
1034	business-hours	{"ts": "2026-07-20T04:53:10.617Z", "updated": 8}	2026-07-19 23:53:10.61942-05
1035	location-history-prune	{"deleted": 0}	2026-07-19 23:53:42.585656-05
1036	business-hours	{"ts": "2026-07-20T04:58:41.679Z", "updated": 8}	2026-07-19 23:58:41.679735-05
1037	business-hours	{"ts": "2026-07-20T05:03:41.676Z", "updated": 8}	2026-07-20 00:03:41.678506-05
1038	business-hours	{"ts": "2026-07-20T05:08:41.948Z", "updated": 8}	2026-07-20 00:08:41.957636-05
1039	location-history-prune	{"deleted": 0}	2026-07-20 00:11:37.573728-05
1040	business-hours	{"ts": "2026-07-20T05:16:36.791Z", "updated": 8}	2026-07-20 00:16:36.794231-05
1041	business-hours	{"ts": "2026-07-20T05:21:36.881Z", "updated": 8}	2026-07-20 00:21:36.882793-05
1042	business-hours	{"ts": "2026-07-20T05:26:36.797Z", "updated": 8}	2026-07-20 00:26:36.798495-05
1043	business-hours	{"ts": "2026-07-20T05:31:36.875Z", "updated": 8}	2026-07-20 00:31:36.87672-05
1044	business-hours	{"ts": "2026-07-20T05:36:36.984Z", "updated": 8}	2026-07-20 00:36:36.985793-05
1045	business-hours	{"ts": "2026-07-20T05:41:36.873Z", "updated": 8}	2026-07-20 00:41:36.873978-05
1046	business-hours	{"ts": "2026-07-20T05:46:36.892Z", "updated": 8}	2026-07-20 00:46:36.892891-05
1047	business-hours	{"ts": "2026-07-20T05:51:36.928Z", "updated": 8}	2026-07-20 00:51:36.929508-05
1048	business-hours	{"ts": "2026-07-20T05:56:36.963Z", "updated": 8}	2026-07-20 00:56:36.963974-05
1049	business-hours	{"ts": "2026-07-20T06:01:36.986Z", "updated": 8}	2026-07-20 01:01:36.989124-05
1050	business-hours	{"ts": "2026-07-20T06:06:37.100Z", "updated": 8}	2026-07-20 01:06:37.105381-05
1051	business-hours	{"ts": "2026-07-20T06:11:37.095Z", "updated": 8}	2026-07-20 01:11:37.096766-05
1052	business-hours	{"ts": "2026-07-20T06:16:37.054Z", "updated": 8}	2026-07-20 01:16:37.055429-05
1053	business-hours	{"ts": "2026-07-20T06:21:37.083Z", "updated": 8}	2026-07-20 01:21:37.08372-05
1054	business-hours	{"ts": "2026-07-20T06:26:37.168Z", "updated": 8}	2026-07-20 01:26:37.168988-05
1055	business-hours	{"ts": "2026-07-20T06:31:37.168Z", "updated": 8}	2026-07-20 01:31:37.16972-05
1056	business-hours	{"ts": "2026-07-20T06:36:37.391Z", "updated": 8}	2026-07-20 01:36:37.392359-05
1057	business-hours	{"ts": "2026-07-20T06:41:37.227Z", "updated": 8}	2026-07-20 01:41:37.229173-05
1058	business-hours	{"ts": "2026-07-20T06:46:37.287Z", "updated": 8}	2026-07-20 01:46:37.289688-05
1059	business-hours	{"ts": "2026-07-20T06:51:37.405Z", "updated": 8}	2026-07-20 01:51:37.407345-05
1060	business-hours	{"ts": "2026-07-20T06:56:37.255Z", "updated": 8}	2026-07-20 01:56:37.255822-05
1061	business-hours	{"ts": "2026-07-20T07:01:37.361Z", "updated": 8}	2026-07-20 02:01:37.366141-05
1062	business-hours	{"ts": "2026-07-20T07:06:37.362Z", "updated": 8}	2026-07-20 02:06:37.363459-05
1063	business-hours	{"ts": "2026-07-20T07:11:37.333Z", "updated": 8}	2026-07-20 02:11:37.335859-05
1248	location-history-prune	{"deleted": 0}	2026-07-20 17:08:27.372029-05
1064	business-hours	{"ts": "2026-07-20T07:16:37.378Z", "updated": 8}	2026-07-20 02:16:37.379499-05
1065	business-hours	{"ts": "2026-07-20T07:21:37.369Z", "updated": 8}	2026-07-20 02:21:37.370533-05
1066	business-hours	{"ts": "2026-07-20T07:26:37.367Z", "updated": 8}	2026-07-20 02:26:37.368222-05
1067	business-hours	{"ts": "2026-07-20T07:31:37.396Z", "updated": 8}	2026-07-20 02:31:37.3968-05
1068	business-hours	{"ts": "2026-07-20T07:36:37.429Z", "updated": 8}	2026-07-20 02:36:37.433832-05
1069	business-hours	{"ts": "2026-07-20T07:41:37.609Z", "updated": 8}	2026-07-20 02:41:37.610408-05
1070	business-hours	{"ts": "2026-07-20T07:46:37.538Z", "updated": 8}	2026-07-20 02:46:37.54137-05
1071	business-hours	{"ts": "2026-07-20T07:51:37.556Z", "updated": 8}	2026-07-20 02:51:37.557542-05
1072	business-hours	{"ts": "2026-07-20T07:56:37.561Z", "updated": 8}	2026-07-20 02:56:37.562874-05
1073	business-hours	{"ts": "2026-07-20T08:01:37.590Z", "updated": 8}	2026-07-20 03:01:37.590985-05
1074	business-hours	{"ts": "2026-07-20T08:06:37.609Z", "updated": 8}	2026-07-20 03:06:37.610168-05
1075	business-hours	{"ts": "2026-07-20T08:11:37.642Z", "updated": 8}	2026-07-20 03:11:37.64348-05
1076	business-hours	{"ts": "2026-07-20T08:16:37.777Z", "updated": 8}	2026-07-20 03:16:37.778009-05
1077	business-hours	{"ts": "2026-07-20T08:21:37.675Z", "updated": 8}	2026-07-20 03:21:37.676492-05
1078	business-hours	{"ts": "2026-07-20T08:26:37.750Z", "updated": 8}	2026-07-20 03:26:37.754357-05
1079	business-hours	{"ts": "2026-07-20T08:31:37.727Z", "updated": 8}	2026-07-20 03:31:37.72783-05
1080	business-hours	{"ts": "2026-07-20T08:36:37.803Z", "updated": 8}	2026-07-20 03:36:37.806879-05
1081	business-hours	{"ts": "2026-07-20T08:41:37.790Z", "updated": 8}	2026-07-20 03:41:37.791169-05
1082	business-hours	{"ts": "2026-07-20T08:46:37.750Z", "updated": 8}	2026-07-20 03:46:37.751187-05
1083	business-hours	{"ts": "2026-07-20T08:51:37.815Z", "updated": 8}	2026-07-20 03:51:37.819568-05
1084	business-hours	{"ts": "2026-07-20T08:56:37.767Z", "updated": 8}	2026-07-20 03:56:37.768018-05
1085	business-hours	{"ts": "2026-07-20T09:01:37.802Z", "updated": 8}	2026-07-20 04:01:37.803622-05
1086	business-hours	{"ts": "2026-07-20T09:06:37.813Z", "updated": 8}	2026-07-20 04:06:37.81437-05
1087	business-hours	{"ts": "2026-07-20T09:11:37.821Z", "updated": 8}	2026-07-20 04:11:37.823305-05
1088	business-hours	{"ts": "2026-07-20T09:16:37.868Z", "updated": 8}	2026-07-20 04:16:37.869205-05
1089	business-hours	{"ts": "2026-07-20T09:21:37.876Z", "updated": 8}	2026-07-20 04:21:37.877628-05
1090	business-hours	{"ts": "2026-07-20T09:26:37.932Z", "updated": 8}	2026-07-20 04:26:37.933686-05
1091	business-hours	{"ts": "2026-07-20T09:31:37.922Z", "updated": 8}	2026-07-20 04:31:37.923798-05
1092	business-hours	{"ts": "2026-07-20T09:36:38.056Z", "updated": 8}	2026-07-20 04:36:38.057666-05
1093	business-hours	{"ts": "2026-07-20T09:41:37.945Z", "updated": 8}	2026-07-20 04:41:37.946185-05
1094	business-hours	{"ts": "2026-07-20T09:46:37.976Z", "updated": 8}	2026-07-20 04:46:37.978061-05
1095	business-hours	{"ts": "2026-07-20T09:51:37.983Z", "updated": 8}	2026-07-20 04:51:37.984166-05
1096	business-hours	{"ts": "2026-07-20T09:56:38.087Z", "updated": 8}	2026-07-20 04:56:38.089179-05
1097	business-hours	{"ts": "2026-07-20T10:01:38.073Z", "updated": 8}	2026-07-20 05:01:38.073934-05
1098	business-hours	{"ts": "2026-07-20T10:06:38.050Z", "updated": 8}	2026-07-20 05:06:38.052909-05
1099	business-hours	{"ts": "2026-07-20T10:11:38.048Z", "updated": 8}	2026-07-20 05:11:38.048914-05
1100	business-hours	{"ts": "2026-07-20T10:16:38.115Z", "updated": 8}	2026-07-20 05:16:38.12166-05
1101	business-hours	{"ts": "2026-07-20T10:21:38.116Z", "updated": 8}	2026-07-20 05:21:38.117631-05
1102	business-hours	{"ts": "2026-07-20T10:26:38.193Z", "updated": 8}	2026-07-20 05:26:38.195898-05
1103	business-hours	{"ts": "2026-07-20T10:31:38.169Z", "updated": 8}	2026-07-20 05:31:38.170529-05
1104	business-hours	{"ts": "2026-07-20T10:36:38.196Z", "updated": 8}	2026-07-20 05:36:38.198677-05
1105	business-hours	{"ts": "2026-07-20T10:41:38.262Z", "updated": 8}	2026-07-20 05:41:38.263056-05
1106	business-hours	{"ts": "2026-07-20T10:46:38.217Z", "updated": 8}	2026-07-20 05:46:38.219097-05
1107	business-hours	{"ts": "2026-07-20T10:51:38.216Z", "updated": 8}	2026-07-20 05:51:38.217268-05
1108	business-hours	{"ts": "2026-07-20T10:56:38.265Z", "updated": 8}	2026-07-20 05:56:38.266732-05
1109	business-hours	{"ts": "2026-07-20T11:01:38.669Z", "updated": 8}	2026-07-20 06:01:38.675926-05
1110	business-hours	{"ts": "2026-07-20T11:06:38.294Z", "updated": 8}	2026-07-20 06:06:38.29543-05
1111	business-hours	{"ts": "2026-07-20T11:11:38.315Z", "updated": 8}	2026-07-20 06:11:38.316197-05
1112	business-hours	{"ts": "2026-07-20T11:16:38.414Z", "updated": 8}	2026-07-20 06:16:38.416709-05
1113	business-hours	{"ts": "2026-07-20T11:21:38.350Z", "updated": 8}	2026-07-20 06:21:38.351608-05
1114	business-hours	{"ts": "2026-07-20T11:26:38.347Z", "updated": 8}	2026-07-20 06:26:38.348753-05
1115	business-hours	{"ts": "2026-07-20T11:31:38.413Z", "updated": 8}	2026-07-20 06:31:38.414464-05
1116	business-hours	{"ts": "2026-07-20T11:36:38.363Z", "updated": 8}	2026-07-20 06:36:38.363614-05
1117	business-hours	{"ts": "2026-07-20T11:41:38.404Z", "updated": 8}	2026-07-20 06:41:38.405725-05
1118	business-hours	{"ts": "2026-07-20T11:46:38.405Z", "updated": 8}	2026-07-20 06:46:38.406678-05
1119	business-hours	{"ts": "2026-07-20T11:51:38.442Z", "updated": 8}	2026-07-20 06:51:38.445136-05
1120	business-hours	{"ts": "2026-07-20T11:56:38.470Z", "updated": 8}	2026-07-20 06:56:38.471083-05
1121	business-hours	{"ts": "2026-07-20T12:01:38.436Z", "updated": 8}	2026-07-20 07:01:38.437758-05
1122	business-hours	{"ts": "2026-07-20T12:06:38.469Z", "updated": 8}	2026-07-20 07:06:38.469426-05
1123	business-hours	{"ts": "2026-07-20T12:11:38.471Z", "updated": 8}	2026-07-20 07:11:38.472143-05
1124	business-hours	{"ts": "2026-07-20T12:16:38.468Z", "updated": 8}	2026-07-20 07:16:38.469417-05
1125	business-hours	{"ts": "2026-07-20T12:21:38.504Z", "updated": 8}	2026-07-20 07:21:38.50493-05
1126	business-hours	{"ts": "2026-07-20T12:26:38.515Z", "updated": 8}	2026-07-20 07:26:38.516532-05
1127	business-hours	{"ts": "2026-07-20T12:31:38.526Z", "updated": 8}	2026-07-20 07:31:38.527447-05
1128	business-hours	{"ts": "2026-07-20T12:36:38.542Z", "updated": 8}	2026-07-20 07:36:38.54344-05
1272	location-history-prune	{"deleted": 0}	2026-07-20 19:08:09.203168-05
1129	business-hours	{"ts": "2026-07-20T12:41:38.535Z", "updated": 8}	2026-07-20 07:41:38.535938-05
1130	business-hours	{"ts": "2026-07-20T12:46:38.583Z", "updated": 8}	2026-07-20 07:46:38.584832-05
1131	business-hours	{"ts": "2026-07-20T12:51:38.563Z", "updated": 8}	2026-07-20 07:51:38.564367-05
1132	business-hours	{"ts": "2026-07-20T12:56:38.589Z", "updated": 8}	2026-07-20 07:56:38.590261-05
1133	business-hours	{"ts": "2026-07-20T13:01:38.574Z", "updated": 8}	2026-07-20 08:01:38.575395-05
1134	business-hours	{"ts": "2026-07-20T13:06:38.595Z", "updated": 8}	2026-07-20 08:06:38.597755-05
1135	business-hours	{"ts": "2026-07-20T13:11:38.612Z", "updated": 8}	2026-07-20 08:11:38.613486-05
1136	business-hours	{"ts": "2026-07-20T13:16:38.635Z", "updated": 8}	2026-07-20 08:16:38.636568-05
1137	business-hours	{"ts": "2026-07-20T13:21:38.644Z", "updated": 8}	2026-07-20 08:21:38.645784-05
1138	business-hours	{"ts": "2026-07-20T13:26:38.654Z", "updated": 8}	2026-07-20 08:26:38.655494-05
1139	business-hours	{"ts": "2026-07-20T13:31:38.633Z", "updated": 8}	2026-07-20 08:31:38.633975-05
1140	business-hours	{"ts": "2026-07-20T13:36:38.661Z", "updated": 8}	2026-07-20 08:36:38.662805-05
1141	business-hours	{"ts": "2026-07-20T13:41:38.691Z", "updated": 8}	2026-07-20 08:41:38.692536-05
1142	business-hours	{"ts": "2026-07-20T13:46:38.654Z", "updated": 8}	2026-07-20 08:46:38.655184-05
1143	business-hours	{"ts": "2026-07-20T13:51:38.689Z", "updated": 8}	2026-07-20 08:51:38.690449-05
1144	business-hours	{"ts": "2026-07-20T13:56:38.672Z", "updated": 8}	2026-07-20 08:56:38.672707-05
1145	business-hours	{"ts": "2026-07-20T14:01:38.730Z", "updated": 8}	2026-07-20 09:01:38.731453-05
1146	business-hours	{"ts": "2026-07-20T14:06:38.707Z", "updated": 8}	2026-07-20 09:06:38.708836-05
1147	business-hours	{"ts": "2026-07-20T14:11:38.726Z", "updated": 8}	2026-07-20 09:11:38.727411-05
1148	business-hours	{"ts": "2026-07-20T14:16:38.728Z", "updated": 8}	2026-07-20 09:16:38.728667-05
1149	business-hours	{"ts": "2026-07-20T14:21:38.772Z", "updated": 8}	2026-07-20 09:21:38.774436-05
1150	business-hours	{"ts": "2026-07-20T14:26:38.744Z", "updated": 8}	2026-07-20 09:26:38.745201-05
1151	business-hours	{"ts": "2026-07-20T14:31:38.765Z", "updated": 8}	2026-07-20 09:31:38.767387-05
1152	business-hours	{"ts": "2026-07-20T14:36:38.755Z", "updated": 8}	2026-07-20 09:36:38.758047-05
1153	business-hours	{"ts": "2026-07-20T14:41:38.778Z", "updated": 8}	2026-07-20 09:41:38.779406-05
1154	business-hours	{"ts": "2026-07-20T14:46:38.775Z", "updated": 8}	2026-07-20 09:46:38.775915-05
1155	business-hours	{"ts": "2026-07-20T14:51:38.825Z", "updated": 8}	2026-07-20 09:51:38.828457-05
1156	business-hours	{"ts": "2026-07-20T14:56:38.800Z", "updated": 8}	2026-07-20 09:56:38.800839-05
1157	business-hours	{"ts": "2026-07-20T15:01:38.804Z", "updated": 8}	2026-07-20 10:01:38.805335-05
1158	business-hours	{"ts": "2026-07-20T15:06:38.798Z", "updated": 8}	2026-07-20 10:06:38.800354-05
1159	business-hours	{"ts": "2026-07-20T15:11:38.801Z", "updated": 8}	2026-07-20 10:11:38.80174-05
1160	business-hours	{"ts": "2026-07-20T15:16:38.828Z", "updated": 8}	2026-07-20 10:16:38.829818-05
1161	business-hours	{"ts": "2026-07-20T15:21:38.814Z", "updated": 8}	2026-07-20 10:21:38.815221-05
1162	business-hours	{"ts": "2026-07-20T15:26:38.842Z", "updated": 8}	2026-07-20 10:26:38.842784-05
1163	business-hours	{"ts": "2026-07-20T15:31:38.862Z", "updated": 8}	2026-07-20 10:31:38.863619-05
1164	business-hours	{"ts": "2026-07-20T15:36:38.889Z", "updated": 8}	2026-07-20 10:36:38.890517-05
1165	business-hours	{"ts": "2026-07-20T15:41:38.892Z", "updated": 8}	2026-07-20 10:41:38.892954-05
1166	business-hours	{"ts": "2026-07-20T15:46:38.883Z", "updated": 8}	2026-07-20 10:46:38.884522-05
1167	location-history-prune	{"deleted": 0}	2026-07-20 10:46:47.03017-05
1168	business-hours	{"ts": "2026-07-20T15:51:45.443Z", "updated": 8}	2026-07-20 10:51:45.445782-05
1169	business-hours	{"ts": "2026-07-20T15:56:45.355Z", "updated": 8}	2026-07-20 10:56:45.357512-05
1170	location-history-prune	{"deleted": 0}	2026-07-20 10:57:45.171138-05
1171	business-hours	{"ts": "2026-07-20T16:02:44.330Z", "updated": 8}	2026-07-20 11:02:44.334436-05
1172	business-hours	{"ts": "2026-07-20T16:07:44.326Z", "updated": 8}	2026-07-20 11:07:44.32818-05
1173	business-hours	{"ts": "2026-07-20T16:12:44.297Z", "updated": 8}	2026-07-20 11:12:44.299474-05
1174	business-hours	{"ts": "2026-07-20T16:17:44.414Z", "updated": 8}	2026-07-20 11:17:44.415867-05
1175	business-hours	{"ts": "2026-07-20T16:22:44.358Z", "updated": 8}	2026-07-20 11:22:44.358934-05
1176	location-history-prune	{"deleted": 0}	2026-07-20 11:22:54.406649-05
1177	business-hours	{"ts": "2026-07-20T16:27:53.573Z", "updated": 8}	2026-07-20 11:27:53.574678-05
1178	business-hours	{"ts": "2026-07-20T16:32:53.629Z", "updated": 8}	2026-07-20 11:32:53.634075-05
1179	location-history-prune	{"deleted": 0}	2026-07-20 11:34:43.677216-05
1180	business-hours	{"ts": "2026-07-20T16:39:42.842Z", "updated": 8}	2026-07-20 11:39:42.842974-05
1181	business-hours	{"ts": "2026-07-20T16:44:42.849Z", "updated": 8}	2026-07-20 11:44:42.849983-05
1182	business-hours	{"ts": "2026-07-20T16:49:43.077Z", "updated": 8}	2026-07-20 11:49:43.07812-05
1183	business-hours	{"ts": "2026-07-20T16:54:42.886Z", "updated": 8}	2026-07-20 11:54:42.893387-05
1184	business-hours	{"ts": "2026-07-20T16:59:42.868Z", "updated": 8}	2026-07-20 11:59:42.869673-05
1185	business-hours	{"ts": "2026-07-20T17:04:42.873Z", "updated": 8}	2026-07-20 12:04:42.873947-05
1186	business-hours	{"ts": "2026-07-20T17:09:42.868Z", "updated": 8}	2026-07-20 12:09:42.868888-05
1187	business-hours	{"ts": "2026-07-20T17:14:42.869Z", "updated": 8}	2026-07-20 12:14:42.87058-05
1188	business-hours	{"ts": "2026-07-20T17:19:42.910Z", "updated": 8}	2026-07-20 12:19:42.911463-05
1189	business-hours	{"ts": "2026-07-20T17:24:42.924Z", "updated": 8}	2026-07-20 12:24:42.924647-05
1190	business-hours	{"ts": "2026-07-20T17:29:42.975Z", "updated": 8}	2026-07-20 12:29:42.975982-05
1191	business-hours	{"ts": "2026-07-20T17:34:42.993Z", "updated": 8}	2026-07-20 12:34:42.994052-05
1192	business-hours	{"ts": "2026-07-20T17:39:43.030Z", "updated": 8}	2026-07-20 12:39:43.033017-05
1193	business-hours	{"ts": "2026-07-20T17:44:43.111Z", "updated": 8}	2026-07-20 12:44:43.112142-05
1194	business-hours	{"ts": "2026-07-20T17:49:43.071Z", "updated": 8}	2026-07-20 12:49:43.072303-05
1195	business-hours	{"ts": "2026-07-20T17:54:43.214Z", "updated": 8}	2026-07-20 12:54:43.221616-05
1196	business-hours	{"ts": "2026-07-20T17:59:43.089Z", "updated": 8}	2026-07-20 12:59:43.090506-05
1197	business-hours	{"ts": "2026-07-20T18:04:43.115Z", "updated": 8}	2026-07-20 13:04:43.118527-05
1198	business-hours	{"ts": "2026-07-20T18:09:43.126Z", "updated": 8}	2026-07-20 13:09:43.128962-05
1199	business-hours	{"ts": "2026-07-20T18:14:43.178Z", "updated": 8}	2026-07-20 13:14:43.180769-05
1200	business-hours	{"ts": "2026-07-20T18:19:43.327Z", "updated": 8}	2026-07-20 13:19:43.327812-05
1201	business-hours	{"ts": "2026-07-20T18:24:43.255Z", "updated": 8}	2026-07-20 13:24:43.261324-05
1202	business-hours	{"ts": "2026-07-20T18:29:43.236Z", "updated": 8}	2026-07-20 13:29:43.237467-05
1203	location-history-prune	{"deleted": 0}	2026-07-20 13:31:28.002999-05
1204	business-hours	{"ts": "2026-07-20T18:36:26.801Z", "updated": 8}	2026-07-20 13:36:26.803068-05
1205	business-hours	{"ts": "2026-07-20T18:41:26.818Z", "updated": 8}	2026-07-20 13:41:26.819867-05
1206	business-hours	{"ts": "2026-07-20T18:46:26.768Z", "updated": 8}	2026-07-20 13:46:26.769136-05
1207	business-hours	{"ts": "2026-07-20T18:51:26.778Z", "updated": 8}	2026-07-20 13:51:26.781421-05
1208	business-hours	{"ts": "2026-07-20T18:56:26.763Z", "updated": 8}	2026-07-20 13:56:26.764432-05
1209	business-hours	{"ts": "2026-07-20T19:01:26.783Z", "updated": 8}	2026-07-20 14:01:26.788127-05
1210	business-hours	{"ts": "2026-07-20T19:06:26.816Z", "updated": 8}	2026-07-20 14:06:26.816832-05
1211	business-hours	{"ts": "2026-07-20T19:11:26.859Z", "updated": 8}	2026-07-20 14:11:26.861902-05
1212	business-hours	{"ts": "2026-07-20T19:16:26.810Z", "updated": 8}	2026-07-20 14:16:26.811173-05
1213	business-hours	{"ts": "2026-07-20T19:21:26.906Z", "updated": 8}	2026-07-20 14:21:26.907309-05
1214	business-hours	{"ts": "2026-07-20T19:26:26.880Z", "updated": 8}	2026-07-20 14:26:26.880678-05
1215	business-hours	{"ts": "2026-07-20T19:31:26.878Z", "updated": 8}	2026-07-20 14:31:26.879424-05
1216	business-hours	{"ts": "2026-07-20T19:36:26.966Z", "updated": 8}	2026-07-20 14:36:26.96905-05
1217	business-hours	{"ts": "2026-07-20T19:41:26.945Z", "updated": 8}	2026-07-20 14:41:26.946384-05
1218	business-hours	{"ts": "2026-07-20T19:46:27.018Z", "updated": 8}	2026-07-20 14:46:27.01994-05
1219	business-hours	{"ts": "2026-07-20T19:51:26.966Z", "updated": 8}	2026-07-20 14:51:26.966613-05
1220	business-hours	{"ts": "2026-07-20T19:56:26.994Z", "updated": 8}	2026-07-20 14:56:26.994871-05
1221	business-hours	{"ts": "2026-07-20T20:01:27.015Z", "updated": 8}	2026-07-20 15:01:27.017234-05
1222	business-hours	{"ts": "2026-07-20T20:06:27.044Z", "updated": 8}	2026-07-20 15:06:27.045587-05
1223	business-hours	{"ts": "2026-07-20T20:11:27.168Z", "updated": 8}	2026-07-20 15:11:27.168949-05
1224	business-hours	{"ts": "2026-07-20T20:16:27.109Z", "updated": 8}	2026-07-20 15:16:27.117335-05
1225	business-hours	{"ts": "2026-07-20T20:21:27.210Z", "updated": 8}	2026-07-20 15:21:27.211269-05
1226	business-hours	{"ts": "2026-07-20T20:26:27.156Z", "updated": 8}	2026-07-20 15:26:27.157195-05
1227	business-hours	{"ts": "2026-07-20T20:31:27.172Z", "updated": 8}	2026-07-20 15:31:27.173366-05
1228	business-hours	{"ts": "2026-07-20T20:36:27.193Z", "updated": 8}	2026-07-20 15:36:27.194221-05
1229	business-hours	{"ts": "2026-07-20T20:41:27.194Z", "updated": 8}	2026-07-20 15:41:27.197483-05
1230	business-hours	{"ts": "2026-07-20T20:46:27.240Z", "updated": 8}	2026-07-20 15:46:27.241609-05
1231	business-hours	{"ts": "2026-07-20T20:51:27.251Z", "updated": 8}	2026-07-20 15:51:27.252944-05
1232	business-hours	{"ts": "2026-07-20T20:56:27.258Z", "updated": 8}	2026-07-20 15:56:27.259505-05
1233	business-hours	{"ts": "2026-07-20T21:01:27.339Z", "updated": 8}	2026-07-20 16:01:27.342488-05
1234	business-hours	{"ts": "2026-07-20T21:06:27.373Z", "updated": 8}	2026-07-20 16:06:27.374349-05
1235	business-hours	{"ts": "2026-07-20T21:11:27.326Z", "updated": 8}	2026-07-20 16:11:27.328602-05
1236	business-hours	{"ts": "2026-07-20T21:16:27.342Z", "updated": 8}	2026-07-20 16:16:27.342972-05
1237	business-hours	{"ts": "2026-07-20T21:21:27.442Z", "updated": 8}	2026-07-20 16:21:27.44701-05
1238	business-hours	{"ts": "2026-07-20T21:26:27.350Z", "updated": 8}	2026-07-20 16:26:27.350715-05
1239	business-hours	{"ts": "2026-07-20T21:31:27.406Z", "updated": 8}	2026-07-20 16:31:27.415707-05
1240	business-hours	{"ts": "2026-07-20T21:36:27.545Z", "updated": 8}	2026-07-20 16:36:27.556108-05
1241	business-hours	{"ts": "2026-07-20T21:41:27.464Z", "updated": 8}	2026-07-20 16:41:27.464857-05
1242	business-hours	{"ts": "2026-07-20T21:46:27.502Z", "updated": 8}	2026-07-20 16:46:27.503013-05
1244	business-hours	{"ts": "2026-07-20T21:51:38.077Z", "updated": 8}	2026-07-20 16:51:38.07896-05
1245	business-hours	{"ts": "2026-07-20T21:56:38.063Z", "updated": 8}	2026-07-20 16:56:38.065028-05
1247	business-hours	{"ts": "2026-07-20T22:04:23.439Z", "updated": 8}	2026-07-20 17:04:23.440856-05
1249	business-hours	{"ts": "2026-07-20T22:13:26.698Z", "updated": 8}	2026-07-20 17:13:26.698937-05
1250	business-hours	{"ts": "2026-07-20T22:18:26.794Z", "updated": 8}	2026-07-20 17:18:26.795874-05
1251	business-hours	{"ts": "2026-07-20T22:23:26.689Z", "updated": 8}	2026-07-20 17:23:26.691868-05
1252	business-hours	{"ts": "2026-07-20T22:28:26.745Z", "updated": 8}	2026-07-20 17:28:26.746782-05
1253	business-hours	{"ts": "2026-07-20T22:33:26.749Z", "updated": 8}	2026-07-20 17:33:26.7503-05
1254	business-hours	{"ts": "2026-07-20T22:38:26.760Z", "updated": 8}	2026-07-20 17:38:26.760898-05
1255	business-hours	{"ts": "2026-07-20T22:43:26.804Z", "updated": 8}	2026-07-20 17:43:26.805385-05
1256	business-hours	{"ts": "2026-07-20T22:48:26.837Z", "updated": 8}	2026-07-20 17:48:26.853412-05
1257	business-hours	{"ts": "2026-07-20T22:53:26.844Z", "updated": 8}	2026-07-20 17:53:26.84597-05
1258	business-hours	{"ts": "2026-07-20T22:58:26.846Z", "updated": 8}	2026-07-20 17:58:26.847786-05
1259	business-hours	{"ts": "2026-07-20T23:03:26.876Z", "updated": 8}	2026-07-20 18:03:26.87726-05
1260	business-hours	{"ts": "2026-07-20T23:08:26.875Z", "updated": 8}	2026-07-20 18:08:26.876485-05
1261	business-hours	{"ts": "2026-07-20T23:13:26.917Z", "updated": 8}	2026-07-20 18:13:26.920131-05
1262	business-hours	{"ts": "2026-07-20T23:18:27.023Z", "updated": 8}	2026-07-20 18:18:27.023647-05
1263	business-hours	{"ts": "2026-07-20T23:23:26.986Z", "updated": 8}	2026-07-20 18:23:26.987384-05
1264	business-hours	{"ts": "2026-07-20T23:28:26.991Z", "updated": 8}	2026-07-20 18:28:26.99237-05
1265	business-hours	{"ts": "2026-07-20T23:33:26.970Z", "updated": 8}	2026-07-20 18:33:26.971812-05
1266	business-hours	{"ts": "2026-07-20T23:38:27.025Z", "updated": 8}	2026-07-20 18:38:27.026593-05
1267	business-hours	{"ts": "2026-07-20T23:43:27.023Z", "updated": 8}	2026-07-20 18:43:27.024362-05
1268	business-hours	{"ts": "2026-07-20T23:48:27.032Z", "updated": 8}	2026-07-20 18:48:27.033493-05
1269	business-hours	{"ts": "2026-07-20T23:53:27.077Z", "updated": 8}	2026-07-20 18:53:27.079556-05
1270	business-hours	{"ts": "2026-07-20T23:58:27.088Z", "updated": 8}	2026-07-20 18:58:27.090431-05
1271	business-hours	{"ts": "2026-07-21T00:03:27.147Z", "updated": 8}	2026-07-20 19:03:27.147902-05
1273	location-history-prune	{"deleted": 0}	2026-07-20 19:08:32.792724-05
1274	business-hours	{"ts": "2026-07-21T00:13:32.023Z", "updated": 8}	2026-07-20 19:13:32.024052-05
1275	business-hours	{"ts": "2026-07-21T00:18:32.074Z", "updated": 8}	2026-07-20 19:18:32.075482-05
1276	business-hours	{"ts": "2026-07-21T00:23:32.107Z", "updated": 8}	2026-07-20 19:23:32.112693-05
1277	business-hours	{"ts": "2026-07-21T00:28:32.101Z", "updated": 8}	2026-07-20 19:28:32.102001-05
1278	location-history-prune	{"deleted": 0}	2026-07-20 19:31:49.411633-05
1279	location-history-prune	{"deleted": 0}	2026-07-20 19:36:50.162138-05
1280	business-hours	{"ts": "2026-07-21T00:41:49.441Z", "updated": 9}	2026-07-20 19:41:49.446197-05
1281	business-hours	{"ts": "2026-07-21T00:46:49.258Z", "updated": 9}	2026-07-20 19:46:49.259691-05
1282	business-hours	{"ts": "2026-07-21T00:51:49.256Z", "updated": 9}	2026-07-20 19:51:49.256755-05
1283	business-hours	{"ts": "2026-07-21T00:56:49.249Z", "updated": 9}	2026-07-20 19:56:49.250949-05
1284	business-hours	{"ts": "2026-07-21T01:01:49.261Z", "updated": 10}	2026-07-20 20:01:49.261608-05
1285	location-history-prune	{"deleted": 0}	2026-07-20 20:03:21.810731-05
1286	business-hours	{"ts": "2026-07-21T01:08:20.930Z", "updated": 10}	2026-07-20 20:08:20.931023-05
1287	business-hours	{"ts": "2026-07-21T01:13:20.928Z", "updated": 10}	2026-07-20 20:13:20.933495-05
1288	business-hours	{"ts": "2026-07-21T01:18:20.987Z", "updated": 10}	2026-07-20 20:18:20.989079-05
1289	business-hours	{"ts": "2026-07-21T01:23:20.973Z", "updated": 10}	2026-07-20 20:23:20.974768-05
1290	location-history-prune	{"deleted": 0}	2026-07-20 20:27:12.533008-05
1291	business-hours	{"ts": "2026-07-21T01:32:11.112Z", "updated": 10}	2026-07-20 20:32:11.113391-05
1292	business-hours	{"ts": "2026-07-21T01:37:11.097Z", "updated": 10}	2026-07-20 20:37:11.098667-05
1293	business-hours	{"ts": "2026-07-21T01:42:11.103Z", "updated": 10}	2026-07-20 20:42:11.104853-05
1294	business-hours	{"ts": "2026-07-21T01:47:11.094Z", "updated": 10}	2026-07-20 20:47:11.095034-05
1295	business-hours	{"ts": "2026-07-21T01:52:11.126Z", "updated": 10}	2026-07-20 20:52:11.132131-05
1296	business-hours	{"ts": "2026-07-21T01:57:11.109Z", "updated": 10}	2026-07-20 20:57:11.109902-05
1297	business-hours	{"ts": "2026-07-21T02:02:11.160Z", "updated": 10}	2026-07-20 21:02:11.161014-05
1298	business-hours	{"ts": "2026-07-21T02:07:11.159Z", "updated": 10}	2026-07-20 21:07:11.160066-05
1299	business-hours	{"ts": "2026-07-21T02:12:11.204Z", "updated": 10}	2026-07-20 21:12:11.206421-05
1300	business-hours	{"ts": "2026-07-21T02:17:11.361Z", "updated": 10}	2026-07-20 21:17:11.361978-05
1301	business-hours	{"ts": "2026-07-21T02:22:11.235Z", "updated": 10}	2026-07-20 21:22:11.237131-05
1302	business-hours	{"ts": "2026-07-21T02:27:11.301Z", "updated": 10}	2026-07-20 21:27:11.304409-05
1303	business-hours	{"ts": "2026-07-21T02:32:11.248Z", "updated": 10}	2026-07-20 21:32:11.249466-05
1304	business-hours	{"ts": "2026-07-21T02:37:11.270Z", "updated": 10}	2026-07-20 21:37:11.271065-05
1305	business-hours	{"ts": "2026-07-21T02:42:11.295Z", "updated": 10}	2026-07-20 21:42:11.296229-05
1306	business-hours	{"ts": "2026-07-21T02:47:11.296Z", "updated": 10}	2026-07-20 21:47:11.29712-05
1307	business-hours	{"ts": "2026-07-21T02:52:11.357Z", "updated": 10}	2026-07-20 21:52:11.358371-05
1308	business-hours	{"ts": "2026-07-21T02:57:11.351Z", "updated": 10}	2026-07-20 21:57:11.352583-05
1309	business-hours	{"ts": "2026-07-21T03:02:11.403Z", "updated": 10}	2026-07-20 22:02:11.405131-05
1310	business-hours	{"ts": "2026-07-21T03:07:11.390Z", "updated": 10}	2026-07-20 22:07:11.391761-05
1311	business-hours	{"ts": "2026-07-21T03:12:11.619Z", "updated": 10}	2026-07-20 22:12:11.62734-05
1312	business-hours	{"ts": "2026-07-21T03:17:12.508Z", "updated": 10}	2026-07-20 22:17:12.52042-05
1313	business-hours	{"ts": "2026-07-21T03:22:11.452Z", "updated": 10}	2026-07-20 22:22:11.453633-05
1314	business-hours	{"ts": "2026-07-21T03:27:11.461Z", "updated": 10}	2026-07-20 22:27:11.461762-05
1315	business-hours	{"ts": "2026-07-21T03:32:11.489Z", "updated": 10}	2026-07-20 22:32:11.490712-05
1316	business-hours	{"ts": "2026-07-21T03:37:11.493Z", "updated": 10}	2026-07-20 22:37:11.494161-05
1317	business-hours	{"ts": "2026-07-21T03:42:11.513Z", "updated": 10}	2026-07-20 22:42:11.51448-05
1318	business-hours	{"ts": "2026-07-21T03:47:11.567Z", "updated": 10}	2026-07-20 22:47:11.568164-05
1319	business-hours	{"ts": "2026-07-21T03:52:11.532Z", "updated": 10}	2026-07-20 22:52:11.533397-05
1320	business-hours	{"ts": "2026-07-21T03:57:11.588Z", "updated": 10}	2026-07-20 22:57:11.589849-05
1321	business-hours	{"ts": "2026-07-21T04:02:11.577Z", "updated": 10}	2026-07-20 23:02:11.578512-05
1322	business-hours	{"ts": "2026-07-21T04:07:11.611Z", "updated": 10}	2026-07-20 23:07:11.612397-05
1323	business-hours	{"ts": "2026-07-21T04:12:11.614Z", "updated": 10}	2026-07-20 23:12:11.616043-05
1324	business-hours	{"ts": "2026-07-21T04:17:11.985Z", "updated": 10}	2026-07-20 23:17:11.987344-05
1325	business-hours	{"ts": "2026-07-21T04:22:11.656Z", "updated": 10}	2026-07-20 23:22:11.657666-05
1326	business-hours	{"ts": "2026-07-21T04:27:11.661Z", "updated": 10}	2026-07-20 23:27:11.662342-05
1327	business-hours	{"ts": "2026-07-21T04:32:11.717Z", "updated": 10}	2026-07-20 23:32:11.720252-05
1328	business-hours	{"ts": "2026-07-21T04:37:11.701Z", "updated": 10}	2026-07-20 23:37:11.701996-05
1329	business-hours	{"ts": "2026-07-21T04:42:11.738Z", "updated": 10}	2026-07-20 23:42:11.740131-05
1330	business-hours	{"ts": "2026-07-21T04:47:11.746Z", "updated": 10}	2026-07-20 23:47:11.747316-05
1331	business-hours	{"ts": "2026-07-21T04:52:11.780Z", "updated": 10}	2026-07-20 23:52:11.781779-05
1332	business-hours	{"ts": "2026-07-21T04:57:11.792Z", "updated": 10}	2026-07-20 23:57:11.793577-05
1333	business-hours	{"ts": "2026-07-21T05:02:11.840Z", "updated": 10}	2026-07-21 00:02:11.841168-05
1334	business-hours	{"ts": "2026-07-21T05:07:11.847Z", "updated": 10}	2026-07-21 00:07:11.848603-05
1335	business-hours	{"ts": "2026-07-21T05:12:11.891Z", "updated": 10}	2026-07-21 00:12:11.892661-05
1336	business-hours	{"ts": "2026-07-21T05:17:12.175Z", "updated": 10}	2026-07-21 00:17:12.177044-05
1337	business-hours	{"ts": "2026-07-21T05:22:11.911Z", "updated": 10}	2026-07-21 00:22:11.912197-05
1338	business-hours	{"ts": "2026-07-21T05:27:11.944Z", "updated": 10}	2026-07-21 00:27:11.946271-05
1471	location-history-prune	{"deleted": 0}	2026-07-21 11:24:58.661906-05
1339	business-hours	{"ts": "2026-07-21T05:32:11.977Z", "updated": 10}	2026-07-21 00:32:11.978704-05
1340	location-history-prune	{"deleted": 0}	2026-07-21 00:34:22.936504-05
1341	business-hours	{"ts": "2026-07-21T05:39:22.069Z", "updated": 10}	2026-07-21 00:39:22.071217-05
1342	business-hours	{"ts": "2026-07-21T05:44:22.057Z", "updated": 10}	2026-07-21 00:44:22.058965-05
1343	business-hours	{"ts": "2026-07-21T05:49:22.051Z", "updated": 10}	2026-07-21 00:49:22.052822-05
1344	business-hours	{"ts": "2026-07-21T05:54:22.063Z", "updated": 10}	2026-07-21 00:54:22.064555-05
1345	business-hours	{"ts": "2026-07-21T05:59:22.076Z", "updated": 10}	2026-07-21 00:59:22.079504-05
1346	location-history-prune	{"deleted": 0}	2026-07-21 01:04:04.618995-05
1347	business-hours	{"ts": "2026-07-21T06:09:04.356Z", "updated": 10}	2026-07-21 01:09:04.357693-05
1348	business-hours	{"ts": "2026-07-21T06:14:03.652Z", "updated": 10}	2026-07-21 01:14:03.653604-05
1349	business-hours	{"ts": "2026-07-21T06:19:03.714Z", "updated": 10}	2026-07-21 01:19:03.716263-05
1350	business-hours	{"ts": "2026-07-21T06:24:03.762Z", "updated": 10}	2026-07-21 01:24:03.763209-05
1351	business-hours	{"ts": "2026-07-21T06:29:03.654Z", "updated": 10}	2026-07-21 01:29:03.655394-05
1352	business-hours	{"ts": "2026-07-21T06:34:03.749Z", "updated": 10}	2026-07-21 01:34:03.758168-05
1353	business-hours	{"ts": "2026-07-21T06:39:03.685Z", "updated": 10}	2026-07-21 01:39:03.685692-05
1354	business-hours	{"ts": "2026-07-21T06:44:03.755Z", "updated": 10}	2026-07-21 01:44:03.756276-05
1355	business-hours	{"ts": "2026-07-21T06:49:03.743Z", "updated": 10}	2026-07-21 01:49:03.744391-05
1356	business-hours	{"ts": "2026-07-21T06:54:03.796Z", "updated": 10}	2026-07-21 01:54:03.796796-05
1357	business-hours	{"ts": "2026-07-21T06:59:03.781Z", "updated": 10}	2026-07-21 01:59:03.782121-05
1358	business-hours	{"ts": "2026-07-21T07:04:03.790Z", "updated": 10}	2026-07-21 02:04:03.791032-05
1359	business-hours	{"ts": "2026-07-21T07:09:03.986Z", "updated": 10}	2026-07-21 02:09:04.021001-05
1360	business-hours	{"ts": "2026-07-21T07:14:03.823Z", "updated": 10}	2026-07-21 02:14:03.824744-05
1361	business-hours	{"ts": "2026-07-21T07:19:03.934Z", "updated": 10}	2026-07-21 02:19:03.949768-05
1362	business-hours	{"ts": "2026-07-21T07:24:03.867Z", "updated": 10}	2026-07-21 02:24:03.867694-05
1363	business-hours	{"ts": "2026-07-21T07:29:04.191Z", "updated": 10}	2026-07-21 02:29:04.192133-05
1364	business-hours	{"ts": "2026-07-21T07:34:03.884Z", "updated": 10}	2026-07-21 02:34:03.885014-05
1365	business-hours	{"ts": "2026-07-21T07:39:03.977Z", "updated": 10}	2026-07-21 02:39:03.985102-05
1366	business-hours	{"ts": "2026-07-21T07:44:03.933Z", "updated": 10}	2026-07-21 02:44:03.935441-05
1367	business-hours	{"ts": "2026-07-21T07:49:03.931Z", "updated": 10}	2026-07-21 02:49:03.93262-05
1368	business-hours	{"ts": "2026-07-21T07:54:03.986Z", "updated": 10}	2026-07-21 02:54:03.987051-05
1369	business-hours	{"ts": "2026-07-21T07:59:03.996Z", "updated": 10}	2026-07-21 02:59:03.998395-05
1370	business-hours	{"ts": "2026-07-21T08:04:04.025Z", "updated": 10}	2026-07-21 03:04:04.026897-05
1371	business-hours	{"ts": "2026-07-21T08:09:04.028Z", "updated": 10}	2026-07-21 03:09:04.028972-05
1372	business-hours	{"ts": "2026-07-21T08:14:04.060Z", "updated": 10}	2026-07-21 03:14:04.060979-05
1373	business-hours	{"ts": "2026-07-21T08:19:04.086Z", "updated": 10}	2026-07-21 03:19:04.089385-05
1374	business-hours	{"ts": "2026-07-21T08:24:04.093Z", "updated": 10}	2026-07-21 03:24:04.094722-05
1375	business-hours	{"ts": "2026-07-21T08:29:04.096Z", "updated": 10}	2026-07-21 03:29:04.097615-05
1376	business-hours	{"ts": "2026-07-21T08:34:04.156Z", "updated": 10}	2026-07-21 03:34:04.157748-05
1377	business-hours	{"ts": "2026-07-21T08:39:04.142Z", "updated": 10}	2026-07-21 03:39:04.143669-05
1378	business-hours	{"ts": "2026-07-21T08:44:04.227Z", "updated": 10}	2026-07-21 03:44:04.228461-05
1379	business-hours	{"ts": "2026-07-21T08:49:04.186Z", "updated": 10}	2026-07-21 03:49:04.186957-05
1380	business-hours	{"ts": "2026-07-21T08:54:04.214Z", "updated": 10}	2026-07-21 03:54:04.215703-05
1381	business-hours	{"ts": "2026-07-21T08:59:04.259Z", "updated": 10}	2026-07-21 03:59:04.259854-05
1382	business-hours	{"ts": "2026-07-21T09:04:04.313Z", "updated": 10}	2026-07-21 04:04:04.319972-05
1383	business-hours	{"ts": "2026-07-21T09:09:04.277Z", "updated": 10}	2026-07-21 04:09:04.277749-05
1384	business-hours	{"ts": "2026-07-21T09:14:04.321Z", "updated": 10}	2026-07-21 04:14:04.323871-05
1385	business-hours	{"ts": "2026-07-21T09:19:04.405Z", "updated": 10}	2026-07-21 04:19:04.412797-05
1386	business-hours	{"ts": "2026-07-21T09:24:04.384Z", "updated": 10}	2026-07-21 04:24:04.386134-05
1387	business-hours	{"ts": "2026-07-21T09:29:04.392Z", "updated": 10}	2026-07-21 04:29:04.394032-05
1388	business-hours	{"ts": "2026-07-21T09:34:04.658Z", "updated": 10}	2026-07-21 04:34:04.670003-05
1389	business-hours	{"ts": "2026-07-21T09:39:04.573Z", "updated": 10}	2026-07-21 04:39:04.580747-05
1390	business-hours	{"ts": "2026-07-21T09:44:04.413Z", "updated": 10}	2026-07-21 04:44:04.416557-05
1391	business-hours	{"ts": "2026-07-21T09:49:04.393Z", "updated": 10}	2026-07-21 04:49:04.394916-05
1392	business-hours	{"ts": "2026-07-21T09:54:04.436Z", "updated": 10}	2026-07-21 04:54:04.441238-05
1393	business-hours	{"ts": "2026-07-21T09:59:04.446Z", "updated": 10}	2026-07-21 04:59:04.453109-05
1394	business-hours	{"ts": "2026-07-21T10:04:04.429Z", "updated": 10}	2026-07-21 05:04:04.431216-05
1395	business-hours	{"ts": "2026-07-21T10:09:04.494Z", "updated": 10}	2026-07-21 05:09:04.496819-05
1396	business-hours	{"ts": "2026-07-21T10:14:04.485Z", "updated": 10}	2026-07-21 05:14:04.488485-05
1397	business-hours	{"ts": "2026-07-21T10:19:04.663Z", "updated": 10}	2026-07-21 05:19:04.665097-05
1398	business-hours	{"ts": "2026-07-21T10:24:04.531Z", "updated": 10}	2026-07-21 05:24:04.532765-05
1399	business-hours	{"ts": "2026-07-21T10:29:04.547Z", "updated": 10}	2026-07-21 05:29:04.547634-05
1400	business-hours	{"ts": "2026-07-21T10:34:04.595Z", "updated": 10}	2026-07-21 05:34:04.596163-05
1401	business-hours	{"ts": "2026-07-21T10:39:04.718Z", "updated": 10}	2026-07-21 05:39:04.719408-05
1402	business-hours	{"ts": "2026-07-21T10:44:04.583Z", "updated": 10}	2026-07-21 05:44:04.585018-05
1403	business-hours	{"ts": "2026-07-21T10:49:04.585Z", "updated": 10}	2026-07-21 05:49:04.586344-05
1404	business-hours	{"ts": "2026-07-21T10:54:04.648Z", "updated": 10}	2026-07-21 05:54:04.649165-05
1405	business-hours	{"ts": "2026-07-21T10:59:04.637Z", "updated": 10}	2026-07-21 05:59:04.640819-05
1406	business-hours	{"ts": "2026-07-21T11:04:04.682Z", "updated": 10}	2026-07-21 06:04:04.704729-05
1407	business-hours	{"ts": "2026-07-21T11:09:04.668Z", "updated": 10}	2026-07-21 06:09:04.669633-05
1408	business-hours	{"ts": "2026-07-21T11:14:04.703Z", "updated": 10}	2026-07-21 06:14:04.704839-05
1409	business-hours	{"ts": "2026-07-21T11:19:05.023Z", "updated": 10}	2026-07-21 06:19:05.055011-05
1410	business-hours	{"ts": "2026-07-21T11:24:04.706Z", "updated": 10}	2026-07-21 06:24:04.70691-05
1411	business-hours	{"ts": "2026-07-21T11:29:04.727Z", "updated": 10}	2026-07-21 06:29:04.728727-05
1412	business-hours	{"ts": "2026-07-21T11:34:04.790Z", "updated": 10}	2026-07-21 06:34:04.79134-05
1413	business-hours	{"ts": "2026-07-21T11:39:04.803Z", "updated": 10}	2026-07-21 06:39:04.804659-05
1414	business-hours	{"ts": "2026-07-21T11:44:04.760Z", "updated": 10}	2026-07-21 06:44:04.762188-05
1415	business-hours	{"ts": "2026-07-21T11:49:04.822Z", "updated": 10}	2026-07-21 06:49:04.825696-05
1416	business-hours	{"ts": "2026-07-21T11:54:04.854Z", "updated": 10}	2026-07-21 06:54:04.859572-05
1417	business-hours	{"ts": "2026-07-21T11:59:04.820Z", "updated": 10}	2026-07-21 06:59:04.82182-05
1418	business-hours	{"ts": "2026-07-21T12:04:04.846Z", "updated": 10}	2026-07-21 07:04:04.847351-05
1419	business-hours	{"ts": "2026-07-21T12:09:04.842Z", "updated": 10}	2026-07-21 07:09:04.842571-05
1420	business-hours	{"ts": "2026-07-21T12:14:04.890Z", "updated": 10}	2026-07-21 07:14:04.891962-05
1421	business-hours	{"ts": "2026-07-21T12:19:05.005Z", "updated": 10}	2026-07-21 07:19:05.005935-05
1422	business-hours	{"ts": "2026-07-21T12:24:04.893Z", "updated": 10}	2026-07-21 07:24:04.895595-05
1423	business-hours	{"ts": "2026-07-21T12:29:04.909Z", "updated": 10}	2026-07-21 07:29:04.910862-05
1424	business-hours	{"ts": "2026-07-21T12:34:04.955Z", "updated": 10}	2026-07-21 07:34:04.961241-05
1425	business-hours	{"ts": "2026-07-21T12:39:05.091Z", "updated": 10}	2026-07-21 07:39:05.092756-05
1426	business-hours	{"ts": "2026-07-21T12:44:04.944Z", "updated": 10}	2026-07-21 07:44:04.945502-05
1427	business-hours	{"ts": "2026-07-21T12:49:04.982Z", "updated": 10}	2026-07-21 07:49:04.983959-05
1428	business-hours	{"ts": "2026-07-21T12:54:04.971Z", "updated": 10}	2026-07-21 07:54:04.973091-05
1429	business-hours	{"ts": "2026-07-21T12:59:05.005Z", "updated": 10}	2026-07-21 07:59:05.006854-05
1430	business-hours	{"ts": "2026-07-21T13:04:04.987Z", "updated": 10}	2026-07-21 08:04:04.988439-05
1431	business-hours	{"ts": "2026-07-21T13:09:05.150Z", "updated": 10}	2026-07-21 08:09:05.152631-05
1432	business-hours	{"ts": "2026-07-21T13:14:05.078Z", "updated": 10}	2026-07-21 08:14:05.081699-05
1433	business-hours	{"ts": "2026-07-21T13:19:05.213Z", "updated": 10}	2026-07-21 08:19:05.215162-05
1434	business-hours	{"ts": "2026-07-21T13:24:05.139Z", "updated": 10}	2026-07-21 08:24:05.148756-05
1435	business-hours	{"ts": "2026-07-21T13:29:05.089Z", "updated": 10}	2026-07-21 08:29:05.090311-05
1436	business-hours	{"ts": "2026-07-21T13:34:05.268Z", "updated": 10}	2026-07-21 08:34:05.269718-05
1437	business-hours	{"ts": "2026-07-21T13:39:05.155Z", "updated": 10}	2026-07-21 08:39:05.156218-05
1438	business-hours	{"ts": "2026-07-21T13:44:05.157Z", "updated": 10}	2026-07-21 08:44:05.158147-05
1439	business-hours	{"ts": "2026-07-21T13:49:05.173Z", "updated": 10}	2026-07-21 08:49:05.174048-05
1440	business-hours	{"ts": "2026-07-21T13:54:05.185Z", "updated": 10}	2026-07-21 08:54:05.188247-05
1441	business-hours	{"ts": "2026-07-21T13:59:05.182Z", "updated": 10}	2026-07-21 08:59:05.18297-05
1442	business-hours	{"ts": "2026-07-21T14:04:05.429Z", "updated": 10}	2026-07-21 09:04:05.430734-05
1443	business-hours	{"ts": "2026-07-21T14:09:05.229Z", "updated": 10}	2026-07-21 09:09:05.230063-05
1444	business-hours	{"ts": "2026-07-21T14:14:05.254Z", "updated": 10}	2026-07-21 09:14:05.255821-05
1445	business-hours	{"ts": "2026-07-21T14:19:05.500Z", "updated": 10}	2026-07-21 09:19:05.503107-05
1446	business-hours	{"ts": "2026-07-21T14:24:05.244Z", "updated": 10}	2026-07-21 09:24:05.247519-05
1447	business-hours	{"ts": "2026-07-21T14:29:05.337Z", "updated": 10}	2026-07-21 09:29:05.339942-05
1448	business-hours	{"ts": "2026-07-21T14:34:05.466Z", "updated": 10}	2026-07-21 09:34:05.467222-05
1449	business-hours	{"ts": "2026-07-21T14:39:05.338Z", "updated": 10}	2026-07-21 09:39:05.339853-05
1450	business-hours	{"ts": "2026-07-21T14:44:05.305Z", "updated": 10}	2026-07-21 09:44:05.306374-05
1451	business-hours	{"ts": "2026-07-21T14:49:05.383Z", "updated": 10}	2026-07-21 09:49:05.38481-05
1452	business-hours	{"ts": "2026-07-21T14:54:05.329Z", "updated": 10}	2026-07-21 09:54:05.333358-05
1453	business-hours	{"ts": "2026-07-21T14:59:05.334Z", "updated": 10}	2026-07-21 09:59:05.335676-05
1454	business-hours	{"ts": "2026-07-21T15:04:05.373Z", "updated": 10}	2026-07-21 10:04:05.383025-05
1455	business-hours	{"ts": "2026-07-21T15:09:05.393Z", "updated": 10}	2026-07-21 10:09:05.394895-05
1456	business-hours	{"ts": "2026-07-21T15:14:05.379Z", "updated": 10}	2026-07-21 10:14:05.379963-05
1457	business-hours	{"ts": "2026-07-21T15:19:05.434Z", "updated": 10}	2026-07-21 10:19:05.43593-05
1458	business-hours	{"ts": "2026-07-21T15:24:05.378Z", "updated": 10}	2026-07-21 10:24:05.379491-05
1459	business-hours	{"ts": "2026-07-21T15:29:05.390Z", "updated": 10}	2026-07-21 10:29:05.391574-05
1460	business-hours	{"ts": "2026-07-21T15:34:05.502Z", "updated": 10}	2026-07-21 10:34:05.503527-05
1461	location-history-prune	{"deleted": 0}	2026-07-21 10:36:28.6729-05
1462	business-hours	{"ts": "2026-07-21T15:41:27.395Z", "updated": 10}	2026-07-21 10:41:27.396072-05
1463	business-hours	{"ts": "2026-07-21T15:46:27.365Z", "updated": 10}	2026-07-21 10:46:27.367738-05
1464	business-hours	{"ts": "2026-07-21T15:51:27.379Z", "updated": 10}	2026-07-21 10:51:27.380875-05
1465	business-hours	{"ts": "2026-07-21T15:56:27.393Z", "updated": 10}	2026-07-21 10:56:27.395938-05
1466	business-hours	{"ts": "2026-07-21T16:01:27.489Z", "updated": 10}	2026-07-21 11:01:27.493817-05
1467	business-hours	{"ts": "2026-07-21T16:06:27.435Z", "updated": 10}	2026-07-21 11:06:27.439527-05
1468	business-hours	{"ts": "2026-07-21T16:11:27.490Z", "updated": 10}	2026-07-21 11:11:27.493879-05
1469	business-hours	{"ts": "2026-07-21T16:16:27.478Z", "updated": 10}	2026-07-21 11:16:27.479757-05
1470	business-hours	{"ts": "2026-07-21T16:21:27.626Z", "updated": 10}	2026-07-21 11:21:27.64323-05
1472	location-history-prune	{"deleted": 0}	2026-07-21 11:28:40.589117-05
1473	business-hours	{"ts": "2026-07-21T16:33:39.457Z", "updated": 10}	2026-07-21 11:33:39.457918-05
1474	business-hours	{"ts": "2026-07-21T16:38:39.502Z", "updated": 10}	2026-07-21 11:38:39.505242-05
1475	business-hours	{"ts": "2026-07-21T16:43:39.501Z", "updated": 10}	2026-07-21 11:43:39.502507-05
1476	business-hours	{"ts": "2026-07-21T16:48:39.505Z", "updated": 10}	2026-07-21 11:48:39.506316-05
1477	business-hours	{"ts": "2026-07-21T16:53:39.582Z", "updated": 10}	2026-07-21 11:53:39.583881-05
1478	location-history-prune	{"deleted": 0}	2026-07-21 11:56:28.707606-05
1479	business-hours	{"ts": "2026-07-21T17:01:27.926Z", "updated": 10}	2026-07-21 12:01:27.930925-05
1480	business-hours	{"ts": "2026-07-21T17:06:27.914Z", "updated": 10}	2026-07-21 12:06:27.917234-05
1481	location-history-prune	{"deleted": 0}	2026-07-21 12:07:32.534737-05
1482	business-hours	{"ts": "2026-07-21T17:12:31.941Z", "updated": 10}	2026-07-21 12:12:31.943642-05
1483	business-hours	{"ts": "2026-07-21T17:17:32.340Z", "updated": 10}	2026-07-21 12:17:32.355355-05
1484	business-hours	{"ts": "2026-07-21T17:22:31.589Z", "updated": 10}	2026-07-21 12:22:31.593586-05
1485	business-hours	{"ts": "2026-07-21T17:27:31.591Z", "updated": 10}	2026-07-21 12:27:31.592568-05
1486	business-hours	{"ts": "2026-07-21T17:32:31.611Z", "updated": 10}	2026-07-21 12:32:31.612142-05
1487	business-hours	{"ts": "2026-07-21T17:37:31.656Z", "updated": 10}	2026-07-21 12:37:31.657561-05
1488	business-hours	{"ts": "2026-07-21T17:42:31.672Z", "updated": 10}	2026-07-21 12:42:31.675459-05
1489	business-hours	{"ts": "2026-07-21T17:47:31.674Z", "updated": 10}	2026-07-21 12:47:31.675765-05
1490	business-hours	{"ts": "2026-07-21T17:52:31.758Z", "updated": 10}	2026-07-21 12:52:31.760146-05
1491	business-hours	{"ts": "2026-07-21T17:57:31.758Z", "updated": 10}	2026-07-21 12:57:31.758732-05
1492	business-hours	{"ts": "2026-07-21T18:02:31.779Z", "updated": 10}	2026-07-21 13:02:31.779894-05
1493	business-hours	{"ts": "2026-07-21T18:07:31.836Z", "updated": 10}	2026-07-21 13:07:31.841146-05
1494	location-history-prune	{"deleted": 0}	2026-07-21 13:11:11.050712-05
1495	business-hours	{"ts": "2026-07-21T18:16:09.740Z", "updated": 10}	2026-07-21 13:16:09.74421-05
1496	business-hours	{"ts": "2026-07-21T18:21:09.822Z", "updated": 10}	2026-07-21 13:21:09.824457-05
1497	business-hours	{"ts": "2026-07-21T18:26:09.739Z", "updated": 10}	2026-07-21 13:26:09.741062-05
1498	location-history-prune	{"deleted": 0}	2026-07-21 13:26:47.011243-05
1499	business-hours	{"ts": "2026-07-21T18:31:45.711Z", "updated": 10}	2026-07-21 13:31:45.711966-05
1500	business-hours	{"ts": "2026-07-21T18:36:45.729Z", "updated": 10}	2026-07-21 13:36:45.731433-05
1501	business-hours	{"ts": "2026-07-21T18:41:45.702Z", "updated": 10}	2026-07-21 13:41:45.703765-05
1502	business-hours	{"ts": "2026-07-21T18:46:45.713Z", "updated": 10}	2026-07-21 13:46:45.715555-05
1503	business-hours	{"ts": "2026-07-21T18:51:45.687Z", "updated": 10}	2026-07-21 13:51:45.688462-05
1504	business-hours	{"ts": "2026-07-21T18:56:45.780Z", "updated": 10}	2026-07-21 13:56:45.782486-05
1505	business-hours	{"ts": "2026-07-21T19:01:45.808Z", "updated": 10}	2026-07-21 14:01:45.809789-05
1506	location-history-prune	{"deleted": 0}	2026-07-21 14:04:39.28227-05
1507	business-hours	{"ts": "2026-07-21T19:09:38.418Z", "updated": 10}	2026-07-21 14:09:38.419036-05
1508	business-hours	{"ts": "2026-07-21T19:14:38.430Z", "updated": 10}	2026-07-21 14:14:38.432207-05
1509	business-hours	{"ts": "2026-07-21T19:19:38.560Z", "updated": 10}	2026-07-21 14:19:38.563148-05
1510	business-hours	{"ts": "2026-07-21T19:24:38.419Z", "updated": 10}	2026-07-21 14:24:38.420473-05
1511	business-hours	{"ts": "2026-07-21T19:29:38.500Z", "updated": 10}	2026-07-21 14:29:38.503494-05
1512	business-hours	{"ts": "2026-07-21T19:34:38.501Z", "updated": 10}	2026-07-21 14:34:38.502214-05
1513	business-hours	{"ts": "2026-07-21T19:39:38.501Z", "updated": 10}	2026-07-21 14:39:38.502739-05
1514	business-hours	{"ts": "2026-07-21T19:44:38.495Z", "updated": 10}	2026-07-21 14:44:38.495812-05
1515	business-hours	{"ts": "2026-07-21T19:49:38.520Z", "updated": 10}	2026-07-21 14:49:38.523521-05
1516	business-hours	{"ts": "2026-07-21T19:54:38.570Z", "updated": 10}	2026-07-21 14:54:38.5707-05
1517	business-hours	{"ts": "2026-07-21T19:59:38.571Z", "updated": 10}	2026-07-21 14:59:38.572657-05
1518	business-hours	{"ts": "2026-07-21T20:04:38.567Z", "updated": 10}	2026-07-21 15:04:38.571372-05
1519	business-hours	{"ts": "2026-07-21T20:09:38.573Z", "updated": 10}	2026-07-21 15:09:38.574909-05
1520	business-hours	{"ts": "2026-07-21T20:14:38.737Z", "updated": 10}	2026-07-21 15:14:38.738432-05
1521	business-hours	{"ts": "2026-07-21T20:19:38.718Z", "updated": 10}	2026-07-21 15:19:38.720624-05
1522	business-hours	{"ts": "2026-07-21T20:24:38.681Z", "updated": 10}	2026-07-21 15:24:38.6838-05
1523	business-hours	{"ts": "2026-07-21T20:29:38.666Z", "updated": 10}	2026-07-21 15:29:38.666968-05
1524	business-hours	{"ts": "2026-07-21T20:34:38.738Z", "updated": 10}	2026-07-21 15:34:38.741032-05
1525	business-hours	{"ts": "2026-07-21T20:39:38.732Z", "updated": 10}	2026-07-21 15:39:38.73346-05
1526	business-hours	{"ts": "2026-07-21T20:44:38.767Z", "updated": 10}	2026-07-21 15:44:38.76875-05
1527	business-hours	{"ts": "2026-07-21T20:49:38.793Z", "updated": 10}	2026-07-21 15:49:38.796136-05
1528	business-hours	{"ts": "2026-07-21T20:54:38.806Z", "updated": 10}	2026-07-21 15:54:38.806876-05
1529	business-hours	{"ts": "2026-07-21T20:59:38.848Z", "updated": 10}	2026-07-21 15:59:38.849793-05
1530	business-hours	{"ts": "2026-07-21T21:04:38.860Z", "updated": 10}	2026-07-21 16:04:38.860943-05
1531	business-hours	{"ts": "2026-07-21T21:09:38.913Z", "updated": 10}	2026-07-21 16:09:38.913998-05
1532	business-hours	{"ts": "2026-07-21T21:14:38.919Z", "updated": 10}	2026-07-21 16:14:38.920781-05
1533	business-hours	{"ts": "2026-07-21T21:19:39.120Z", "updated": 10}	2026-07-21 16:19:39.12411-05
1534	business-hours	{"ts": "2026-07-21T21:24:38.954Z", "updated": 10}	2026-07-21 16:24:38.955734-05
1535	business-hours	{"ts": "2026-07-21T21:29:38.994Z", "updated": 10}	2026-07-21 16:29:38.996057-05
1536	location-history-prune	{"deleted": 0}	2026-07-21 16:33:13.097749-05
1537	business-hours	{"ts": "2026-07-21T21:38:12.189Z", "updated": 10}	2026-07-21 16:38:12.191003-05
1538	business-hours	{"ts": "2026-07-21T21:43:12.204Z", "updated": 10}	2026-07-21 16:43:12.209173-05
1539	location-history-prune	{"deleted": 0}	2026-07-21 16:45:44.420935-05
1540	business-hours	{"ts": "2026-07-21T21:50:43.574Z", "updated": 10}	2026-07-21 16:50:43.575569-05
1541	business-hours	{"ts": "2026-07-21T21:55:43.620Z", "updated": 10}	2026-07-21 16:55:43.621468-05
1542	business-hours	{"ts": "2026-07-21T22:00:43.614Z", "updated": 10}	2026-07-21 17:00:43.6163-05
1543	business-hours	{"ts": "2026-07-21T22:05:43.625Z", "updated": 10}	2026-07-21 17:05:43.627276-05
1544	location-history-prune	{"deleted": 0}	2026-07-21 17:06:49.317783-05
1545	business-hours	{"ts": "2026-07-21T22:11:48.441Z", "updated": 10}	2026-07-21 17:11:48.443198-05
1546	business-hours	{"ts": "2026-07-21T22:16:48.435Z", "updated": 10}	2026-07-21 17:16:48.436075-05
1547	business-hours	{"ts": "2026-07-21T22:21:48.424Z", "updated": 10}	2026-07-21 17:21:48.425383-05
1548	business-hours	{"ts": "2026-07-21T22:26:48.445Z", "updated": 10}	2026-07-21 17:26:48.44667-05
1549	location-history-prune	{"deleted": 0}	2026-07-21 17:29:54.667072-05
1550	business-hours	{"ts": "2026-07-21T22:34:53.928Z", "updated": 10}	2026-07-21 17:34:53.940456-05
1551	business-hours	{"ts": "2026-07-21T22:39:53.922Z", "updated": 10}	2026-07-21 17:39:53.923216-05
1552	business-hours	{"ts": "2026-07-21T22:44:53.938Z", "updated": 10}	2026-07-21 17:44:53.939073-05
1553	location-history-prune	{"deleted": 0}	2026-07-21 17:48:19.851321-05
1554	business-hours	{"ts": "2026-07-21T22:53:18.988Z", "updated": 10}	2026-07-21 17:53:18.989018-05
1555	business-hours	{"ts": "2026-07-21T22:58:18.978Z", "updated": 10}	2026-07-21 17:58:18.979113-05
1556	business-hours	{"ts": "2026-07-21T23:03:18.980Z", "updated": 10}	2026-07-21 18:03:18.981001-05
1557	business-hours	{"ts": "2026-07-21T23:08:18.979Z", "updated": 10}	2026-07-21 18:08:18.980328-05
1558	business-hours	{"ts": "2026-07-21T23:13:19.006Z", "updated": 10}	2026-07-21 18:13:19.007497-05
1559	business-hours	{"ts": "2026-07-21T23:18:19.031Z", "updated": 10}	2026-07-21 18:18:19.032166-05
1560	location-history-prune	{"deleted": 0}	2026-07-21 18:18:47.36653-05
1561	business-hours	{"ts": "2026-07-21T23:23:45.785Z", "updated": 10}	2026-07-21 18:23:45.785945-05
1562	business-hours	{"ts": "2026-07-21T23:28:45.783Z", "updated": 10}	2026-07-21 18:28:45.78377-05
1563	business-hours	{"ts": "2026-07-21T23:33:45.793Z", "updated": 10}	2026-07-21 18:33:45.794437-05
1564	location-history-prune	{"deleted": 0}	2026-07-21 18:38:10.766316-05
1565	location-history-prune	{"deleted": 0}	2026-07-21 18:43:06.554339-05
1566	business-hours	{"ts": "2026-07-21T23:48:05.566Z", "updated": 10}	2026-07-21 18:48:05.566646-05
1567	business-hours	{"ts": "2026-07-21T23:53:05.667Z", "updated": 10}	2026-07-21 18:53:05.669165-05
1568	business-hours	{"ts": "2026-07-21T23:58:05.576Z", "updated": 10}	2026-07-21 18:58:05.577235-05
1569	business-hours	{"ts": "2026-07-22T00:03:05.604Z", "updated": 10}	2026-07-21 19:03:05.605461-05
1570	business-hours	{"ts": "2026-07-22T00:08:05.585Z", "updated": 10}	2026-07-21 19:08:05.586937-05
1571	business-hours	{"ts": "2026-07-22T00:13:05.573Z", "updated": 10}	2026-07-21 19:13:05.574393-05
1572	business-hours	{"ts": "2026-07-22T00:18:05.733Z", "updated": 10}	2026-07-21 19:18:05.734263-05
1573	business-hours	{"ts": "2026-07-22T00:23:05.647Z", "updated": 10}	2026-07-21 19:23:05.649997-05
1574	business-hours	{"ts": "2026-07-22T00:28:05.680Z", "updated": 10}	2026-07-21 19:28:05.688361-05
1575	business-hours	{"ts": "2026-07-22T00:33:05.663Z", "updated": 10}	2026-07-21 19:33:05.664709-05
1576	location-history-prune	{"deleted": 0}	2026-07-21 19:36:59.278247-05
1577	business-hours	{"ts": "2026-07-22T00:41:58.521Z", "updated": 10}	2026-07-21 19:41:58.523255-05
1578	business-hours	{"ts": "2026-07-22T00:46:58.463Z", "updated": 10}	2026-07-21 19:46:58.464881-05
1579	business-hours	{"ts": "2026-07-22T00:51:58.441Z", "updated": 10}	2026-07-21 19:51:58.441925-05
1580	business-hours	{"ts": "2026-07-22T00:56:58.438Z", "updated": 10}	2026-07-21 19:56:58.439034-05
1581	business-hours	{"ts": "2026-07-22T01:01:58.463Z", "updated": 10}	2026-07-21 20:01:58.464261-05
1582	business-hours	{"ts": "2026-07-22T01:06:58.501Z", "updated": 10}	2026-07-21 20:06:58.50147-05
1583	business-hours	{"ts": "2026-07-22T01:11:58.504Z", "updated": 10}	2026-07-21 20:11:58.505347-05
1584	business-hours	{"ts": "2026-07-22T01:16:58.472Z", "updated": 10}	2026-07-21 20:16:58.47426-05
1585	business-hours	{"ts": "2026-07-22T01:21:58.571Z", "updated": 10}	2026-07-21 20:21:58.58295-05
1586	business-hours	{"ts": "2026-07-22T01:26:58.514Z", "updated": 10}	2026-07-21 20:26:58.516052-05
1587	business-hours	{"ts": "2026-07-22T01:31:58.783Z", "updated": 10}	2026-07-21 20:31:58.783802-05
1588	business-hours	{"ts": "2026-07-22T01:36:58.552Z", "updated": 10}	2026-07-21 20:36:58.552796-05
1589	business-hours	{"ts": "2026-07-22T01:41:58.571Z", "updated": 10}	2026-07-21 20:41:58.572538-05
1590	business-hours	{"ts": "2026-07-22T01:46:58.592Z", "updated": 10}	2026-07-21 20:46:58.594062-05
1591	business-hours	{"ts": "2026-07-22T01:51:58.597Z", "updated": 10}	2026-07-21 20:51:58.597902-05
1592	business-hours	{"ts": "2026-07-22T01:56:58.600Z", "updated": 10}	2026-07-21 20:56:58.60137-05
1593	business-hours	{"ts": "2026-07-22T02:01:58.629Z", "updated": 10}	2026-07-21 21:01:58.632195-05
1594	business-hours	{"ts": "2026-07-22T02:06:58.671Z", "updated": 10}	2026-07-21 21:06:58.672239-05
1595	business-hours	{"ts": "2026-07-22T02:11:58.670Z", "updated": 10}	2026-07-21 21:11:58.67111-05
1596	business-hours	{"ts": "2026-07-22T02:16:58.742Z", "updated": 10}	2026-07-21 21:16:58.744054-05
1597	business-hours	{"ts": "2026-07-22T02:21:58.702Z", "updated": 10}	2026-07-21 21:21:58.703754-05
1598	business-hours	{"ts": "2026-07-22T02:26:58.738Z", "updated": 10}	2026-07-21 21:26:58.739376-05
1599	business-hours	{"ts": "2026-07-22T02:31:58.792Z", "updated": 10}	2026-07-21 21:31:58.793517-05
1600	business-hours	{"ts": "2026-07-22T02:36:58.793Z", "updated": 10}	2026-07-21 21:36:58.793991-05
1601	business-hours	{"ts": "2026-07-22T02:41:58.782Z", "updated": 10}	2026-07-21 21:41:58.784818-05
1602	business-hours	{"ts": "2026-07-22T02:46:58.860Z", "updated": 10}	2026-07-21 21:46:58.867291-05
1603	business-hours	{"ts": "2026-07-22T02:51:58.862Z", "updated": 10}	2026-07-21 21:51:58.863018-05
1604	business-hours	{"ts": "2026-07-22T02:56:58.876Z", "updated": 10}	2026-07-21 21:56:58.877698-05
1605	business-hours	{"ts": "2026-07-22T03:01:58.899Z", "updated": 10}	2026-07-21 22:01:58.903615-05
1606	business-hours	{"ts": "2026-07-22T03:06:58.876Z", "updated": 10}	2026-07-21 22:06:58.877617-05
1607	business-hours	{"ts": "2026-07-22T03:11:58.939Z", "updated": 10}	2026-07-21 22:11:58.940122-05
1608	business-hours	{"ts": "2026-07-22T03:16:58.957Z", "updated": 10}	2026-07-21 22:16:58.95857-05
1609	business-hours	{"ts": "2026-07-22T03:21:58.951Z", "updated": 10}	2026-07-21 22:21:58.951836-05
1610	business-hours	{"ts": "2026-07-22T03:26:58.994Z", "updated": 10}	2026-07-21 22:26:58.995562-05
1611	business-hours	{"ts": "2026-07-22T03:31:59.004Z", "updated": 10}	2026-07-21 22:31:59.00563-05
1612	business-hours	{"ts": "2026-07-22T03:36:59.021Z", "updated": 10}	2026-07-21 22:36:59.021661-05
1613	business-hours	{"ts": "2026-07-22T03:41:59.099Z", "updated": 10}	2026-07-21 22:41:59.100311-05
1614	business-hours	{"ts": "2026-07-22T03:46:59.062Z", "updated": 10}	2026-07-21 22:46:59.063534-05
1615	business-hours	{"ts": "2026-07-22T03:51:59.103Z", "updated": 10}	2026-07-21 22:51:59.104853-05
1616	business-hours	{"ts": "2026-07-22T03:56:59.088Z", "updated": 10}	2026-07-21 22:56:59.088933-05
1617	business-hours	{"ts": "2026-07-22T04:01:59.095Z", "updated": 10}	2026-07-21 23:01:59.097495-05
1618	business-hours	{"ts": "2026-07-22T04:06:59.161Z", "updated": 10}	2026-07-21 23:06:59.161943-05
1619	business-hours	{"ts": "2026-07-22T04:11:59.170Z", "updated": 10}	2026-07-21 23:11:59.171438-05
1620	business-hours	{"ts": "2026-07-22T04:16:59.243Z", "updated": 10}	2026-07-21 23:16:59.244341-05
1621	business-hours	{"ts": "2026-07-22T04:21:59.201Z", "updated": 10}	2026-07-21 23:21:59.201791-05
1622	business-hours	{"ts": "2026-07-22T04:26:59.221Z", "updated": 10}	2026-07-21 23:26:59.22325-05
1623	business-hours	{"ts": "2026-07-22T04:31:59.266Z", "updated": 10}	2026-07-21 23:31:59.267256-05
1624	business-hours	{"ts": "2026-07-22T04:36:59.270Z", "updated": 10}	2026-07-21 23:36:59.276335-05
1625	business-hours	{"ts": "2026-07-22T04:41:59.385Z", "updated": 10}	2026-07-21 23:41:59.388473-05
1626	business-hours	{"ts": "2026-07-22T04:46:59.364Z", "updated": 10}	2026-07-21 23:46:59.36607-05
1627	business-hours	{"ts": "2026-07-22T04:51:59.328Z", "updated": 10}	2026-07-21 23:51:59.335771-05
1628	business-hours	{"ts": "2026-07-22T04:56:59.370Z", "updated": 10}	2026-07-21 23:56:59.37141-05
1629	business-hours	{"ts": "2026-07-22T05:01:59.373Z", "updated": 10}	2026-07-22 00:01:59.375242-05
1630	business-hours	{"ts": "2026-07-22T05:06:59.377Z", "updated": 10}	2026-07-22 00:06:59.378165-05
1631	business-hours	{"ts": "2026-07-22T05:11:59.407Z", "updated": 10}	2026-07-22 00:11:59.407963-05
1632	business-hours	{"ts": "2026-07-22T05:16:59.416Z", "updated": 10}	2026-07-22 00:16:59.418251-05
1633	business-hours	{"ts": "2026-07-22T05:21:59.411Z", "updated": 10}	2026-07-22 00:21:59.411697-05
1634	business-hours	{"ts": "2026-07-22T05:26:59.443Z", "updated": 10}	2026-07-22 00:26:59.445222-05
1635	business-hours	{"ts": "2026-07-22T05:31:59.471Z", "updated": 10}	2026-07-22 00:31:59.472013-05
1636	business-hours	{"ts": "2026-07-22T05:36:59.436Z", "updated": 10}	2026-07-22 00:36:59.438397-05
1637	business-hours	{"ts": "2026-07-22T05:41:59.459Z", "updated": 10}	2026-07-22 00:41:59.460718-05
1638	business-hours	{"ts": "2026-07-22T05:46:59.610Z", "updated": 10}	2026-07-22 00:46:59.617946-05
1639	business-hours	{"ts": "2026-07-22T05:51:59.495Z", "updated": 10}	2026-07-22 00:51:59.495958-05
1640	business-hours	{"ts": "2026-07-22T05:56:59.470Z", "updated": 10}	2026-07-22 00:56:59.470666-05
1641	business-hours	{"ts": "2026-07-22T06:01:59.502Z", "updated": 10}	2026-07-22 01:01:59.504049-05
1642	business-hours	{"ts": "2026-07-22T06:06:59.521Z", "updated": 10}	2026-07-22 01:06:59.522794-05
1643	business-hours	{"ts": "2026-07-22T06:11:59.513Z", "updated": 10}	2026-07-22 01:11:59.51449-05
1644	business-hours	{"ts": "2026-07-22T06:16:59.556Z", "updated": 10}	2026-07-22 01:16:59.557936-05
1645	business-hours	{"ts": "2026-07-22T06:21:59.571Z", "updated": 10}	2026-07-22 01:21:59.571698-05
1646	business-hours	{"ts": "2026-07-22T06:26:59.608Z", "updated": 10}	2026-07-22 01:26:59.609642-05
1647	business-hours	{"ts": "2026-07-22T06:31:59.638Z", "updated": 10}	2026-07-22 01:31:59.639329-05
1648	business-hours	{"ts": "2026-07-22T06:36:59.575Z", "updated": 10}	2026-07-22 01:36:59.576833-05
1649	business-hours	{"ts": "2026-07-22T06:41:59.605Z", "updated": 10}	2026-07-22 01:41:59.606454-05
1650	business-hours	{"ts": "2026-07-22T06:46:59.618Z", "updated": 10}	2026-07-22 01:46:59.620162-05
1651	business-hours	{"ts": "2026-07-22T06:51:59.676Z", "updated": 10}	2026-07-22 01:51:59.677479-05
1652	business-hours	{"ts": "2026-07-22T06:56:59.660Z", "updated": 10}	2026-07-22 01:56:59.661855-05
1653	business-hours	{"ts": "2026-07-22T07:01:59.657Z", "updated": 10}	2026-07-22 02:01:59.65789-05
1654	business-hours	{"ts": "2026-07-22T07:06:59.684Z", "updated": 10}	2026-07-22 02:06:59.685586-05
1655	business-hours	{"ts": "2026-07-22T07:11:59.673Z", "updated": 10}	2026-07-22 02:11:59.673725-05
1656	business-hours	{"ts": "2026-07-22T07:16:59.706Z", "updated": 10}	2026-07-22 02:16:59.707236-05
1657	business-hours	{"ts": "2026-07-22T07:21:59.707Z", "updated": 10}	2026-07-22 02:21:59.709769-05
1658	business-hours	{"ts": "2026-07-22T07:26:59.749Z", "updated": 10}	2026-07-22 02:26:59.752393-05
1659	business-hours	{"ts": "2026-07-22T07:31:59.765Z", "updated": 10}	2026-07-22 02:31:59.766189-05
1660	business-hours	{"ts": "2026-07-22T07:36:59.760Z", "updated": 10}	2026-07-22 02:36:59.760929-05
1661	business-hours	{"ts": "2026-07-22T07:41:59.785Z", "updated": 10}	2026-07-22 02:41:59.78682-05
1662	business-hours	{"ts": "2026-07-22T07:46:59.801Z", "updated": 10}	2026-07-22 02:46:59.80182-05
1663	business-hours	{"ts": "2026-07-22T07:51:59.847Z", "updated": 10}	2026-07-22 02:51:59.848709-05
1664	business-hours	{"ts": "2026-07-22T07:56:59.850Z", "updated": 10}	2026-07-22 02:56:59.850779-05
1665	business-hours	{"ts": "2026-07-22T08:01:59.843Z", "updated": 10}	2026-07-22 03:01:59.84505-05
1666	business-hours	{"ts": "2026-07-22T08:06:59.865Z", "updated": 10}	2026-07-22 03:06:59.867792-05
1667	business-hours	{"ts": "2026-07-22T08:11:59.877Z", "updated": 10}	2026-07-22 03:11:59.878038-05
1668	business-hours	{"ts": "2026-07-22T08:16:59.869Z", "updated": 10}	2026-07-22 03:16:59.870411-05
1669	business-hours	{"ts": "2026-07-22T08:21:59.916Z", "updated": 10}	2026-07-22 03:21:59.917971-05
1670	business-hours	{"ts": "2026-07-22T08:26:59.918Z", "updated": 10}	2026-07-22 03:26:59.919271-05
2068	location-history-prune	{"deleted": 0}	2026-07-23 11:33:31.393336-05
1671	business-hours	{"ts": "2026-07-22T08:31:59.911Z", "updated": 10}	2026-07-22 03:31:59.912093-05
1672	business-hours	{"ts": "2026-07-22T08:36:59.907Z", "updated": 10}	2026-07-22 03:36:59.909369-05
1673	business-hours	{"ts": "2026-07-22T08:42:00.015Z", "updated": 10}	2026-07-22 03:42:00.022404-05
1674	business-hours	{"ts": "2026-07-22T08:46:59.955Z", "updated": 10}	2026-07-22 03:46:59.959826-05
1675	business-hours	{"ts": "2026-07-22T08:51:59.977Z", "updated": 10}	2026-07-22 03:51:59.978546-05
1676	business-hours	{"ts": "2026-07-22T08:56:59.965Z", "updated": 10}	2026-07-22 03:56:59.966136-05
1677	business-hours	{"ts": "2026-07-22T09:01:59.990Z", "updated": 10}	2026-07-22 04:01:59.990745-05
1678	business-hours	{"ts": "2026-07-22T09:06:59.992Z", "updated": 10}	2026-07-22 04:06:59.99306-05
1679	business-hours	{"ts": "2026-07-22T09:12:00.037Z", "updated": 10}	2026-07-22 04:12:00.038047-05
1680	business-hours	{"ts": "2026-07-22T09:17:00.216Z", "updated": 10}	2026-07-22 04:17:00.225318-05
1681	business-hours	{"ts": "2026-07-22T09:22:00.449Z", "updated": 10}	2026-07-22 04:22:00.450319-05
1682	business-hours	{"ts": "2026-07-22T09:27:00.100Z", "updated": 10}	2026-07-22 04:27:00.101495-05
1683	business-hours	{"ts": "2026-07-22T09:32:00.150Z", "updated": 10}	2026-07-22 04:32:00.151012-05
1684	business-hours	{"ts": "2026-07-22T09:37:00.087Z", "updated": 10}	2026-07-22 04:37:00.092195-05
1685	business-hours	{"ts": "2026-07-22T09:42:00.057Z", "updated": 10}	2026-07-22 04:42:00.058389-05
1686	business-hours	{"ts": "2026-07-22T09:47:00.119Z", "updated": 10}	2026-07-22 04:47:00.12275-05
1687	business-hours	{"ts": "2026-07-22T09:52:00.087Z", "updated": 10}	2026-07-22 04:52:00.089425-05
1688	business-hours	{"ts": "2026-07-22T09:57:00.169Z", "updated": 10}	2026-07-22 04:57:00.174233-05
1689	business-hours	{"ts": "2026-07-22T10:02:00.134Z", "updated": 10}	2026-07-22 05:02:00.137932-05
1690	business-hours	{"ts": "2026-07-22T10:07:00.120Z", "updated": 10}	2026-07-22 05:07:00.121634-05
1691	business-hours	{"ts": "2026-07-22T10:12:00.118Z", "updated": 10}	2026-07-22 05:12:00.118876-05
1692	business-hours	{"ts": "2026-07-22T10:17:00.088Z", "updated": 10}	2026-07-22 05:17:00.091124-05
1693	business-hours	{"ts": "2026-07-22T10:22:00.163Z", "updated": 10}	2026-07-22 05:22:00.165013-05
1694	business-hours	{"ts": "2026-07-22T10:27:00.150Z", "updated": 10}	2026-07-22 05:27:00.151313-05
1695	business-hours	{"ts": "2026-07-22T10:32:00.200Z", "updated": 10}	2026-07-22 05:32:00.204154-05
1696	business-hours	{"ts": "2026-07-22T10:37:00.171Z", "updated": 10}	2026-07-22 05:37:00.172697-05
1697	business-hours	{"ts": "2026-07-22T10:42:00.188Z", "updated": 10}	2026-07-22 05:42:00.18874-05
1698	business-hours	{"ts": "2026-07-22T10:47:00.510Z", "updated": 10}	2026-07-22 05:47:00.524448-05
1699	business-hours	{"ts": "2026-07-22T10:52:00.258Z", "updated": 10}	2026-07-22 05:52:00.260741-05
1700	business-hours	{"ts": "2026-07-22T10:57:00.677Z", "updated": 10}	2026-07-22 05:57:00.682111-05
1701	business-hours	{"ts": "2026-07-22T11:02:00.207Z", "updated": 10}	2026-07-22 06:02:00.208641-05
1702	business-hours	{"ts": "2026-07-22T11:07:00.269Z", "updated": 10}	2026-07-22 06:07:00.271144-05
1703	business-hours	{"ts": "2026-07-22T11:12:00.283Z", "updated": 10}	2026-07-22 06:12:00.287422-05
1704	business-hours	{"ts": "2026-07-22T11:17:00.484Z", "updated": 10}	2026-07-22 06:17:00.48524-05
1705	business-hours	{"ts": "2026-07-22T11:22:00.289Z", "updated": 10}	2026-07-22 06:22:00.290327-05
1706	business-hours	{"ts": "2026-07-22T11:27:00.263Z", "updated": 10}	2026-07-22 06:27:00.263962-05
1707	business-hours	{"ts": "2026-07-22T11:32:00.278Z", "updated": 10}	2026-07-22 06:32:00.280424-05
1708	business-hours	{"ts": "2026-07-22T11:37:00.522Z", "updated": 10}	2026-07-22 06:37:00.526818-05
1709	business-hours	{"ts": "2026-07-22T11:42:00.457Z", "updated": 10}	2026-07-22 06:42:00.492567-05
1710	business-hours	{"ts": "2026-07-22T11:47:00.738Z", "updated": 10}	2026-07-22 06:47:00.742677-05
1711	business-hours	{"ts": "2026-07-22T11:52:00.283Z", "updated": 10}	2026-07-22 06:52:00.287098-05
1712	business-hours	{"ts": "2026-07-22T11:57:00.319Z", "updated": 10}	2026-07-22 06:57:00.321582-05
1713	business-hours	{"ts": "2026-07-22T12:02:00.336Z", "updated": 10}	2026-07-22 07:02:00.339416-05
1714	business-hours	{"ts": "2026-07-22T12:07:00.876Z", "updated": 10}	2026-07-22 07:07:00.892215-05
1715	business-hours	{"ts": "2026-07-22T12:12:00.379Z", "updated": 10}	2026-07-22 07:12:00.384568-05
1716	business-hours	{"ts": "2026-07-22T12:17:00.365Z", "updated": 10}	2026-07-22 07:17:00.368015-05
1717	business-hours	{"ts": "2026-07-22T12:22:00.698Z", "updated": 10}	2026-07-22 07:22:00.69962-05
1718	business-hours	{"ts": "2026-07-22T12:27:00.447Z", "updated": 10}	2026-07-22 07:27:00.451332-05
1719	business-hours	{"ts": "2026-07-22T12:32:00.477Z", "updated": 10}	2026-07-22 07:32:00.479503-05
1720	business-hours	{"ts": "2026-07-22T12:37:00.845Z", "updated": 10}	2026-07-22 07:37:00.846259-05
1721	business-hours	{"ts": "2026-07-22T12:42:00.459Z", "updated": 10}	2026-07-22 07:42:00.460204-05
1722	business-hours	{"ts": "2026-07-22T12:47:00.415Z", "updated": 10}	2026-07-22 07:47:00.426589-05
1723	business-hours	{"ts": "2026-07-22T12:52:00.473Z", "updated": 10}	2026-07-22 07:52:00.474239-05
1724	business-hours	{"ts": "2026-07-22T12:57:00.422Z", "updated": 10}	2026-07-22 07:57:00.423556-05
1725	business-hours	{"ts": "2026-07-22T13:02:00.423Z", "updated": 10}	2026-07-22 08:02:00.425783-05
1726	business-hours	{"ts": "2026-07-22T13:07:00.444Z", "updated": 10}	2026-07-22 08:07:00.448101-05
1727	business-hours	{"ts": "2026-07-22T13:12:00.747Z", "updated": 10}	2026-07-22 08:12:00.760486-05
1728	business-hours	{"ts": "2026-07-22T13:17:00.464Z", "updated": 10}	2026-07-22 08:17:00.465577-05
1729	business-hours	{"ts": "2026-07-22T13:22:00.546Z", "updated": 10}	2026-07-22 08:22:00.547583-05
1730	business-hours	{"ts": "2026-07-22T13:27:00.541Z", "updated": 10}	2026-07-22 08:27:00.542613-05
1731	business-hours	{"ts": "2026-07-22T13:32:00.476Z", "updated": 10}	2026-07-22 08:32:00.481506-05
1732	business-hours	{"ts": "2026-07-22T13:37:00.535Z", "updated": 10}	2026-07-22 08:37:00.535921-05
1733	business-hours	{"ts": "2026-07-22T13:42:00.497Z", "updated": 10}	2026-07-22 08:42:00.500666-05
1734	business-hours	{"ts": "2026-07-22T13:47:00.655Z", "updated": 10}	2026-07-22 08:47:00.657865-05
1735	location-history-prune	{"deleted": 0}	2026-07-22 08:48:53.661204-05
1736	business-hours	{"ts": "2026-07-22T13:53:52.744Z", "updated": 10}	2026-07-22 08:53:52.747999-05
1737	business-hours	{"ts": "2026-07-22T13:58:52.732Z", "updated": 10}	2026-07-22 08:58:52.733459-05
1738	business-hours	{"ts": "2026-07-22T14:03:52.721Z", "updated": 10}	2026-07-22 09:03:52.722493-05
1739	business-hours	{"ts": "2026-07-22T14:08:52.790Z", "updated": 10}	2026-07-22 09:08:52.790853-05
1740	business-hours	{"ts": "2026-07-22T14:13:52.748Z", "updated": 10}	2026-07-22 09:13:52.749368-05
1741	business-hours	{"ts": "2026-07-22T14:18:52.750Z", "updated": 10}	2026-07-22 09:18:52.750989-05
1742	business-hours	{"ts": "2026-07-22T14:23:52.803Z", "updated": 10}	2026-07-22 09:23:52.805386-05
1743	business-hours	{"ts": "2026-07-22T14:28:52.804Z", "updated": 10}	2026-07-22 09:28:52.805773-05
1744	location-history-prune	{"deleted": 0}	2026-07-22 09:31:13.883452-05
1745	business-hours	{"ts": "2026-07-22T14:36:12.546Z", "updated": 10}	2026-07-22 09:36:12.549215-05
1746	business-hours	{"ts": "2026-07-22T14:41:12.520Z", "updated": 10}	2026-07-22 09:41:12.527756-05
1747	business-hours	{"ts": "2026-07-22T14:46:12.530Z", "updated": 10}	2026-07-22 09:46:12.532402-05
1748	business-hours	{"ts": "2026-07-22T14:51:12.515Z", "updated": 10}	2026-07-22 09:51:12.516196-05
1749	business-hours	{"ts": "2026-07-22T14:56:12.672Z", "updated": 10}	2026-07-22 09:56:12.674963-05
1750	location-history-prune	{"deleted": 0}	2026-07-22 09:58:05.901709-05
1751	business-hours	{"ts": "2026-07-22T15:03:05.303Z", "updated": 10}	2026-07-22 10:03:05.309263-05
1752	location-history-prune	{"deleted": 0}	2026-07-22 10:04:33.101961-05
1753	location-history-prune	{"deleted": 0}	2026-07-22 10:08:02.520376-05
1754	business-hours	{"ts": "2026-07-22T15:13:00.792Z", "updated": 10}	2026-07-22 10:13:00.795778-05
1755	business-hours	{"ts": "2026-07-22T15:18:01.095Z", "updated": 10}	2026-07-22 10:18:01.099737-05
1756	business-hours	{"ts": "2026-07-22T15:23:00.883Z", "updated": 10}	2026-07-22 10:23:00.885162-05
1757	business-hours	{"ts": "2026-07-22T15:28:00.997Z", "updated": 10}	2026-07-22 10:28:00.997771-05
1758	business-hours	{"ts": "2026-07-22T15:33:00.863Z", "updated": 10}	2026-07-22 10:33:00.866061-05
1759	business-hours	{"ts": "2026-07-22T15:38:00.840Z", "updated": 10}	2026-07-22 10:38:00.843052-05
1760	business-hours	{"ts": "2026-07-22T15:43:00.998Z", "updated": 10}	2026-07-22 10:43:00.999661-05
1761	business-hours	{"ts": "2026-07-22T15:48:01.001Z", "updated": 10}	2026-07-22 10:48:01.003075-05
1762	business-hours	{"ts": "2026-07-22T15:53:01.007Z", "updated": 10}	2026-07-22 10:53:01.008229-05
1763	location-history-prune	{"deleted": 0}	2026-07-22 10:55:00.346349-05
1764	business-hours	{"ts": "2026-07-22T15:59:59.328Z", "updated": 10}	2026-07-22 10:59:59.329255-05
1765	business-hours	{"ts": "2026-07-22T16:04:59.348Z", "updated": 10}	2026-07-22 11:04:59.356411-05
1766	business-hours	{"ts": "2026-07-22T16:09:59.297Z", "updated": 10}	2026-07-22 11:09:59.297921-05
1767	business-hours	{"ts": "2026-07-22T16:14:59.304Z", "updated": 10}	2026-07-22 11:14:59.305261-05
1768	business-hours	{"ts": "2026-07-22T16:19:59.438Z", "updated": 10}	2026-07-22 11:19:59.44049-05
1769	business-hours	{"ts": "2026-07-22T16:24:59.348Z", "updated": 10}	2026-07-22 11:24:59.349544-05
1770	business-hours	{"ts": "2026-07-22T16:29:59.365Z", "updated": 10}	2026-07-22 11:29:59.366445-05
1771	business-hours	{"ts": "2026-07-22T16:34:59.385Z", "updated": 10}	2026-07-22 11:34:59.386694-05
1772	business-hours	{"ts": "2026-07-22T16:39:59.403Z", "updated": 10}	2026-07-22 11:39:59.403811-05
1773	business-hours	{"ts": "2026-07-22T16:44:59.446Z", "updated": 10}	2026-07-22 11:44:59.458627-05
1774	business-hours	{"ts": "2026-07-22T16:49:59.495Z", "updated": 10}	2026-07-22 11:49:59.495529-05
1775	business-hours	{"ts": "2026-07-22T16:54:59.506Z", "updated": 10}	2026-07-22 11:54:59.510762-05
1776	business-hours	{"ts": "2026-07-22T16:59:59.491Z", "updated": 10}	2026-07-22 11:59:59.492533-05
1777	business-hours	{"ts": "2026-07-22T17:04:59.530Z", "updated": 10}	2026-07-22 12:04:59.532478-05
1778	business-hours	{"ts": "2026-07-22T17:09:59.534Z", "updated": 10}	2026-07-22 12:09:59.540975-05
1779	business-hours	{"ts": "2026-07-22T17:14:59.597Z", "updated": 10}	2026-07-22 12:14:59.600048-05
1780	business-hours	{"ts": "2026-07-22T17:19:59.567Z", "updated": 10}	2026-07-22 12:19:59.568381-05
1781	business-hours	{"ts": "2026-07-22T17:24:59.597Z", "updated": 10}	2026-07-22 12:24:59.59833-05
1782	business-hours	{"ts": "2026-07-22T17:29:59.646Z", "updated": 10}	2026-07-22 12:29:59.652361-05
1783	business-hours	{"ts": "2026-07-22T17:34:59.646Z", "updated": 10}	2026-07-22 12:34:59.649259-05
1784	business-hours	{"ts": "2026-07-22T17:39:59.710Z", "updated": 10}	2026-07-22 12:39:59.710833-05
1785	business-hours	{"ts": "2026-07-22T17:44:59.707Z", "updated": 10}	2026-07-22 12:44:59.708153-05
1786	business-hours	{"ts": "2026-07-22T17:49:59.707Z", "updated": 10}	2026-07-22 12:49:59.70841-05
1787	business-hours	{"ts": "2026-07-22T17:54:59.776Z", "updated": 10}	2026-07-22 12:54:59.777149-05
1788	business-hours	{"ts": "2026-07-22T17:59:59.744Z", "updated": 10}	2026-07-22 12:59:59.746194-05
1789	business-hours	{"ts": "2026-07-22T18:04:59.794Z", "updated": 10}	2026-07-22 13:04:59.79744-05
1790	business-hours	{"ts": "2026-07-22T18:09:59.814Z", "updated": 10}	2026-07-22 13:09:59.815429-05
1791	business-hours	{"ts": "2026-07-22T18:14:59.851Z", "updated": 10}	2026-07-22 13:14:59.851881-05
1792	business-hours	{"ts": "2026-07-22T18:19:59.854Z", "updated": 10}	2026-07-22 13:19:59.854811-05
1793	location-history-prune	{"deleted": 0}	2026-07-22 13:22:23.360604-05
1794	location-history-prune	{"deleted": 0}	2026-07-22 13:23:04.656575-05
1795	location-history-prune	{"deleted": 0}	2026-07-22 13:27:09.412574-05
1796	business-hours	{"ts": "2026-07-22T18:32:08.364Z", "updated": 10}	2026-07-22 13:32:08.365079-05
1797	business-hours	{"ts": "2026-07-22T18:37:08.371Z", "updated": 10}	2026-07-22 13:37:08.372434-05
1798	business-hours	{"ts": "2026-07-22T18:42:08.398Z", "updated": 10}	2026-07-22 13:42:08.399232-05
1799	business-hours	{"ts": "2026-07-22T18:47:08.498Z", "updated": 10}	2026-07-22 13:47:08.499505-05
1800	business-hours	{"ts": "2026-07-22T18:52:08.367Z", "updated": 10}	2026-07-22 13:52:08.36803-05
1801	business-hours	{"ts": "2026-07-22T18:57:08.383Z", "updated": 10}	2026-07-22 13:57:08.384225-05
1802	business-hours	{"ts": "2026-07-22T19:02:08.448Z", "updated": 10}	2026-07-22 14:02:08.449203-05
1803	business-hours	{"ts": "2026-07-22T19:07:08.434Z", "updated": 10}	2026-07-22 14:07:08.434756-05
1804	business-hours	{"ts": "2026-07-22T19:12:08.485Z", "updated": 10}	2026-07-22 14:12:08.486743-05
1805	business-hours	{"ts": "2026-07-22T19:17:10.660Z", "updated": 10}	2026-07-22 14:17:10.675995-05
1806	business-hours	{"ts": "2026-07-22T19:22:08.552Z", "updated": 10}	2026-07-22 14:22:08.553865-05
1807	business-hours	{"ts": "2026-07-22T19:27:08.700Z", "updated": 10}	2026-07-22 14:27:08.701976-05
1808	business-hours	{"ts": "2026-07-22T19:32:08.596Z", "updated": 10}	2026-07-22 14:32:08.597389-05
1809	business-hours	{"ts": "2026-07-22T19:37:08.624Z", "updated": 10}	2026-07-22 14:37:08.624713-05
1810	business-hours	{"ts": "2026-07-22T19:42:08.815Z", "updated": 10}	2026-07-22 14:42:08.8308-05
1811	business-hours	{"ts": "2026-07-22T19:47:08.720Z", "updated": 5}	2026-07-22 14:47:08.727557-05
1812	business-hours	{"ts": "2026-07-22T19:52:08.699Z", "updated": 5}	2026-07-22 14:52:08.700275-05
1813	business-hours	{"ts": "2026-07-22T19:57:09.038Z", "updated": 5}	2026-07-22 14:57:09.040043-05
1814	location-history-prune	{"deleted": 0}	2026-07-22 14:59:34.780033-05
1815	business-hours	{"ts": "2026-07-22T20:04:33.803Z", "updated": 5}	2026-07-22 15:04:33.805071-05
1816	business-hours	{"ts": "2026-07-22T20:09:33.822Z", "updated": 5}	2026-07-22 15:09:33.824168-05
1817	business-hours	{"ts": "2026-07-22T20:14:33.803Z", "updated": 5}	2026-07-22 15:14:33.803694-05
1818	business-hours	{"ts": "2026-07-22T20:19:33.883Z", "updated": 5}	2026-07-22 15:19:33.885252-05
1819	business-hours	{"ts": "2026-07-22T20:24:33.858Z", "updated": 5}	2026-07-22 15:24:33.859548-05
1820	business-hours	{"ts": "2026-07-22T20:29:33.862Z", "updated": 5}	2026-07-22 15:29:33.863316-05
1821	business-hours	{"ts": "2026-07-22T20:34:33.889Z", "updated": 5}	2026-07-22 15:34:33.8899-05
1822	business-hours	{"ts": "2026-07-22T20:39:33.891Z", "updated": 5}	2026-07-22 15:39:33.891876-05
1823	business-hours	{"ts": "2026-07-22T20:44:33.932Z", "updated": 5}	2026-07-22 15:44:33.933355-05
1824	business-hours	{"ts": "2026-07-22T20:49:33.965Z", "updated": 5}	2026-07-22 15:49:33.965895-05
1825	location-history-prune	{"deleted": 0}	2026-07-22 15:52:18.464398-05
1826	location-history-prune	{"deleted": 0}	2026-07-22 15:56:49.667675-05
1827	business-hours	{"ts": "2026-07-22T21:01:48.795Z", "updated": 5}	2026-07-22 16:01:48.796353-05
1828	business-hours	{"ts": "2026-07-22T21:06:48.710Z", "updated": 5}	2026-07-22 16:06:48.711166-05
1829	business-hours	{"ts": "2026-07-22T21:11:48.731Z", "updated": 5}	2026-07-22 16:11:48.733772-05
1830	location-history-prune	{"deleted": 0}	2026-07-22 16:16:15.869798-05
1831	business-hours	{"ts": "2026-07-22T21:21:14.997Z", "updated": 5}	2026-07-22 16:21:14.999399-05
1832	location-history-prune	{"deleted": 0}	2026-07-22 16:23:14.92133-05
1833	business-hours	{"ts": "2026-07-22T21:28:14.072Z", "updated": 5}	2026-07-22 16:28:14.073788-05
1834	business-hours	{"ts": "2026-07-22T21:33:14.108Z", "updated": 5}	2026-07-22 16:33:14.109316-05
1835	business-hours	{"ts": "2026-07-22T21:38:14.038Z", "updated": 5}	2026-07-22 16:38:14.038886-05
1836	business-hours	{"ts": "2026-07-22T21:43:14.080Z", "updated": 5}	2026-07-22 16:43:14.082117-05
1837	business-hours	{"ts": "2026-07-22T21:48:14.071Z", "updated": 5}	2026-07-22 16:48:14.071997-05
1838	business-hours	{"ts": "2026-07-22T21:53:14.048Z", "updated": 5}	2026-07-22 16:53:14.049581-05
1839	business-hours	{"ts": "2026-07-22T21:58:14.038Z", "updated": 5}	2026-07-22 16:58:14.039376-05
1840	business-hours	{"ts": "2026-07-22T22:03:14.052Z", "updated": 5}	2026-07-22 17:03:14.052816-05
1841	business-hours	{"ts": "2026-07-22T22:08:14.039Z", "updated": 5}	2026-07-22 17:08:14.040622-05
1842	business-hours	{"ts": "2026-07-22T22:13:14.061Z", "updated": 5}	2026-07-22 17:13:14.061904-05
1843	location-history-prune	{"deleted": 0}	2026-07-22 17:13:36.484647-05
1844	business-hours	{"ts": "2026-07-22T22:18:35.632Z", "updated": 5}	2026-07-22 17:18:35.633437-05
1845	location-history-prune	{"deleted": 0}	2026-07-22 17:21:36.476228-05
1846	business-hours	{"ts": "2026-07-22T22:26:35.691Z", "updated": 5}	2026-07-22 17:26:35.692203-05
1847	business-hours	{"ts": "2026-07-22T22:31:35.662Z", "updated": 5}	2026-07-22 17:31:35.66277-05
1848	business-hours	{"ts": "2026-07-22T22:36:35.691Z", "updated": 5}	2026-07-22 17:36:35.692047-05
1849	business-hours	{"ts": "2026-07-22T22:41:35.677Z", "updated": 5}	2026-07-22 17:41:35.678771-05
1850	business-hours	{"ts": "2026-07-22T22:46:35.741Z", "updated": 5}	2026-07-22 17:46:35.742635-05
1851	location-history-prune	{"deleted": 0}	2026-07-22 17:48:45.417417-05
1852	business-hours	{"ts": "2026-07-22T22:53:44.548Z", "updated": 5}	2026-07-22 17:53:44.549742-05
1853	business-hours	{"ts": "2026-07-22T22:58:44.526Z", "updated": 5}	2026-07-22 17:58:44.527057-05
1854	business-hours	{"ts": "2026-07-22T23:03:44.569Z", "updated": 5}	2026-07-22 18:03:44.569794-05
1855	business-hours	{"ts": "2026-07-22T23:08:44.505Z", "updated": 5}	2026-07-22 18:08:44.508416-05
1856	business-hours	{"ts": "2026-07-22T23:13:44.537Z", "updated": 5}	2026-07-22 18:13:44.53849-05
1857	business-hours	{"ts": "2026-07-22T23:18:44.676Z", "updated": 5}	2026-07-22 18:18:44.677024-05
1858	business-hours	{"ts": "2026-07-22T23:23:44.585Z", "updated": 5}	2026-07-22 18:23:44.585905-05
1859	business-hours	{"ts": "2026-07-22T23:28:44.641Z", "updated": 5}	2026-07-22 18:28:44.644473-05
1860	business-hours	{"ts": "2026-07-22T23:33:44.635Z", "updated": 5}	2026-07-22 18:33:44.636023-05
1861	business-hours	{"ts": "2026-07-22T23:38:44.624Z", "updated": 5}	2026-07-22 18:38:44.625192-05
1862	business-hours	{"ts": "2026-07-22T23:43:44.657Z", "updated": 5}	2026-07-22 18:43:44.658396-05
1863	business-hours	{"ts": "2026-07-22T23:48:44.643Z", "updated": 5}	2026-07-22 18:48:44.643932-05
1864	business-hours	{"ts": "2026-07-22T23:53:44.680Z", "updated": 5}	2026-07-22 18:53:44.681209-05
1865	business-hours	{"ts": "2026-07-22T23:58:44.660Z", "updated": 5}	2026-07-22 18:58:44.661594-05
1866	business-hours	{"ts": "2026-07-23T00:03:44.701Z", "updated": 5}	2026-07-22 19:03:44.7021-05
1867	business-hours	{"ts": "2026-07-23T00:08:44.689Z", "updated": 5}	2026-07-22 19:08:44.689827-05
1868	business-hours	{"ts": "2026-07-23T00:13:44.705Z", "updated": 5}	2026-07-22 19:13:44.706445-05
1869	business-hours	{"ts": "2026-07-23T00:18:44.767Z", "updated": 5}	2026-07-22 19:18:44.768627-05
1870	business-hours	{"ts": "2026-07-23T00:23:44.763Z", "updated": 5}	2026-07-22 19:23:44.764692-05
1871	business-hours	{"ts": "2026-07-23T00:28:44.788Z", "updated": 5}	2026-07-22 19:28:44.789917-05
1872	business-hours	{"ts": "2026-07-23T00:33:44.794Z", "updated": 5}	2026-07-22 19:33:44.794696-05
1873	business-hours	{"ts": "2026-07-23T00:38:44.810Z", "updated": 5}	2026-07-22 19:38:44.811683-05
1874	business-hours	{"ts": "2026-07-23T00:43:44.807Z", "updated": 5}	2026-07-22 19:43:44.808632-05
1875	business-hours	{"ts": "2026-07-23T00:48:44.832Z", "updated": 5}	2026-07-22 19:48:44.833934-05
1876	business-hours	{"ts": "2026-07-23T00:53:44.841Z", "updated": 5}	2026-07-22 19:53:44.841691-05
1877	business-hours	{"ts": "2026-07-23T00:58:44.874Z", "updated": 5}	2026-07-22 19:58:44.876313-05
1878	business-hours	{"ts": "2026-07-23T01:03:44.870Z", "updated": 5}	2026-07-22 20:03:44.870735-05
1879	business-hours	{"ts": "2026-07-23T01:08:44.899Z", "updated": 5}	2026-07-22 20:08:44.901118-05
1880	business-hours	{"ts": "2026-07-23T01:13:44.924Z", "updated": 5}	2026-07-22 20:13:44.925255-05
1881	business-hours	{"ts": "2026-07-23T01:18:44.989Z", "updated": 5}	2026-07-22 20:18:44.990675-05
1882	business-hours	{"ts": "2026-07-23T01:23:44.986Z", "updated": 5}	2026-07-22 20:23:44.986705-05
1883	business-hours	{"ts": "2026-07-23T01:28:45.022Z", "updated": 5}	2026-07-22 20:28:45.026333-05
1884	location-history-prune	{"deleted": 0}	2026-07-22 20:32:03.181776-05
1885	location-history-prune	{"deleted": 0}	2026-07-22 20:32:34.073711-05
1886	business-hours	{"ts": "2026-07-23T01:37:33.303Z", "updated": 5}	2026-07-22 20:37:33.304362-05
1887	business-hours	{"ts": "2026-07-23T01:42:33.249Z", "updated": 5}	2026-07-22 20:42:33.250977-05
1888	business-hours	{"ts": "2026-07-23T01:47:33.261Z", "updated": 5}	2026-07-22 20:47:33.262069-05
1889	business-hours	{"ts": "2026-07-23T01:52:33.270Z", "updated": 5}	2026-07-22 20:52:33.271485-05
1890	business-hours	{"ts": "2026-07-23T01:57:33.270Z", "updated": 5}	2026-07-22 20:57:33.271571-05
1891	business-hours	{"ts": "2026-07-23T02:02:33.306Z", "updated": 5}	2026-07-22 21:02:33.307726-05
1892	business-hours	{"ts": "2026-07-23T02:07:33.320Z", "updated": 5}	2026-07-22 21:07:33.321135-05
1893	business-hours	{"ts": "2026-07-23T02:12:33.346Z", "updated": 5}	2026-07-22 21:12:33.346774-05
1894	business-hours	{"ts": "2026-07-23T02:17:33.473Z", "updated": 5}	2026-07-22 21:17:33.474691-05
1895	business-hours	{"ts": "2026-07-23T02:22:33.394Z", "updated": 5}	2026-07-22 21:22:33.395365-05
1896	business-hours	{"ts": "2026-07-23T02:27:33.391Z", "updated": 5}	2026-07-22 21:27:33.392559-05
1897	business-hours	{"ts": "2026-07-23T02:32:33.406Z", "updated": 5}	2026-07-22 21:32:33.407878-05
1898	business-hours	{"ts": "2026-07-23T02:37:33.447Z", "updated": 5}	2026-07-22 21:37:33.449079-05
1899	business-hours	{"ts": "2026-07-23T02:42:33.455Z", "updated": 5}	2026-07-22 21:42:33.45602-05
1900	business-hours	{"ts": "2026-07-23T02:47:33.438Z", "updated": 5}	2026-07-22 21:47:33.438623-05
1901	business-hours	{"ts": "2026-07-23T02:52:33.479Z", "updated": 5}	2026-07-22 21:52:33.481367-05
1902	business-hours	{"ts": "2026-07-23T02:57:33.509Z", "updated": 5}	2026-07-22 21:57:33.510076-05
1903	business-hours	{"ts": "2026-07-23T03:02:33.541Z", "updated": 5}	2026-07-22 22:02:33.542217-05
1904	business-hours	{"ts": "2026-07-23T03:07:33.569Z", "updated": 5}	2026-07-22 22:07:33.570571-05
1905	business-hours	{"ts": "2026-07-23T03:12:33.591Z", "updated": 5}	2026-07-22 22:12:33.593621-05
1906	business-hours	{"ts": "2026-07-23T03:17:33.719Z", "updated": 5}	2026-07-22 22:17:33.721499-05
1907	location-history-prune	{"deleted": 0}	2026-07-22 22:18:34.858444-05
1908	business-hours	{"ts": "2026-07-23T03:23:33.726Z", "updated": 5}	2026-07-22 22:23:33.727149-05
1909	business-hours	{"ts": "2026-07-23T03:28:33.751Z", "updated": 5}	2026-07-22 22:28:33.752765-05
1910	location-history-prune	{"deleted": 0}	2026-07-22 22:29:54.257956-05
1911	business-hours	{"ts": "2026-07-23T03:34:53.557Z", "updated": 5}	2026-07-22 22:34:53.558355-05
1912	business-hours	{"ts": "2026-07-23T03:39:53.547Z", "updated": 5}	2026-07-22 22:39:53.54909-05
1913	business-hours	{"ts": "2026-07-23T03:44:53.528Z", "updated": 5}	2026-07-22 22:44:53.529926-05
1914	business-hours	{"ts": "2026-07-23T03:49:53.602Z", "updated": 5}	2026-07-22 22:49:53.603561-05
1915	location-history-prune	{"deleted": 0}	2026-07-22 22:51:08.387657-05
1916	business-hours	{"ts": "2026-07-23T03:56:07.593Z", "updated": 5}	2026-07-22 22:56:07.594253-05
1917	business-hours	{"ts": "2026-07-23T04:01:07.550Z", "updated": 5}	2026-07-22 23:01:07.551157-05
1918	business-hours	{"ts": "2026-07-23T04:06:07.550Z", "updated": 5}	2026-07-22 23:06:07.551037-05
1919	business-hours	{"ts": "2026-07-23T04:11:07.534Z", "updated": 5}	2026-07-22 23:11:07.535778-05
1920	business-hours	{"ts": "2026-07-23T04:16:07.559Z", "updated": 5}	2026-07-22 23:16:07.560192-05
1921	business-hours	{"ts": "2026-07-23T04:21:07.674Z", "updated": 5}	2026-07-22 23:21:07.67658-05
1922	business-hours	{"ts": "2026-07-23T04:26:07.712Z", "updated": 5}	2026-07-22 23:26:07.714127-05
1923	business-hours	{"ts": "2026-07-23T04:31:07.630Z", "updated": 5}	2026-07-22 23:31:07.632175-05
1924	business-hours	{"ts": "2026-07-23T04:36:07.666Z", "updated": 5}	2026-07-22 23:36:07.667115-05
1925	business-hours	{"ts": "2026-07-23T04:41:07.769Z", "updated": 5}	2026-07-22 23:41:07.770018-05
1926	business-hours	{"ts": "2026-07-23T04:46:07.683Z", "updated": 5}	2026-07-22 23:46:07.68475-05
1927	business-hours	{"ts": "2026-07-23T04:51:07.708Z", "updated": 5}	2026-07-22 23:51:07.70979-05
1928	business-hours	{"ts": "2026-07-23T04:56:07.735Z", "updated": 5}	2026-07-22 23:56:07.736369-05
1929	business-hours	{"ts": "2026-07-23T05:01:07.777Z", "updated": 5}	2026-07-23 00:01:07.779822-05
1930	business-hours	{"ts": "2026-07-23T05:06:07.764Z", "updated": 5}	2026-07-23 00:06:07.765392-05
1931	business-hours	{"ts": "2026-07-23T05:11:07.789Z", "updated": 5}	2026-07-23 00:11:07.790468-05
1932	business-hours	{"ts": "2026-07-23T05:16:07.807Z", "updated": 5}	2026-07-23 00:16:07.80951-05
1933	business-hours	{"ts": "2026-07-23T05:21:07.860Z", "updated": 5}	2026-07-23 00:21:07.861619-05
1934	business-hours	{"ts": "2026-07-23T05:26:07.823Z", "updated": 5}	2026-07-23 00:26:07.823879-05
1935	business-hours	{"ts": "2026-07-23T05:31:07.858Z", "updated": 5}	2026-07-23 00:31:07.859998-05
1936	business-hours	{"ts": "2026-07-23T05:36:07.845Z", "updated": 5}	2026-07-23 00:36:07.845604-05
2069	location-history-prune	{"deleted": 0}	2026-07-23 11:36:18.557559-05
1937	business-hours	{"ts": "2026-07-23T05:41:07.878Z", "updated": 5}	2026-07-23 00:41:07.879185-05
1938	business-hours	{"ts": "2026-07-23T05:46:07.863Z", "updated": 5}	2026-07-23 00:46:07.864086-05
1939	business-hours	{"ts": "2026-07-23T05:51:07.961Z", "updated": 5}	2026-07-23 00:51:07.965238-05
1940	business-hours	{"ts": "2026-07-23T05:56:07.924Z", "updated": 5}	2026-07-23 00:56:07.931363-05
1941	business-hours	{"ts": "2026-07-23T06:01:07.952Z", "updated": 5}	2026-07-23 01:01:07.953207-05
1942	business-hours	{"ts": "2026-07-23T06:06:07.950Z", "updated": 5}	2026-07-23 01:06:07.951484-05
1943	business-hours	{"ts": "2026-07-23T06:11:07.988Z", "updated": 5}	2026-07-23 01:11:07.99045-05
1944	business-hours	{"ts": "2026-07-23T06:16:07.976Z", "updated": 5}	2026-07-23 01:16:07.977604-05
1945	business-hours	{"ts": "2026-07-23T06:21:08.022Z", "updated": 5}	2026-07-23 01:21:08.025127-05
1946	business-hours	{"ts": "2026-07-23T06:26:08.006Z", "updated": 5}	2026-07-23 01:26:08.010994-05
1947	business-hours	{"ts": "2026-07-23T06:31:08.012Z", "updated": 5}	2026-07-23 01:31:08.012963-05
1948	business-hours	{"ts": "2026-07-23T06:36:08.037Z", "updated": 5}	2026-07-23 01:36:08.038744-05
1949	business-hours	{"ts": "2026-07-23T06:41:08.026Z", "updated": 5}	2026-07-23 01:41:08.031162-05
1950	business-hours	{"ts": "2026-07-23T06:46:08.046Z", "updated": 5}	2026-07-23 01:46:08.047731-05
1951	business-hours	{"ts": "2026-07-23T06:51:08.279Z", "updated": 5}	2026-07-23 01:51:08.280428-05
1952	business-hours	{"ts": "2026-07-23T06:56:08.071Z", "updated": 5}	2026-07-23 01:56:08.072602-05
1953	business-hours	{"ts": "2026-07-23T07:01:08.089Z", "updated": 5}	2026-07-23 02:01:08.090851-05
1954	business-hours	{"ts": "2026-07-23T07:06:08.091Z", "updated": 5}	2026-07-23 02:06:08.097609-05
1955	business-hours	{"ts": "2026-07-23T07:11:08.102Z", "updated": 5}	2026-07-23 02:11:08.106717-05
1956	business-hours	{"ts": "2026-07-23T07:16:08.128Z", "updated": 5}	2026-07-23 02:16:08.129192-05
1957	business-hours	{"ts": "2026-07-23T07:21:08.201Z", "updated": 5}	2026-07-23 02:21:08.203221-05
1958	business-hours	{"ts": "2026-07-23T07:26:08.199Z", "updated": 5}	2026-07-23 02:26:08.200783-05
1959	business-hours	{"ts": "2026-07-23T07:31:08.170Z", "updated": 5}	2026-07-23 02:31:08.171266-05
1960	business-hours	{"ts": "2026-07-23T07:36:08.226Z", "updated": 5}	2026-07-23 02:36:08.231625-05
1961	business-hours	{"ts": "2026-07-23T07:41:08.208Z", "updated": 5}	2026-07-23 02:41:08.225051-05
1962	business-hours	{"ts": "2026-07-23T07:46:08.242Z", "updated": 5}	2026-07-23 02:46:08.243418-05
1963	business-hours	{"ts": "2026-07-23T07:51:08.244Z", "updated": 5}	2026-07-23 02:51:08.244532-05
1964	business-hours	{"ts": "2026-07-23T07:56:08.243Z", "updated": 5}	2026-07-23 02:56:08.245108-05
1965	business-hours	{"ts": "2026-07-23T08:01:08.234Z", "updated": 5}	2026-07-23 03:01:08.235055-05
1966	business-hours	{"ts": "2026-07-23T08:06:08.281Z", "updated": 5}	2026-07-23 03:06:08.282162-05
1967	business-hours	{"ts": "2026-07-23T08:11:08.298Z", "updated": 5}	2026-07-23 03:11:08.312597-05
1968	business-hours	{"ts": "2026-07-23T08:16:08.339Z", "updated": 5}	2026-07-23 03:16:08.345906-05
1969	business-hours	{"ts": "2026-07-23T08:21:08.351Z", "updated": 5}	2026-07-23 03:21:08.351776-05
1970	business-hours	{"ts": "2026-07-23T08:26:08.327Z", "updated": 5}	2026-07-23 03:26:08.331348-05
1971	business-hours	{"ts": "2026-07-23T08:31:08.363Z", "updated": 5}	2026-07-23 03:31:08.364173-05
1972	business-hours	{"ts": "2026-07-23T08:36:08.405Z", "updated": 5}	2026-07-23 03:36:08.406362-05
1973	business-hours	{"ts": "2026-07-23T08:41:08.420Z", "updated": 5}	2026-07-23 03:41:08.421454-05
1974	business-hours	{"ts": "2026-07-23T08:46:08.406Z", "updated": 5}	2026-07-23 03:46:08.40712-05
1975	business-hours	{"ts": "2026-07-23T08:51:08.449Z", "updated": 5}	2026-07-23 03:51:08.450496-05
1976	business-hours	{"ts": "2026-07-23T08:56:08.448Z", "updated": 5}	2026-07-23 03:56:08.448853-05
1977	business-hours	{"ts": "2026-07-23T09:01:08.495Z", "updated": 5}	2026-07-23 04:01:08.49678-05
1978	business-hours	{"ts": "2026-07-23T09:06:08.466Z", "updated": 5}	2026-07-23 04:06:08.466837-05
1979	business-hours	{"ts": "2026-07-23T09:11:08.480Z", "updated": 5}	2026-07-23 04:11:08.481337-05
1980	business-hours	{"ts": "2026-07-23T09:16:08.486Z", "updated": 5}	2026-07-23 04:16:08.487377-05
1981	business-hours	{"ts": "2026-07-23T09:21:08.764Z", "updated": 5}	2026-07-23 04:21:08.779814-05
1982	business-hours	{"ts": "2026-07-23T09:26:08.529Z", "updated": 5}	2026-07-23 04:26:08.530011-05
1983	business-hours	{"ts": "2026-07-23T09:31:08.538Z", "updated": 5}	2026-07-23 04:31:08.541212-05
1984	business-hours	{"ts": "2026-07-23T09:36:08.559Z", "updated": 5}	2026-07-23 04:36:08.559869-05
1985	business-hours	{"ts": "2026-07-23T09:41:08.549Z", "updated": 5}	2026-07-23 04:41:08.550022-05
1986	business-hours	{"ts": "2026-07-23T09:46:08.600Z", "updated": 5}	2026-07-23 04:46:08.601795-05
1987	business-hours	{"ts": "2026-07-23T09:51:08.613Z", "updated": 5}	2026-07-23 04:51:08.613994-05
1988	business-hours	{"ts": "2026-07-23T09:56:08.642Z", "updated": 5}	2026-07-23 04:56:08.64681-05
1989	business-hours	{"ts": "2026-07-23T10:01:08.841Z", "updated": 5}	2026-07-23 05:01:08.86666-05
1990	business-hours	{"ts": "2026-07-23T10:06:08.690Z", "updated": 5}	2026-07-23 05:06:08.693696-05
1991	business-hours	{"ts": "2026-07-23T10:11:08.687Z", "updated": 5}	2026-07-23 05:11:08.688011-05
1992	business-hours	{"ts": "2026-07-23T10:16:08.821Z", "updated": 5}	2026-07-23 05:16:08.82311-05
1993	business-hours	{"ts": "2026-07-23T10:21:08.885Z", "updated": 5}	2026-07-23 05:21:08.886653-05
1994	business-hours	{"ts": "2026-07-23T10:26:08.766Z", "updated": 5}	2026-07-23 05:26:08.769075-05
1995	business-hours	{"ts": "2026-07-23T10:31:08.813Z", "updated": 5}	2026-07-23 05:31:08.819885-05
1996	business-hours	{"ts": "2026-07-23T10:36:08.813Z", "updated": 5}	2026-07-23 05:36:08.813919-05
1997	business-hours	{"ts": "2026-07-23T10:41:08.830Z", "updated": 5}	2026-07-23 05:41:08.833841-05
1998	business-hours	{"ts": "2026-07-23T10:46:08.916Z", "updated": 5}	2026-07-23 05:46:08.918854-05
1999	business-hours	{"ts": "2026-07-23T10:51:08.825Z", "updated": 5}	2026-07-23 05:51:08.834744-05
2000	business-hours	{"ts": "2026-07-23T10:56:08.848Z", "updated": 5}	2026-07-23 05:56:08.851178-05
2001	business-hours	{"ts": "2026-07-23T11:01:08.878Z", "updated": 5}	2026-07-23 06:01:08.879458-05
2136	location-history-prune	{"deleted": 0}	2026-07-23 17:01:54.17131-05
2002	business-hours	{"ts": "2026-07-23T11:06:08.926Z", "updated": 5}	2026-07-23 06:06:08.928161-05
2003	business-hours	{"ts": "2026-07-23T11:11:08.889Z", "updated": 5}	2026-07-23 06:11:08.891095-05
2004	business-hours	{"ts": "2026-07-23T11:16:08.988Z", "updated": 5}	2026-07-23 06:16:08.993607-05
2005	business-hours	{"ts": "2026-07-23T11:21:09.109Z", "updated": 5}	2026-07-23 06:21:09.110663-05
2006	business-hours	{"ts": "2026-07-23T11:26:08.969Z", "updated": 5}	2026-07-23 06:26:08.970624-05
2007	business-hours	{"ts": "2026-07-23T11:31:08.990Z", "updated": 5}	2026-07-23 06:31:08.991083-05
2008	business-hours	{"ts": "2026-07-23T11:36:08.980Z", "updated": 5}	2026-07-23 06:36:08.982058-05
2009	business-hours	{"ts": "2026-07-23T11:41:08.979Z", "updated": 5}	2026-07-23 06:41:08.980596-05
2010	business-hours	{"ts": "2026-07-23T11:46:09.011Z", "updated": 5}	2026-07-23 06:46:09.015204-05
2011	business-hours	{"ts": "2026-07-23T11:51:08.998Z", "updated": 5}	2026-07-23 06:51:09.007239-05
2012	business-hours	{"ts": "2026-07-23T11:56:09.019Z", "updated": 5}	2026-07-23 06:56:09.023907-05
2013	business-hours	{"ts": "2026-07-23T12:01:09.033Z", "updated": 5}	2026-07-23 07:01:09.035177-05
2014	business-hours	{"ts": "2026-07-23T12:06:09.083Z", "updated": 5}	2026-07-23 07:06:09.086038-05
2015	business-hours	{"ts": "2026-07-23T12:11:09.053Z", "updated": 5}	2026-07-23 07:11:09.054321-05
2016	business-hours	{"ts": "2026-07-23T12:16:09.100Z", "updated": 5}	2026-07-23 07:16:09.102891-05
2017	business-hours	{"ts": "2026-07-23T12:21:09.187Z", "updated": 5}	2026-07-23 07:21:09.187902-05
2018	business-hours	{"ts": "2026-07-23T12:26:09.064Z", "updated": 5}	2026-07-23 07:26:09.065546-05
2019	business-hours	{"ts": "2026-07-23T12:31:09.074Z", "updated": 5}	2026-07-23 07:31:09.075553-05
2020	business-hours	{"ts": "2026-07-23T12:36:09.094Z", "updated": 5}	2026-07-23 07:36:09.098265-05
2021	business-hours	{"ts": "2026-07-23T12:41:09.403Z", "updated": 5}	2026-07-23 07:41:09.40916-05
2022	business-hours	{"ts": "2026-07-23T12:46:09.175Z", "updated": 5}	2026-07-23 07:46:09.177252-05
2023	business-hours	{"ts": "2026-07-23T12:51:09.127Z", "updated": 5}	2026-07-23 07:51:09.132663-05
2024	business-hours	{"ts": "2026-07-23T12:56:09.142Z", "updated": 5}	2026-07-23 07:56:09.143101-05
2025	business-hours	{"ts": "2026-07-23T13:01:09.136Z", "updated": 5}	2026-07-23 08:01:09.137085-05
2026	business-hours	{"ts": "2026-07-23T13:06:09.152Z", "updated": 5}	2026-07-23 08:06:09.153579-05
2027	business-hours	{"ts": "2026-07-23T13:11:09.192Z", "updated": 5}	2026-07-23 08:11:09.193837-05
2028	business-hours	{"ts": "2026-07-23T13:16:09.207Z", "updated": 5}	2026-07-23 08:16:09.209685-05
2029	business-hours	{"ts": "2026-07-23T13:21:09.258Z", "updated": 5}	2026-07-23 08:21:09.259096-05
2030	business-hours	{"ts": "2026-07-23T13:26:09.181Z", "updated": 5}	2026-07-23 08:26:09.181977-05
2031	business-hours	{"ts": "2026-07-23T13:31:09.189Z", "updated": 5}	2026-07-23 08:31:09.192459-05
2032	business-hours	{"ts": "2026-07-23T13:36:09.187Z", "updated": 5}	2026-07-23 08:36:09.187857-05
2033	business-hours	{"ts": "2026-07-23T13:41:09.253Z", "updated": 5}	2026-07-23 08:41:09.254254-05
2034	business-hours	{"ts": "2026-07-23T13:46:09.272Z", "updated": 5}	2026-07-23 08:46:09.272862-05
2035	business-hours	{"ts": "2026-07-23T13:51:09.245Z", "updated": 5}	2026-07-23 08:51:09.246371-05
2036	business-hours	{"ts": "2026-07-23T13:56:09.264Z", "updated": 5}	2026-07-23 08:56:09.265337-05
2037	business-hours	{"ts": "2026-07-23T14:01:09.534Z", "updated": 5}	2026-07-23 09:01:09.537627-05
2038	business-hours	{"ts": "2026-07-23T14:06:09.271Z", "updated": 5}	2026-07-23 09:06:09.272879-05
2039	business-hours	{"ts": "2026-07-23T14:11:09.286Z", "updated": 5}	2026-07-23 09:11:09.288325-05
2040	business-hours	{"ts": "2026-07-23T14:16:09.286Z", "updated": 5}	2026-07-23 09:16:09.287094-05
2041	business-hours	{"ts": "2026-07-23T14:21:09.384Z", "updated": 5}	2026-07-23 09:21:09.385055-05
2042	business-hours	{"ts": "2026-07-23T14:26:09.312Z", "updated": 5}	2026-07-23 09:26:09.312725-05
2043	business-hours	{"ts": "2026-07-23T14:31:09.324Z", "updated": 5}	2026-07-23 09:31:09.328177-05
2044	business-hours	{"ts": "2026-07-23T14:36:09.297Z", "updated": 5}	2026-07-23 09:36:09.298326-05
2045	business-hours	{"ts": "2026-07-23T14:41:09.312Z", "updated": 5}	2026-07-23 09:41:09.316958-05
2046	business-hours	{"ts": "2026-07-23T14:46:09.317Z", "updated": 5}	2026-07-23 09:46:09.317967-05
2047	business-hours	{"ts": "2026-07-23T14:51:09.312Z", "updated": 5}	2026-07-23 09:51:09.313108-05
2048	business-hours	{"ts": "2026-07-23T14:56:09.332Z", "updated": 5}	2026-07-23 09:56:09.334164-05
2049	business-hours	{"ts": "2026-07-23T15:01:09.339Z", "updated": 5}	2026-07-23 10:01:09.344546-05
2050	business-hours	{"ts": "2026-07-23T15:06:09.348Z", "updated": 5}	2026-07-23 10:06:09.350113-05
2051	business-hours	{"ts": "2026-07-23T15:11:09.378Z", "updated": 5}	2026-07-23 10:11:09.380054-05
2052	location-history-prune	{"deleted": 0}	2026-07-23 10:15:57.158963-05
2053	business-hours	{"ts": "2026-07-23T15:20:56.016Z", "updated": 5}	2026-07-23 10:20:56.017587-05
2054	location-history-prune	{"deleted": 0}	2026-07-23 10:23:55.678845-05
2055	business-hours	{"ts": "2026-07-23T15:28:54.572Z", "updated": 5}	2026-07-23 10:28:54.573013-05
2056	business-hours	{"ts": "2026-07-23T15:33:54.608Z", "updated": 5}	2026-07-23 10:33:54.610016-05
2057	business-hours	{"ts": "2026-07-23T15:38:54.578Z", "updated": 5}	2026-07-23 10:38:54.58014-05
2058	business-hours	{"ts": "2026-07-23T15:43:54.581Z", "updated": 5}	2026-07-23 10:43:54.582043-05
2059	business-hours	{"ts": "2026-07-23T15:48:54.606Z", "updated": 5}	2026-07-23 10:48:54.607407-05
2060	business-hours	{"ts": "2026-07-23T15:53:54.601Z", "updated": 5}	2026-07-23 10:53:54.602385-05
2061	business-hours	{"ts": "2026-07-23T15:58:54.785Z", "updated": 5}	2026-07-23 10:58:54.78735-05
2062	business-hours	{"ts": "2026-07-23T16:03:54.665Z", "updated": 5}	2026-07-23 11:03:54.666527-05
2063	business-hours	{"ts": "2026-07-23T16:08:54.705Z", "updated": 5}	2026-07-23 11:08:54.706784-05
2064	business-hours	{"ts": "2026-07-23T16:13:54.731Z", "updated": 5}	2026-07-23 11:13:54.732029-05
2065	business-hours	{"ts": "2026-07-23T16:18:54.710Z", "updated": 5}	2026-07-23 11:18:54.711022-05
2066	business-hours	{"ts": "2026-07-23T16:23:54.707Z", "updated": 5}	2026-07-23 11:23:54.708423-05
2067	business-hours	{"ts": "2026-07-23T16:28:54.762Z", "updated": 5}	2026-07-23 11:28:54.764177-05
2070	business-hours	{"ts": "2026-07-23T16:41:18.032Z", "updated": 5}	2026-07-23 11:41:18.033959-05
2071	business-hours	{"ts": "2026-07-23T16:46:18.033Z", "updated": 5}	2026-07-23 11:46:18.034388-05
2072	business-hours	{"ts": "2026-07-23T16:51:18.040Z", "updated": 5}	2026-07-23 11:51:18.043901-05
2073	business-hours	{"ts": "2026-07-23T16:56:18.034Z", "updated": 5}	2026-07-23 11:56:18.037162-05
2074	business-hours	{"ts": "2026-07-23T17:01:18.062Z", "updated": 5}	2026-07-23 12:01:18.06311-05
2075	business-hours	{"ts": "2026-07-23T17:06:18.089Z", "updated": 5}	2026-07-23 12:06:18.090426-05
2076	business-hours	{"ts": "2026-07-23T17:11:18.054Z", "updated": 5}	2026-07-23 12:11:18.056356-05
2077	business-hours	{"ts": "2026-07-23T17:16:18.112Z", "updated": 5}	2026-07-23 12:16:18.113434-05
2078	business-hours	{"ts": "2026-07-23T17:21:18.239Z", "updated": 5}	2026-07-23 12:21:18.241348-05
2079	business-hours	{"ts": "2026-07-23T17:26:18.085Z", "updated": 5}	2026-07-23 12:26:18.086696-05
2080	business-hours	{"ts": "2026-07-23T17:31:18.131Z", "updated": 5}	2026-07-23 12:31:18.139956-05
2081	business-hours	{"ts": "2026-07-23T17:36:18.170Z", "updated": 5}	2026-07-23 12:36:18.170954-05
2082	business-hours	{"ts": "2026-07-23T17:41:18.179Z", "updated": 5}	2026-07-23 12:41:18.182414-05
2083	business-hours	{"ts": "2026-07-23T17:46:18.183Z", "updated": 5}	2026-07-23 12:46:18.185788-05
2084	business-hours	{"ts": "2026-07-23T17:51:18.146Z", "updated": 5}	2026-07-23 12:51:18.14711-05
2085	business-hours	{"ts": "2026-07-23T17:56:18.175Z", "updated": 5}	2026-07-23 12:56:18.17622-05
2086	business-hours	{"ts": "2026-07-23T18:01:18.354Z", "updated": 5}	2026-07-23 13:01:18.355217-05
2087	business-hours	{"ts": "2026-07-23T18:06:18.246Z", "updated": 5}	2026-07-23 13:06:18.247945-05
2088	business-hours	{"ts": "2026-07-23T18:11:18.230Z", "updated": 5}	2026-07-23 13:11:18.230975-05
2089	location-history-prune	{"deleted": 0}	2026-07-23 13:12:24.006482-05
2090	business-hours	{"ts": "2026-07-23T18:17:22.780Z", "updated": 5}	2026-07-23 13:17:22.782122-05
2091	business-hours	{"ts": "2026-07-23T18:22:22.697Z", "updated": 5}	2026-07-23 13:22:22.700993-05
2092	business-hours	{"ts": "2026-07-23T18:27:22.671Z", "updated": 5}	2026-07-23 13:27:22.67203-05
2093	business-hours	{"ts": "2026-07-23T18:32:22.639Z", "updated": 5}	2026-07-23 13:32:22.64033-05
2094	business-hours	{"ts": "2026-07-23T18:37:22.664Z", "updated": 5}	2026-07-23 13:37:22.665732-05
2095	location-history-prune	{"deleted": 0}	2026-07-23 13:40:50.78244-05
2096	business-hours	{"ts": "2026-07-23T18:45:49.594Z", "updated": 5}	2026-07-23 13:45:49.595658-05
2097	business-hours	{"ts": "2026-07-23T18:50:49.619Z", "updated": 5}	2026-07-23 13:50:49.620874-05
2098	business-hours	{"ts": "2026-07-23T18:55:49.656Z", "updated": 5}	2026-07-23 13:55:49.660815-05
2099	business-hours	{"ts": "2026-07-23T19:00:49.656Z", "updated": 5}	2026-07-23 14:00:49.657399-05
2100	business-hours	{"ts": "2026-07-23T19:05:49.594Z", "updated": 5}	2026-07-23 14:05:49.595157-05
2101	business-hours	{"ts": "2026-07-23T19:10:49.623Z", "updated": 5}	2026-07-23 14:10:49.624589-05
2102	business-hours	{"ts": "2026-07-23T19:15:49.664Z", "updated": 5}	2026-07-23 14:15:49.665271-05
2103	business-hours	{"ts": "2026-07-23T19:20:49.711Z", "updated": 5}	2026-07-23 14:20:49.711986-05
2104	business-hours	{"ts": "2026-07-23T19:25:49.712Z", "updated": 5}	2026-07-23 14:25:49.71412-05
2105	business-hours	{"ts": "2026-07-23T19:30:49.731Z", "updated": 5}	2026-07-23 14:30:49.732105-05
2106	business-hours	{"ts": "2026-07-23T19:35:49.742Z", "updated": 5}	2026-07-23 14:35:49.744253-05
2107	location-history-prune	{"deleted": 0}	2026-07-23 14:40:27.302817-05
2108	business-hours	{"ts": "2026-07-23T19:45:25.994Z", "updated": 5}	2026-07-23 14:45:25.995897-05
2109	business-hours	{"ts": "2026-07-23T19:50:25.966Z", "updated": 5}	2026-07-23 14:50:25.969141-05
2110	business-hours	{"ts": "2026-07-23T19:55:25.957Z", "updated": 5}	2026-07-23 14:55:25.957865-05
2111	business-hours	{"ts": "2026-07-23T20:00:25.974Z", "updated": 5}	2026-07-23 15:00:25.975161-05
2112	business-hours	{"ts": "2026-07-23T20:05:25.962Z", "updated": 5}	2026-07-23 15:05:25.963597-05
2113	business-hours	{"ts": "2026-07-23T20:10:25.956Z", "updated": 5}	2026-07-23 15:10:25.958222-05
2114	business-hours	{"ts": "2026-07-23T20:15:25.993Z", "updated": 5}	2026-07-23 15:15:25.994166-05
2115	business-hours	{"ts": "2026-07-23T20:20:26.069Z", "updated": 5}	2026-07-23 15:20:26.069948-05
2116	business-hours	{"ts": "2026-07-23T20:25:26.073Z", "updated": 5}	2026-07-23 15:25:26.074728-05
2117	business-hours	{"ts": "2026-07-23T20:30:26.074Z", "updated": 5}	2026-07-23 15:30:26.074979-05
2118	business-hours	{"ts": "2026-07-23T20:35:26.045Z", "updated": 5}	2026-07-23 15:35:26.046205-05
2119	business-hours	{"ts": "2026-07-23T20:40:26.049Z", "updated": 5}	2026-07-23 15:40:26.050374-05
2120	business-hours	{"ts": "2026-07-23T20:45:26.136Z", "updated": 5}	2026-07-23 15:45:26.140857-05
2121	business-hours	{"ts": "2026-07-23T20:50:26.129Z", "updated": 5}	2026-07-23 15:50:26.131484-05
2122	business-hours	{"ts": "2026-07-23T20:55:26.111Z", "updated": 5}	2026-07-23 15:55:26.111713-05
2123	business-hours	{"ts": "2026-07-23T21:00:26.190Z", "updated": 5}	2026-07-23 16:00:26.197046-05
2124	business-hours	{"ts": "2026-07-23T21:05:26.164Z", "updated": 5}	2026-07-23 16:05:26.165196-05
2125	business-hours	{"ts": "2026-07-23T21:10:26.184Z", "updated": 5}	2026-07-23 16:10:26.185603-05
2126	business-hours	{"ts": "2026-07-23T21:15:26.227Z", "updated": 5}	2026-07-23 16:15:26.228136-05
2127	business-hours	{"ts": "2026-07-23T21:20:26.286Z", "updated": 5}	2026-07-23 16:20:26.287512-05
2128	business-hours	{"ts": "2026-07-23T21:25:26.240Z", "updated": 5}	2026-07-23 16:25:26.241848-05
2129	business-hours	{"ts": "2026-07-23T21:30:26.256Z", "updated": 5}	2026-07-23 16:30:26.257428-05
2130	business-hours	{"ts": "2026-07-23T21:35:26.254Z", "updated": 5}	2026-07-23 16:35:26.256455-05
2131	business-hours	{"ts": "2026-07-23T21:40:26.287Z", "updated": 5}	2026-07-23 16:40:26.288039-05
2132	business-hours	{"ts": "2026-07-23T21:45:26.302Z", "updated": 5}	2026-07-23 16:45:26.303395-05
2133	business-hours	{"ts": "2026-07-23T21:50:26.336Z", "updated": 5}	2026-07-23 16:50:26.339365-05
2134	business-hours	{"ts": "2026-07-23T21:55:26.387Z", "updated": 5}	2026-07-23 16:55:26.388908-05
2135	business-hours	{"ts": "2026-07-23T22:00:26.405Z", "updated": 5}	2026-07-23 17:00:26.40697-05
2137	business-hours	{"ts": "2026-07-23T22:06:53.294Z", "updated": 5}	2026-07-23 17:06:53.296732-05
2138	business-hours	{"ts": "2026-07-23T22:11:53.327Z", "updated": 5}	2026-07-23 17:11:53.335314-05
2139	business-hours	{"ts": "2026-07-23T22:16:53.299Z", "updated": 5}	2026-07-23 17:16:53.300006-05
2140	business-hours	{"ts": "2026-07-23T22:21:53.331Z", "updated": 5}	2026-07-23 17:21:53.332726-05
2141	business-hours	{"ts": "2026-07-23T22:26:53.319Z", "updated": 5}	2026-07-23 17:26:53.320659-05
2142	business-hours	{"ts": "2026-07-23T22:31:53.387Z", "updated": 5}	2026-07-23 17:31:53.392797-05
2143	business-hours	{"ts": "2026-07-23T22:36:53.363Z", "updated": 5}	2026-07-23 17:36:53.363985-05
2144	business-hours	{"ts": "2026-07-23T22:41:53.382Z", "updated": 5}	2026-07-23 17:41:53.38267-05
2145	business-hours	{"ts": "2026-07-23T22:46:53.443Z", "updated": 5}	2026-07-23 17:46:53.447926-05
2146	business-hours	{"ts": "2026-07-23T22:51:53.397Z", "updated": 5}	2026-07-23 17:51:53.397793-05
2147	business-hours	{"ts": "2026-07-23T22:56:53.471Z", "updated": 5}	2026-07-23 17:56:53.472703-05
2148	business-hours	{"ts": "2026-07-23T23:01:53.454Z", "updated": 5}	2026-07-23 18:01:53.4558-05
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, filename, applied_at) FROM stdin;
1	000_create_migrations_table.sql	2026-06-27 11:52:04.876068-05
2	002_add_is_verified.sql	2026-06-27 11:52:04.894978-05
3	003_add_location_updated_at.sql	2026-06-27 11:52:04.915501-05
4	004_add_rate_limit.sql	2026-06-27 11:53:35.388169-05
5	006_add_consent_logs.sql	2026-07-01 10:20:32.919962-05
6	007_sponsorships_ads.sql	2026-07-01 10:21:06.263012-05
7	004_fk_indexes.sql	2026-07-18 21:51:21.759537-05
8	005_data_integrity.sql	2026-07-18 21:51:21.778487-05
9	008_station_type.sql	2026-07-18 21:51:21.857168-05
10	009_cleanup_orphan_vendors.sql	2026-07-18 21:51:36.374244-05
11	010_create_cities_table.sql	2026-07-18 21:52:37.262219-05
12	011_check_price_quantity.sql	2026-07-18 21:53:04.371388-05
13	012_not_null_critical_columns.sql	2026-07-18 21:55:26.103108-05
14	013_check_dates_valid.sql	2026-07-18 21:56:16.486019-05
15	014_ads_view_and_seed.sql	2026-07-19 13:09:50.390829-05
16	015_products_text_checks.sql	2026-07-19 17:57:56.421898-05
17	016_products_composite_index.sql	2026-07-19 17:57:56.457782-05
18	017_backfill_product_photos.sql	2026-07-19 18:29:18.507597-05
19	018_products_fts_index.sql	2026-07-19 18:30:43.799135-05
20	019_add_geo_mode.sql	2026-07-20 16:54:09.451331-05
21	020_role_immutable.sql	2026-07-20 16:55:11.956788-05
22	021_email_verification.sql	2026-07-20 19:13:44.991934-05
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, body, read, created_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, quantity, price) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, buyer_id, vendor_id, status, total, created_at) FROM stdin;
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
e7704cf9-46c2-4d9d-898b-fafd2885fd70	6bf1b231-ac50-4240-a37c-3fd587b93b63	WqzHMjrk5uqCV00Pyv7jkECMB8gqG2wvN/1xzbPIygk=	2026-07-22 15:59:41.249-05	\N	2026-07-22 14:59:41.250406-05
bcbbf4d9-4b4d-48f8-a7e0-183a33cce451	aaaa1111-1111-1111-1111-aaaaaaaaaaaa	d1a568e7c48c9d1ea7584dd2b4150f3881b95e39c0c59ec4d2d31cfa34657bf7	2026-07-23 12:20:24.731079-05	\N	2026-07-23 11:20:24.731079-05
\.


--
-- Data for Name: product_photos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_photos (id, product_id, url, "position", created_at) FROM stdin;
2d1cff51-8327-4310-a92e-fa3800572bdf	bfdd4fc6-7404-4c31-936c-2d0e24101a76	/products/cali/arepas-combo.jpg	0	2026-07-16 11:55:39.742207-05
14bdf138-6ff9-438f-82ba-2874b8dab83a	c0f59424-64f4-40f7-8a4f-c31ec9925d9d	/products/cali/collar-chaquiras.jpg	0	2026-07-16 11:55:39.742207-05
3788dcc2-0dbe-4331-aab5-34a4b9e209d1	e0195697-e5e0-4de7-94f6-b2d3ea3f6e90	/products/cali/arepa-huevo.jpg	0	2026-07-16 11:55:39.742207-05
c1a22372-c72d-4b44-bceb-4fb2292932f6	28e0b6c3-b11f-431f-9ea0-318c06b26bd4	/products/cali/mochila-wayuu.jpg	0	2026-07-16 11:55:39.742207-05
6c64569e-6948-44a7-9ade-2b9c358d73c7	43f43eef-908a-4e37-bd71-dbc10801f06b	/products/cali/jugos-combo.jpg	0	2026-07-16 11:55:39.742207-05
3d00cf09-673a-4dc2-bc2c-5fc12c54b991	634ec946-7e9d-4bc6-959a-aca134ca5d86	/products/cali/gorra-cali.jpg	0	2026-07-16 11:55:39.742207-05
24019bc3-2a9f-43e8-98b7-ba6481a1e006	45bd5d14-e737-4b31-b646-22ca8c8df68b	/products/cali/tropical-fruit-combo.jpg	0	2026-07-16 11:55:39.742207-05
495862ac-def3-4691-bdab-610824249800	b3e2ad6b-9f39-40da-8ea9-d97ffd8846bd	/products/cali/arepa-choclo.jpg	0	2026-07-16 11:55:39.742207-05
390ab0d4-a978-4773-9a8d-98a7c0333b30	02580b3f-e5eb-44a0-92ac-775973954336	/products/cali/mango-fruit.jpg	0	2026-07-16 11:55:39.742207-05
94d5aa79-81ca-45d6-8c46-4b4b59363e0d	2ffdde71-1cf7-4907-9568-900c9930d693	/products/cali/sombrero-vueltiao.jpg	0	2026-07-16 11:55:39.742207-05
977a3e16-59d1-42e8-9818-046c5f913cf6	2529cb0c-eea8-4582-8005-4b4c3d0283bf	/products/cali/camiseta-salsa.jpg	0	2026-07-16 11:55:39.742207-05
8b93c139-13a3-4c62-85c9-ded9544daf6f	a809e7e2-fc57-4ef6-a32b-394e92f5d536	/products/cali/jugo-lulo.jpg	0	2026-07-16 11:55:39.742207-05
ed385fb9-02e7-479c-8f7d-938c9c4014b1	b057f1ce-ca03-40a4-9870-ce15c31c4a30	/products/cali/ropa-combo.jpg	0	2026-07-16 11:55:39.742207-05
39f89800-6221-48b1-9188-de4014569f9f	3831033a-7fb3-4e8b-9db8-99db8fa62770	/products/cali/papaya-fruit.jpg	0	2026-07-16 11:55:39.742207-05
743bc8fa-66ce-46e2-8cde-8c22510b6285	d4504a6f-4364-41b0-88da-0f8d7b8db398	/products/cali/viche-energetico.jpg	0	2026-07-16 11:55:39.742207-05
25693be7-486d-4809-8431-b8402786bb31	1d2c957b-72e7-4f8a-8eb4-5dd3c2cc3d0f	https://example.test/ci-empanada.jpg	0	2026-07-23 17:12:23.211531-05
99511973-100b-4ca4-adf4-469de87ef0b7	a1526412-8795-4d45-9f91-7e6cc0171571	https://example.test/ci-empanada.jpg	0	2026-07-23 17:12:27.494187-05
57309acd-243c-48a7-9915-aa0d45bba8fe	2efe5067-a4b9-4d51-9bf9-abd217cccad8	https://example.test/ci-empanada.jpg	0	2026-07-23 17:12:49.031478-05
b155e6e4-dd3b-491e-923c-6119b076fe32	154443ae-634e-415f-9c65-9639046a24a4	https://example.test/ci-empanada.jpg	0	2026-07-23 17:12:53.747374-05
1fcb657e-2f5f-4630-af3b-3d9b5bbc9770	fa6bb604-a930-4d5c-bb26-9f30dc97879c	https://example.test/ci-empanada.jpg	0	2026-07-23 17:13:09.309852-05
fcd276c8-525b-4012-abf4-735ed123c231	51f0fc5a-d6b9-4700-92d0-537ef6d58fae	https://example.test/ci-empanada.jpg	0	2026-07-23 17:13:34.099762-05
c4ed519a-7dcb-49c3-8c52-7c39fd7c5048	d5f793bf-55e7-48d9-ade0-dc52e801ddbd	https://example.test/ci-empanada.jpg	0	2026-07-23 17:13:59.741479-05
d9e2238c-161f-45ae-bfd0-90470d7bc221	4fae5fb3-06ec-4a16-8b3e-171224bb513e	https://example.test/ci-empanada.jpg	0	2026-07-23 17:14:05.906714-05
28f2cf91-9f2a-41ab-aa9d-9cfb5a9da5c7	5302fc08-c130-45fb-89ec-a5a6b367a1eb	https://example.test/ci-empanada.jpg	0	2026-07-23 17:14:36.887247-05
1e771cd9-dd33-4a94-9a3f-24507b9b6f51	8971af58-42de-4b8c-99a8-f5f63506a7e5	https://example.test/ci-empanada.jpg	0	2026-07-23 17:14:42.130804-05
26e23d32-505d-4824-a006-8da317a23c9a	a89db0a9-0607-41ef-bcef-a3527c043534	https://example.test/ci-empanada.jpg	0	2026-07-23 17:14:57.367702-05
ecfa21c8-3dff-4afa-9b25-198df787e5cd	d9a4719f-05da-4f41-b022-320b2547a16e	https://example.test/ci-empanada.jpg	0	2026-07-23 17:15:33.262619-05
ec984356-4c0f-4da9-bc99-34eb715a7256	02582c7b-edb1-437a-8019-a54539bfcba5	https://example.test/ci-empanada.jpg	0	2026-07-23 17:16:09.5877-05
47759b2f-37e4-48be-8d15-117ed8783173	71d7ce9e-206e-442f-8d59-4d4020a4d58b	https://example.test/ci-empanada.jpg	0	2026-07-23 17:51:36.936226-05
342d73a9-b359-482d-a679-3d99590c2da7	6142e5d6-5e7b-477c-9363-5a1924604f0b	https://example.test/ci-empanada.jpg	0	2026-07-23 17:52:44.284937-05
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, vendor_id, name, description, price, photo_url, created_at) FROM stdin;
02580b3f-e5eb-44a0-92ac-775973954336	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	Mango de azúcar x4	Cuatro mangos de azúcar frescos, cosechados en Palmira. Maduración al punto, listos para comer.	8000.00	/products/cali/mango-fruit.jpg	2026-06-09 11:55:41.343786-05
3831033a-7fb3-4e8b-9db8-99db8fa62770	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	Papaya hawaiana por kg	Papaya hawaiana dulce y jugosa, recién cortada. Porción aproximada de 1kg.	4500.00	/products/cali/papaya-fruit.jpg	2026-06-09 11:55:41.559166-05
45bd5d14-e737-4b31-b646-22ca8c8df68b	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	Combo tropical	Piña gold, lulo fresco y guanábana. 1.5kg de frutas tropicales del Valle.	12000.00	/products/cali/tropical-fruit-combo.jpg	2026-06-09 11:55:41.665899-05
e0195697-e5e0-4de7-94f6-b2d3ea3f6e90	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	Arepa de huevo x1	Arepa de maíz amarillo con huevo frito por dentro. Frita al momento, receta familiar.	2500.00	/products/cali/arepa-huevo.jpg	2026-06-09 11:55:41.785118-05
b3e2ad6b-9f39-40da-8ea9-d97ffd8846bd	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	Arepa de choclo x1	Arepa de choclo dulce, asada en tiesto. Acompañada de queso blanco.	3000.00	/products/cali/arepa-choclo.jpg	2026-06-09 11:55:41.914459-05
bfdd4fc6-7404-4c31-936c-2d0e24101a76	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	Combo 5 arepas mixtas	Cinco arepas surtidas: 2 de huevo, 2 de choclo y 1 de queso. Incluye hogao casero.	12000.00	/products/cali/arepas-combo.jpg	2026-06-09 11:55:42.062203-05
a809e7e2-fc57-4ef6-a32b-394e92f5d536	218d7369-a1ea-4814-b2e4-a1e3077b5da9	Jugo de lulo natural 16oz	Lulo fresco licuado al momento, sin azúcar añadida, hielo al gusto. 16 onzas.	4500.00	/products/cali/jugo-lulo.jpg	2026-06-09 11:55:42.168756-05
d4504a6f-4364-41b0-88da-0f8d7b8db398	218d7369-a1ea-4814-b2e4-a1e3077b5da9	Viche energético 12oz	Bebida ancestral del Pacífico: biche de jengibre, maracuyá y panela. Energético natural.	6000.00	/products/cali/viche-energetico.jpg	2026-06-09 11:55:42.337624-05
43f43eef-908a-4e37-bd71-dbc10801f06b	218d7369-a1ea-4814-b2e4-a1e3077b5da9	Combo 2 jugos + fruta	Dos jugos a elección (16oz c/u) + porción de fruta picada de la casa.	10000.00	/products/cali/jugos-combo.jpg	2026-06-09 11:55:42.496965-05
28e0b6c3-b11f-431f-9ea0-318c06b26bd4	78312336-9ad9-44bb-bac6-77e2ab9f8138	Mochila wayuu pequeña	Mochila wayuu tejida a mano por artesanas de Guapi. Diseño tradicional, tamaño pequeño. Cada pieza es única.	45000.00	/products/cali/mochila-wayuu.jpg	2026-06-09 11:55:42.657558-05
2ffdde71-1cf7-4907-9568-900c9930d693	78312336-9ad9-44bb-bac6-77e2ab9f8138	Sombrero vueltiao 15 vueltas	Sombrero vueltiao 100% caña flecha, 15 vueltas. Hecho en Tuchín, Córdoba por artesanos Zenú.	65000.00	/products/cali/sombrero-vueltiao.jpg	2026-06-09 11:55:42.78644-05
c0f59424-64f4-40f7-8a4f-c31ec9925d9d	78312336-9ad9-44bb-bac6-77e2ab9f8138	Collar de chaquiras multicolor	Collar artesanal de chaquiras de la región Pacífica. Diseño colorido ajustable, hecho a mano.	18000.00	/products/cali/collar-chaquiras.jpg	2026-06-09 11:55:42.884985-05
2529cb0c-eea8-4582-8005-4b4c3d0283bf	107fae37-48e7-4bbf-98ed-f6c5025d7d81	Camiseta salsa caleña	Camiseta de algodón con diseño exclusivo inspirado en la salsa y el orgullo caleño. Tallas S a XXL.	35000.00	/products/cali/camiseta-salsa.jpg	2026-06-09 11:55:42.985854-05
634ec946-7e9d-4bc6-959a-aca134ca5d86	107fae37-48e7-4bbf-98ed-f6c5025d7d81	Gorra plana bordada "Cali"	Gorra plana con bordado Cali 100% en algodón. Ajustable, unisex.	25000.00	/products/cali/gorra-cali.jpg	2026-06-09 11:55:43.094223-05
b057f1ce-ca03-40a4-9870-ce15c31c4a30	107fae37-48e7-4bbf-98ed-f6c5025d7d81	Combo 2 camisetas + gorra	Pack: 2 camisetas con diseños diferentes a elección + gorra Cali. Ahorra $10000 vs precio individual.	75000.00	/products/cali/ropa-combo.jpg	2026-06-09 11:55:43.204009-05
1d2c957b-72e7-4f8a-8eb4-5dd3c2cc3d0f	8984f4e5-5857-4dbb-83e3-daef4664f79f	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:12:23.193017-05
a1526412-8795-4d45-9f91-7e6cc0171571	51703b4e-4b1b-487f-996e-1d302abdf342	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:12:27.487055-05
2efe5067-a4b9-4d51-9bf9-abd217cccad8	b37b88e7-05b2-4111-ac4f-e816a1a17c4e	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:12:49.02254-05
154443ae-634e-415f-9c65-9639046a24a4	4404f87f-f767-4117-8a86-41a3682aada6	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:12:53.72753-05
fa6bb604-a930-4d5c-bb26-9f30dc97879c	1cc3afac-4bc4-4bbd-ad9e-737a20da9233	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:13:09.29733-05
51f0fc5a-d6b9-4700-92d0-537ef6d58fae	b65aa1ff-2245-4dd0-b73a-cb01e7bbd4dc	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:13:34.092712-05
d5f793bf-55e7-48d9-ade0-dc52e801ddbd	6e4f1910-7508-45c8-a83e-438aca664f37	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:13:59.733006-05
4fae5fb3-06ec-4a16-8b3e-171224bb513e	3d23a0bc-bd39-4bc8-897f-35b88835c746	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:14:05.899967-05
5302fc08-c130-45fb-89ec-a5a6b367a1eb	ef701367-0157-44a1-94d2-07159ff2fe9f	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:14:36.87866-05
8971af58-42de-4b8c-99a8-f5f63506a7e5	c2f6d3be-0e96-45eb-891b-f826d6c338e4	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:14:42.125274-05
a89db0a9-0607-41ef-bcef-a3527c043534	dd0c70d3-fadf-4097-8bb8-b20462ab7210	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:14:57.361844-05
d9a4719f-05da-4f41-b022-320b2547a16e	a09da636-b377-42b0-918d-492542ab3100	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:15:33.255206-05
02582c7b-edb1-437a-8019-a54539bfcba5	7cc740e4-0ff0-4e4d-98d9-553ee8c4eae0	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:16:09.580909-05
71d7ce9e-206e-442f-8d59-4d4020a4d58b	83e8e738-6bb4-4281-8521-4284603f20fe	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:51:36.929379-05
6142e5d6-5e7b-477c-9363-5a1924604f0b	2e7c4c07-87ce-455c-ba0e-dc076ec21950	CI Empanada	CI test product	2500.00	\N	2026-07-23 17:52:44.274942-05
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, user_id, email, name, role, created_at, token_version) FROM stdin;
a24e260f-e972-4692-92c2-41b6b89d9b54	3c681d60-2b25-4147-8f1d-6a1194aa6b49	post-cleanup-1784749427@hermes-test.com	Post Cleanup	buyer	2026-07-22 14:43:47.910749-05	1
11f0a317-9423-452e-a4ef-2bfaa82e37f8	3f056c1d-9345-4cec-a785-65f53a83b8b9	ci-test-mry2kf3x-31c440@ci.local	Test seller mry2kf3x-31c440	seller	2026-07-23 17:14:55.592494-05	1
ddab4075-2135-4678-8169-eb20ef143189	1138d83b-30b7-42e4-b4b6-a764f5928205	ci-test-mry3x0ez-e15cc6@ci.local	Test buyer mry3x0ez-e15cc6	buyer	2026-07-23 17:52:42.96233-05	1
b48e3d3d-e9a9-4199-9524-0f14f16aa29c	6bf1b231-ac50-4240-a37c-3fd587b93b63	cristito282828@gmail.com	cris	buyer	2026-06-22 14:20:32.324433-05	2
13bfaecf-7e02-42d3-9441-0d8a9800f81f	13d860dc-8dec-4c86-bd1f-5ac7d611f556	andresmoralesc2@gmail.com	Andrés Morales	buyer	2026-06-22 16:28:54.588289-05	2
15d0374f-74cb-4fd4-8135-f9dcd425efe0	0723c0c3-44f5-4801-8732-239de7a465b9	frutas.donjaime@gps.test	Jaime Ospina	seller	2026-05-30 11:41:33.491506-05	2
4e9295e7-ac73-4d88-8ede-cad219749072	aebddbe1-610f-4ed5-bc48-c713adf98915	arepas.lacalena@gps.test	María Eugenia Valencia	seller	2026-05-30 11:41:34.079192-05	2
605e439d-32f7-4a2a-b66a-325f5b9bc56e	8e6b239d-d265-4748-9975-702aec464b08	jugos.tropicales@gps.test	Carlos Andrés Perea	seller	2026-05-30 11:41:34.801732-05	2
e2e80832-b458-4951-a24e-dc83b8effbe6	057f6b0f-c50a-4628-ac7f-0b2a0112f084	artesanias.pacifico@gps.test	Luz Dary Cuero	seller	2026-05-30 11:41:35.388179-05	2
9706ff42-0b5b-4f12-9e49-79ec364fab47	506fbc78-0128-4c70-a1d7-c9a1706fd255	ropa.calimoda@gps.test	Andrés Felipe Castillo	seller	2026-05-30 11:41:35.895073-05	2
5c933de4-970d-412e-ae6e-8dc56d9fad10	67f78921-de4f-45b4-905c-a833ecc3d715	bot-1784750404-1@test.local	Bot Test	buyer	2026-07-22 15:00:05.552498-05	1
8ac35b76-bf42-4b00-b3eb-7a2d1d0fa2fd	246ac81d-a5fe-4aed-8c0b-db263eba6bed	bot-1784750404-2@test.local	Bot Test	buyer	2026-07-22 15:00:06.441783-05	1
fe068edc-f0cb-4b7e-bb39-8f8eb4d288ce	71102347-c89a-48f4-83fb-a891d87808be	bot-1784750404-3@test.local	Bot Test	buyer	2026-07-22 15:00:07.157809-05	1
96ae6256-8346-4f43-b234-5303b4b81b5f	131ae702-005b-47da-957a-4e21aa4d72ac	bot-1784750404-4@test.local	Bot Test	buyer	2026-07-22 15:00:08.063095-05	1
48224bed-6b2e-4412-8308-b1c301a90dcb	72c74745-543f-433e-9fda-986a9edcfb7c	bot-1784750404-5@test.local	Bot Test	buyer	2026-07-22 15:00:08.788051-05	1
d0c636c0-4792-481a-998f-94beccae16aa	4eac9150-630c-4a23-9b4e-5242cad757b9	katalinasisw@gmail.com	Katalina Henao	buyer	2026-07-10 10:40:19.626732-05	1
3ee6b99c-664d-4877-95fe-bd40763e1226	a622af45-c55e-4c1f-bca3-f729883bc984	jongrafico13@gmail.com	Jon	buyer	2026-07-10 10:40:44.320684-05	1
b62aa53a-38c2-4cb0-b0a3-fd721c5b1286	0374ffe5-3825-4d62-93cd-6c42d05fa284	bot-1784750404-6@test.local	Bot Test	buyer	2026-07-22 15:00:09.370921-05	1
75917cac-b284-4ea9-b822-5860869badb9	dfd85356-3161-4c65-bf07-5f83ec3c0a15	bot-1784750404-7@test.local	Bot Test	buyer	2026-07-22 15:00:09.921607-05	1
b44d0c25-f86a-448c-811b-01bfef7ad4a7	494111a5-7c49-4bac-8f6a-b7c633c399c2	bot-1784750404-8@test.local	Bot Test	buyer	2026-07-22 15:00:10.575064-05	1
3fe0cab3-4db6-4cdd-ad55-6e103960fba5	1d915986-e4b2-4131-b33d-3110330f9eff	bot-1784750404-9@test.local	Bot Test	buyer	2026-07-22 15:00:11.296654-05	1
50f4fab5-7f11-48d1-a7f9-621123384776	8d454b84-5ba8-4e43-b62f-941f9beb4d21	bot-1784750404-10@test.local	Bot Test	buyer	2026-07-22 15:00:11.901162-05	1
9f4dfb4d-9602-42a1-a929-964b15dbbd67	9d87eaf2-bf9c-4a44-9972-a562da16a1dd	bot-1784750404-11@test.local	Bot Test	buyer	2026-07-22 15:00:12.589066-05	1
469dd288-77c7-4908-a609-c078892184f6	967f61c7-61a6-494e-b1d5-96606a384aff	bot-1784750404-12@test.local	Bot Test	buyer	2026-07-22 15:00:13.105344-05	1
040ee8a1-d67e-47f1-b31b-c6c71b988a8d	908a0ea2-46a2-4e21-bc0e-7e1a7d62278c	bot-1784750404-13@test.local	Bot Test	buyer	2026-07-22 15:00:13.704356-05	1
3e6427e5-e156-439c-8bdf-0f106a718b1c	7d55d91e-d178-4153-b7ce-bb51827e5ef6	bot-1784750404-14@test.local	Bot Test	buyer	2026-07-22 15:00:14.307245-05	1
e50c8acb-2e3f-4daa-abde-1b4a7adf115f	681da818-7529-4b68-9089-94f842d8ab5f	bot-1784750404-15@test.local	Bot Test	buyer	2026-07-22 15:00:14.942704-05	1
7d5d7fe7-cfa0-4581-b690-3838999d1005	9daafc49-876a-4309-ad8f-3424b667f252	bot-1784750404-16@test.local	Bot Test	buyer	2026-07-22 15:00:15.706838-05	1
b266a9d5-afc7-4e37-92fe-58ccce98f9c4	f0e6c31f-30fe-428c-8ea0-a34cc50ed9ae	bot-1784750404-17@test.local	Bot Test	buyer	2026-07-22 15:00:16.487686-05	1
057b42d2-8661-4e15-8b08-e9416038509f	8e43f2ab-3387-4e3e-ab39-92be26aa76a9	bot-1784750404-18@test.local	Bot Test	buyer	2026-07-22 15:00:17.466539-05	1
7c30c7a0-0b07-4d40-ac86-0ec64ab7a0fd	8f78c772-db6b-431f-aaa0-e71465893376	bot-1784750404-19@test.local	Bot Test	buyer	2026-07-22 15:00:18.07614-05	1
a4890b11-a22f-4d38-a8e8-03ca6e36b2ac	4b89580c-6385-4d56-b032-c8d5ca571311	bot-1784750404-20@test.local	Bot Test	buyer	2026-07-22 15:00:18.603328-05	1
70295cf0-4f17-4b50-8ea8-79332405814c	aaaa1111-1111-1111-1111-aaaaaaaaaaaa	audit-test@barriotech.co	Audit Test	buyer	2026-07-23 11:18:53.108174-05	1
ab90c6d5-e9f0-4e10-a44c-853fc68e981c	68a4164c-2d5a-495e-8309-b23864a68542	ci-test-mry2l74r-2b4728@ci.local	Test seller mry2l74r-2b4728	seller	2026-07-23 17:15:32.255203-05	1
a6ccff10-7dfa-4384-9a96-2b93c6808d05	79f86ba9-f562-45a4-929a-f9fe13d52cd5	ci-test-mry3x2pl-7f84b2@ci.local	Test buyer mry3x2pl-7f84b2	buyer	2026-07-23 17:52:45.732475-05	1
79ed80de-559e-46b0-93ca-ed05ece25a46	ef914522-e769-45cb-9cd5-977b076c608d	ci-test-mry3x3jx-9df0f7@ci.local	Test buyer mry3x3jx-9df0f7	buyer	2026-07-23 17:52:46.72683-05	1
771c7823-28a9-4ee3-86fb-afe3a8ccdc69	d9f87de1-51c8-4e83-a749-0ca28d099664	new-seller-1784847167353@test.local	Fresh Seller	seller	2026-07-23 17:52:47.831901-05	1
23a3b5c4-0750-431a-ad8d-13ed1375f284	9f779994-accb-4e3d-9e8a-57a4874040d4	new-buyer-1784847167865@test.local	Fresh Buyer	buyer	2026-07-23 17:52:48.344095-05	1
013bead8-e428-4607-b86b-45af0673deba	7950c817-5ff1-41a6-99aa-9681c3e93af3	ci-test-mry3x567-8bd901@ci.local	Test seller mry3x567-8bd901	seller	2026-07-23 17:52:48.835597-05	1
a29b92c5-0952-4130-9704-f195886b96bf	a52a1e88-60af-4475-8cc1-72549ada4791	\N	Phone Only Seller	seller	2026-07-23 17:52:49.84888-05	1
303a2d14-89d4-4a0f-9b88-9a9d7aeb2565	df011129-d85d-48e0-8ff2-4089c0c8a9e1	\N	First	buyer	2026-07-23 17:52:50.390842-05	1
a76a63d1-d3e2-4037-b573-710b09d8f283	4cd88e16-2c5b-4f73-adbd-31687cd2479c	\N	Phone Login Test	buyer	2026-07-23 17:52:51.404468-05	1
ef484b7c-945c-4e3a-8a83-423b02fee509	afc020d6-8c62-441a-a43e-9526018e082e	andresmortal1@gmail.com	Andrés Morales	buyer	2026-06-30 19:45:23.137052-05	3
840eb8dc-afd7-41fd-ab14-c5cf8d60ab7c	01dec765-be94-4c67-8846-59dc5632a5cc	ci-test-mry2l97r-5492e2@ci.local	Test buyer mry2l97r-5492e2	buyer	2026-07-23 17:15:34.62478-05	1
236503f3-5b08-4603-a1d2-91d1c3ce3467	388d9c08-9f4b-41f0-8063-d106ad467f24	ci-test-mry2la0v-83c1ad@ci.local	Test buyer mry2la0v-83c1ad	buyer	2026-07-23 17:15:35.622464-05	1
4cfb04d2-3025-4758-9235-057494d8822b	8570bc16-2c62-4272-a085-ac8cef7a8a2d	new-seller-1784844936254@test.local	Fresh Seller	seller	2026-07-23 17:15:36.719736-05	1
42382d41-b361-4e92-b51e-2a275ae410f3	04c0f8a6-1d9f-4146-ac02-37644a1ebaf7	new-buyer-1784844936762@test.local	Fresh Buyer	buyer	2026-07-23 17:15:37.187502-05	1
5176d1bf-b848-41e0-b5a4-bc718884eb07	1194fa3c-f9ba-478a-8ea3-06e21fe605ca	ci-test-mry2lbl9-1895ae@ci.local	Test seller mry2lbl9-1895ae	seller	2026-07-23 17:15:37.665667-05	1
bd21cd75-3e37-4c27-bda1-c4634b55125f	7be30b09-9afe-433a-932b-bcd384a401ec	\N	Phone Only Seller	seller	2026-07-23 17:15:38.726708-05	1
646d1214-107d-4d88-97ea-b52a1c59170a	24d1d4f1-6236-4d31-badd-846670de514e	\N	First	buyer	2026-07-23 17:15:39.37414-05	1
05c41e47-a5ec-44d6-87bf-68106013ad8b	7f86fc8c-bc26-40db-bc7c-f6d1275fdc11	\N	Phone Login Test	buyer	2026-07-23 17:15:40.455994-05	1
ded9b88b-1319-405e-af48-e4050dfe7e1e	619a6a94-db26-4d63-ab74-f911e42ec8f2	ci-test-mry2lyzv-8fd6a8@ci.local	Test buyer mry2lyzv-8fd6a8	buyer	2026-07-23 17:16:08.058524-05	1
87232528-bab5-4ab3-b18f-101e76b66ae7	db76b6ef-60c8-408f-8913-eeca2c632c4c	ci-test-mry2lz4d-f95861@ci.local	Test seller mry2lz4d-f95861	seller	2026-07-23 17:16:08.533986-05	1
1201d5d1-794a-4bbd-83f2-da3ecf6218e9	11102364-7a38-4b24-af96-5063147a1a49	ci-test-mry2lxk8-84bd83@ci.local	Test buyer mry2lxk8-84bd83	buyer	2026-07-23 17:16:06.253786-05	1
a2fc4fa3-3316-4b91-a508-44a35b8cd4de	c02bb3ef-76c6-49b1-b3bd-8336857caff0	new-seller-1784844401191@test.local	Fresh Seller	seller	2026-07-23 17:06:41.659214-05	1
82849daa-3684-4bf9-84ea-13d7412d9ab8	cfa5c63a-16cd-41d4-8de1-51abd875c2c5	new-buyer-1784844401759@test.local	Fresh Buyer	buyer	2026-07-23 17:06:42.270201-05	1
d29c5c3f-fe66-469d-87a3-66b49e5530d8	63e1dcb0-da46-4a94-976f-2d7b9bcf2633	\N	Phone Only Seller	seller	2026-07-23 17:06:42.816405-05	1
a94b85aa-d8fa-45bd-ae53-110d15e58edf	88ddebae-dc18-4a6f-a923-08561ccb6367	\N	First	buyer	2026-07-23 17:06:43.359236-05	1
1e7837ad-bd91-4f1f-9c4b-dc87d47f5a9c	2068767e-9e35-4d75-9d0c-1dc72f686b9f	\N	Phone Login Test	buyer	2026-07-23 17:06:44.309383-05	1
a3cad777-af50-45fd-8d57-dc920ab6dbca	a24b13fe-7867-4360-87f9-b5fd49cbe422	new-seller-1784844409195@test.local	Fresh Seller	seller	2026-07-23 17:06:49.713832-05	1
f4d526da-bdfe-4413-9c99-f451f17adcad	47119788-1621-4d8d-892b-64427d7a2e60	new-buyer-1784844409752@test.local	Fresh Buyer	buyer	2026-07-23 17:06:50.183784-05	1
111966cc-255b-408a-82c9-58909abc85c3	668e7e9f-a6de-4d21-b65a-11407f073060	\N	Phone Only Seller	seller	2026-07-23 17:06:50.677948-05	1
9458a039-167f-48d5-a6ba-4720dc64b391	8fdfc246-a7d7-423f-83fd-f43002fc6f47	\N	First	buyer	2026-07-23 17:06:51.198114-05	1
59dabd0c-272d-47a4-898b-d56f445d5e6b	8b5c8fc8-5282-4ffe-b9a7-578f66e2b251	\N	Phone Login Test	buyer	2026-07-23 17:06:52.077063-05	1
54ddb78a-2f74-45b0-abd6-63ab50eb926b	f0a2fbf1-a9d6-4521-85c6-5b694161487c	ci-test-mry2m1dl-ac7d8b@ci.local	Test buyer mry2m1dl-ac7d8b	buyer	2026-07-23 17:16:11.183259-05	1
8cb8f5ae-bb34-46df-8bca-b3bf8cf098b3	1275a3d5-71fc-4ac7-94cc-496da0bfef2c	ci-test-mry2m27r-219397@ci.local	Test buyer mry2m27r-219397	buyer	2026-07-23 17:16:12.177675-05	1
094bbb57-8dd5-4878-a0a9-e1b50e872d73	7c6cf21d-4fe1-4096-ac76-cd8ffdd8ab78	new-seller-1784844973152@test.local	Fresh Seller	seller	2026-07-23 17:16:13.621279-05	1
c27eed4e-ff02-4791-8145-15a79cb35f7d	c8152626-746b-4ffe-803a-ff1eaccd28f4	new-buyer-1784844973667@test.local	Fresh Buyer	buyer	2026-07-23 17:16:14.080878-05	1
8de2b5a9-ae23-4066-b26f-bae5a73fec0d	4887726f-ada6-4764-af29-5c422b745275	ci-test-mry2m420-2e92a8@ci.local	Test seller mry2m420-2e92a8	seller	2026-07-23 17:16:14.538183-05	1
5b175566-53a8-4526-89bd-d2bb76b6d6f0	034c126b-3a33-4b57-9cdd-39422557890c	\N	Phone Only Seller	seller	2026-07-23 17:16:15.692717-05	1
4cd429cf-3ab7-40bd-905e-38e0c3e86fc4	59528487-bafa-4ba3-9987-65f9d1ca050d	\N	First	buyer	2026-07-23 17:16:16.296233-05	1
0ab427e5-9ec2-4bea-8dd8-f4115f273bd0	e25e9d5a-d3d2-4c1f-b86c-bac64dc079d8	\N	Phone Login Test	buyer	2026-07-23 17:16:17.32165-05	1
3f342623-d0cc-4cc9-b0b8-74c613a248e6	c9829328-0d54-42e7-afe2-6aeeaa91cf11	ci-test-mry2g2zf-abfc2d@ci.local	Test buyer mry2g2zf-abfc2d	buyer	2026-07-23 17:11:33.253997-05	1
55431916-f0e5-4313-8b6f-802c53343bdf	eb68604d-4d57-490a-89d3-1d55ea7abc8b	ci-test-mry2g42q-dd3ceb@ci.local	Test buyer mry2g42q-dd3ceb	buyer	2026-07-23 17:11:34.65531-05	1
2ee0d03b-4701-492d-a37f-de23e693fdcc	4b7babcd-08c0-4b2c-9962-8ca01da5fce3	ci-test-mry2g5jb-33a332@ci.local	Test buyer mry2g5jb-33a332	buyer	2026-07-23 17:11:36.516781-05	1
eb4c740b-4149-4cbb-bbc7-6cf8334842ad	41f8c8ee-81cc-4266-b78d-2ad9b60d77e9	ci-test-mry2g6bf-fe02b3@ci.local	Test buyer mry2g6bf-fe02b3	buyer	2026-07-23 17:11:37.532208-05	1
8959f652-b38f-4cb8-a805-78e8e3c7ea2d	7cdd61fc-173a-4ac9-b729-c36e6ff11981	new-seller-1784844698184@test.local	Fresh Seller	seller	2026-07-23 17:11:38.613985-05	1
d49ee4dc-0fde-495a-b5e5-a152785bfb55	85e35802-4818-4fb9-9563-9cca9a818bb9	new-buyer-1784844698642@test.local	Fresh Buyer	buyer	2026-07-23 17:11:39.103546-05	1
da2c87fe-77d0-4555-8bf7-d04be41ccf1e	13481b07-567a-453b-bd8e-41a49de3514b	ci-test-mry2g7vt-149335@ci.local	Test seller mry2g7vt-149335	seller	2026-07-23 17:11:39.579867-05	1
958016b5-ac56-4014-95e9-aea1957642d0	ac9fd34c-3765-4177-8783-720685e4aabf	\N	Phone Only Seller	seller	2026-07-23 17:11:40.554727-05	1
22cac88f-5b63-423f-b44a-56f282ec3a1d	6f1df609-6dc2-4bd3-91cb-cff3c4d46647	\N	First	buyer	2026-07-23 17:11:41.089817-05	1
8c68b682-b793-470e-a9e6-702809f1cabe	201bcc60-6004-4819-ab3e-2da635f4952a	\N	Phone Login Test	buyer	2026-07-23 17:11:42.221649-05	1
6c0d41d4-7f08-4509-8591-e1714ee93a56	a286c88b-b997-44a9-b7ab-6cc652fa5065	ci-test-mry3vj0u-1ec258@ci.local	Test buyer mry3vj0u-1ec258	buyer	2026-07-23 17:51:33.581723-05	1
15b255d9-4641-4b63-a4dd-fcc0bf59132d	8d10abe7-e7ea-4497-933b-3dc5c0278d4d	ci-test-mry2gqpg-86b75b@ci.local	Test seller mry2gqpg-86b75b	seller	2026-07-23 17:12:04.060914-05	1
a57643d9-aec3-4f5d-90a8-7902e4d3c8d6	d81a1e45-cc2e-4c45-9b9a-377a3b07eb12	ci-test-mry2guqu-336261@ci.local	Test seller mry2guqu-336261	seller	2026-07-23 17:12:09.232813-05	1
fe80335c-5300-4152-b104-2572c165ab3b	33f80b76-b1e6-46c1-b3b1-7c19af1a8db4	ci-test-mry2h53d-c6d1ee@ci.local	Test seller mry2h53d-c6d1ee	seller	2026-07-23 17:12:22.597072-05	1
16ce8f41-1320-49fc-b8da-36adf1cf6198	461579e9-e451-40aa-9d31-881d8d987cb8	ci-test-mry2h8fu-f67404@ci.local	Test seller mry2h8fu-f67404	seller	2026-07-23 17:12:26.924137-05	1
15f7ad61-37b2-42a0-8c02-2beaf92cba05	cf6fdd5a-86ae-48b3-adda-25e1f363be20	ci-test-mry2hoyt-6e4764@ci.local	Test seller mry2hoyt-6e4764	seller	2026-07-23 17:12:48.395227-05	1
ba98063c-bc61-4447-98df-76351008de6b	98af4b2e-d943-4817-a2ec-1965140a9907	ci-test-mry2hsmp-862804@ci.local	Test seller mry2hsmp-862804	seller	2026-07-23 17:12:53.121096-05	1
85504939-b83b-40c8-84c6-94901ef7e01f	c1207ef7-4245-42a0-9f65-2a770aa9c870	ci-test-mry2i4jb-322125@ci.local	Test seller mry2i4jb-322125	seller	2026-07-23 17:13:08.595092-05	1
646601f2-9dcf-47b5-84b9-0c3d4163b838	414b39b6-5390-4711-bf30-d525f73014ce	ci-test-mry2insc-f78a47@ci.local	Test seller mry2insc-f78a47	seller	2026-07-23 17:13:33.587196-05	1
3ffb5603-66f1-4772-9514-7994bda9845e	8008c6d5-88b8-4b6c-b6be-bec5613e852e	ci-test-mry2j3ff-414463@ci.local	Test seller mry2j3ff-414463	seller	2026-07-23 17:13:53.81032-05	1
bc84faa6-3932-48be-97e0-ca6e6f6f0d64	c61c74a2-10cf-4b1e-862a-3a02dd029844	ci-test-mry2j7ih-e4695a@ci.local	Test seller mry2j7ih-e4695a	seller	2026-07-23 17:13:59.126502-05	1
bb370842-6f3d-43f4-911b-2ed644c14d10	e790a742-94e6-4e7b-9f03-a3b2e0fb3ab5	ci-test-mry2jccu-144e3c@ci.local	Test seller mry2jccu-144e3c	seller	2026-07-23 17:14:05.352451-05	1
dc52c64e-17ba-418b-a8b8-0138699352e9	b20a67ed-fc47-485f-83b5-662196d76fd9	ci-test-mry2jrvs-c4043c@ci.local	Test buyer mry2jrvs-c4043c	buyer	2026-07-23 17:14:25.561434-05	1
8a7dcb48-25f7-4845-8fb0-536f13ff1255	d7ad375c-94f2-4065-84c5-3947682709a0	ci-test-mry2jt20-c242e9@ci.local	Test buyer mry2jt20-c242e9	buyer	2026-07-23 17:14:26.944832-05	1
81aee527-c3e3-4b30-9e8e-e30380f16d9c	2506ba2a-831c-4bf1-9697-8df11d9c1e69	ci-test-mry2juj8-de3fe6@ci.local	Test buyer mry2juj8-de3fe6	buyer	2026-07-23 17:14:28.889829-05	1
3a0453dc-78aa-4ea6-87fd-f4db6ce49540	0d35f76c-58a2-4fa1-bf5c-b345018e2cf2	ci-test-mry2jv9t-fd4d7d@ci.local	Test buyer mry2jv9t-fd4d7d	buyer	2026-07-23 17:14:29.868963-05	1
d2eda067-b477-43cf-a29c-54b5dc25f568	fa287960-7b8a-4379-baaa-66ef6f32d1fe	new-seller-1784844870584@test.local	Fresh Seller	seller	2026-07-23 17:14:31.041356-05	1
19d3485c-ac15-4bd5-aa3f-6dd2e6636531	25d9ca18-48f6-4407-b8f7-3e8862e983ee	new-buyer-1784844871061@test.local	Fresh Buyer	buyer	2026-07-23 17:14:31.502067-05	1
7acb52bb-7a4d-4bf9-b513-f44ea55b399b	2dbb3df0-c184-402b-89ef-15fc0eb4646f	ci-test-mry2jwwq-27e315@ci.local	Test seller mry2jwwq-27e315	seller	2026-07-23 17:14:31.942979-05	1
9c8ad310-2da7-4fb6-a567-8603bad978d7	e47957cd-0322-481d-87a5-683c2a106072	\N	Phone Only Seller	seller	2026-07-23 17:14:32.945485-05	1
807ab7e1-a67d-42c7-9b21-73f701658879	7b5fe3c0-af1c-4ded-a9c0-1d4ee112f907	\N	First	buyer	2026-07-23 17:14:33.49942-05	1
ca9f21bc-6627-4952-b0e3-427eaedb3da0	3e134f87-188f-4a5b-b85a-8a6cbd8f2432	\N	Phone Login Test	buyer	2026-07-23 17:14:34.466733-05	1
a10d8462-c6ea-4170-b6e6-74cf3daa69de	5350473a-4730-4945-8a3e-b90b452da51d	ci-test-mry2k08x-24e9a0@ci.local	Test seller mry2k08x-24e9a0	seller	2026-07-23 17:14:36.308066-05	1
daa7fdbd-e1af-4fd8-b421-442e4d5470a3	f55e540e-b65f-4276-9158-526490610b9f	ci-test-mry2k33n-969470@ci.local	Test seller mry2k33n-969470	seller	2026-07-23 17:14:40.40304-05	1
ddf28625-064d-4622-9808-009916f32b17	791e4727-5851-482b-afe2-2371392c79f3	ci-test-mry2k5h1-a30d6d@ci.local	Test buyer mry2k5h1-a30d6d	buyer	2026-07-23 17:14:43.062685-05	1
ab579e6b-5ce6-4a7c-8875-b29e3112cfe4	c6a937e4-5124-41b4-a198-e5ad1e99aacc	ci-test-mry2k690-92c448@ci.local	Test buyer mry2k690-92c448	buyer	2026-07-23 17:14:44.070416-05	1
4ea79ba7-6129-45f7-91cf-72a474616a0f	e007c9a0-31cf-4e23-9c2b-66584faad617	new-seller-1784844884671@test.local	Fresh Seller	seller	2026-07-23 17:14:45.121996-05	1
d50ae454-47b4-431f-aacd-2e49e4a62499	5685c1b4-d004-473f-a8e2-2749cbfae92e	new-buyer-1784844885150@test.local	Fresh Buyer	buyer	2026-07-23 17:14:45.608261-05	1
0cb84762-c32b-4752-b283-f0983614e4ea	bf59852c-8666-4f58-b5ae-b40369271ed7	ci-test-mry2k7sg-3b9b3d@ci.local	Test seller mry2k7sg-3b9b3d	seller	2026-07-23 17:14:46.073711-05	1
361ca621-e709-4616-8392-d86d982cf199	5fc96667-49f1-4f44-97ee-245cfba994d7	\N	Phone Only Seller	seller	2026-07-23 17:14:47.138998-05	1
e16ea200-2766-4c16-a93e-82b87fd26db3	6628cfc3-d739-4b24-b805-57c466dc1f0c	\N	First	buyer	2026-07-23 17:14:47.6539-05	1
f06d8a9d-8242-4109-a6b5-7e7cb372c994	8c672955-d4d1-4d9e-b308-228a07ecd857	\N	Phone Login Test	buyer	2026-07-23 17:14:48.738895-05	1
9582bde7-928b-49a3-ba52-859ec9129974	c9c5e252-1f4c-4f53-a82c-56f74a52af4d	ci-test-mry2kdcq-3d95bc@ci.local	Test buyer mry2kdcq-3d95bc	buyer	2026-07-23 17:14:53.431118-05	1
84689891-7b7b-4fb3-b804-b91edb1fc587	60677628-0b09-45ce-8130-85c619700a5f	ci-test-mry3vk31-5dd10b@ci.local	Test seller mry3vk31-5dd10b	seller	2026-07-23 17:51:35.32404-05	1
60f0308a-dcc1-4400-a12a-40e7273cfcb0	af9684cc-46f5-487b-830f-1f303f3d2d68	ci-test-mry2k1i5-49ec36@ci.local	Test buyer mry2k1i5-49ec36	buyer	2026-07-23 17:14:38.119337-05	1
82bfa300-ad65-444b-aa7e-86a64ee1ac9b	1c7d8717-6837-4184-b967-d1436ba40370	ci-test-mry2k31c-3ac225@ci.local	Test buyer mry2k31c-3ac225	buyer	2026-07-23 17:14:40.092383-05	1
a90cd3a7-3331-4080-bf18-251894e30424	f6464337-2293-4557-a0bf-1515d5ebe0d1	ci-test-mry3vkel-739407@ci.local	Test buyer mry3vkel-739407	buyer	2026-07-23 17:51:35.801764-05	1
00cdaec9-586e-4252-b7e3-ccad3ddff005	ed872e8f-a8b9-4236-b92f-ab181c77e4dc	ci-test-mry3vn6t-4e27c7@ci.local	Test buyer mry3vn6t-4e27c7	buyer	2026-07-23 17:51:38.876441-05	1
b7096187-5cb1-4883-bce7-dd585d428a6f	838cc6b0-1cb4-4142-9e83-af6b78599a0e	ci-test-mry3vnxv-026ffd@ci.local	Test buyer mry3vnxv-026ffd	buyer	2026-07-23 17:51:39.804478-05	1
dcc794e3-8576-410b-a635-3bce0e8b4a34	a06089d7-84fd-4ecd-a03e-1805819a797c	new-seller-1784847100429@test.local	Fresh Seller	seller	2026-07-23 17:51:40.880484-05	1
22ed26f3-1ddc-449e-8a05-4991f83c8ee0	8d3f442e-8854-4a68-868c-20c115b8190d	new-buyer-1784847100908@test.local	Fresh Buyer	buyer	2026-07-23 17:51:41.491201-05	1
7783c5a8-ed59-489f-85f7-a200d2353808	1327609f-392f-4a1d-8cd8-6a0e60883948	ci-test-mry3vpkv-783021@ci.local	Test seller mry3vpkv-783021	seller	2026-07-23 17:51:41.956035-05	1
cf6f184d-521a-4f0d-abb8-1015e03b2d93	4115b67c-8b2b-4c95-9bcf-2174f3c30c97	\N	Phone Only Seller	seller	2026-07-23 17:51:43.114477-05	1
a3e6cf74-3acf-46a1-961a-9c6ddb625131	76bd9b02-1236-4131-a527-25be71b6c0f6	\N	First	buyer	2026-07-23 17:51:44.007093-05	1
0a953db6-cfeb-47e4-b755-9d6c7221395a	4c744bbc-8c73-4cbc-ab29-cc077802957e	\N	Phone Login Test	buyer	2026-07-23 17:51:44.968402-05	1
d5b542a0-afcb-458d-997c-24726f7574b6	e8c8d9e8-d7a3-4f29-a4c9-89899db0f2c2	info@andresmorales.com.co	Andres Morales	seller	2026-07-22 09:16:46.312921-05	2
2c1fce6a-0ad2-4e67-9301-d1d9ac40eeb6	be2d04a0-6be5-4b72-b7e6-4b721cc1410d	ci-test-mry2kene-2dd704@ci.local	Test buyer mry2kene-2dd704	buyer	2026-07-23 17:14:55.01388-05	1
6f78bbb7-db08-4350-8d25-dc6821152fbd	0e74a23c-eb41-42af-a4a0-08d047f17234	ci-test-mry2kh9v-0e3161@ci.local	Test buyer mry2kh9v-0e3161	buyer	2026-07-23 17:14:58.365209-05	1
d7de964a-03a2-4fbc-bf42-9c14fadce153	0a3eb64d-bbfb-4137-9a80-907b0dd04a10	ci-test-mry2ki4y-6dff2b@ci.local	Test buyer mry2ki4y-6dff2b	buyer	2026-07-23 17:14:59.49737-05	1
09747573-0b3e-419e-bf1b-321d3997e81b	34c9d2fe-2445-4034-9e73-208323817d79	new-seller-1784844900400@test.local	Fresh Seller	seller	2026-07-23 17:15:01.316819-05	1
1e3592f3-fde8-445c-819b-9075c886c3aa	d20bdb35-2f60-4570-863c-df8e6edea9d0	new-buyer-1784844901340@test.local	Fresh Buyer	buyer	2026-07-23 17:15:01.806534-05	1
5c418992-5589-48d5-9d75-c6c3ef173dc6	4d50e9c0-5b96-4969-9131-85ef648d342b	ci-test-mry2kkc8-39aa6b@ci.local	Test seller mry2kkc8-39aa6b	seller	2026-07-23 17:15:02.366191-05	1
d4232837-e7f9-4ee8-b657-cb222aaa9790	383ac6aa-d725-4d6c-bc92-d4f99882842f	\N	Phone Only Seller	seller	2026-07-23 17:15:03.867817-05	1
e1638e19-2607-4328-98cf-57757715f1d6	86a2c8b1-90b7-47c6-b90a-6a6944f49414	\N	First	buyer	2026-07-23 17:15:04.859068-05	1
2f06008b-5945-4f4b-8055-44de798fb47e	795720a4-19ac-4e1b-8b07-4f45c5823fd8	\N	Phone Login Test	buyer	2026-07-23 17:15:06.040138-05	1
4bd50c18-75f6-4e0c-9707-861db13c5c42	9be1b916-0010-4f7e-89dc-d345b2452d5b	ci-test-mry2l5mp-4b5315@ci.local	Test buyer mry2l5mp-4b5315	buyer	2026-07-23 17:15:30.15546-05	1
619c8e0a-1fc0-424b-b231-8727a5f157e9	56b850df-3abb-4812-9498-2f2ccba31508	ci-test-mry2l71u-9bef43@ci.local	Test buyer mry2l71u-9bef43	buyer	2026-07-23 17:15:31.925186-05	1
a9eb66c5-c914-4db5-9813-6b290ac0afd5	21edbd2d-92b8-458a-933e-0337e799bb60	ci-test-mry3wz3y-91e483@ci.local	Test buyer mry3wz3y-91e483	buyer	2026-07-23 17:52:41.095764-05	1
c05793ca-1e97-4305-bf79-c79c4d567e8f	0cebc6f7-4862-4ee3-9731-ac7ad9450830	ci-test-mry3x0i0-294823@ci.local	Test seller mry3x0i0-294823	seller	2026-07-23 17:52:43.194902-05	1
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at) FROM stdin;
\.


--
-- Data for Name: rate_limit_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rate_limit_attempts (id, ip, bucket, attempted_at) FROM stdin;
5472	ci-test-mry3wz3y-91e483@ci.local	login_account	2026-07-23 17:52:41.214542-05
5475	ci-test-mry3wz3y-91e483@ci.local	login_account	2026-07-23 17:52:41.766126-05
5488	ci-test-mry3x0ez-e15cc6@ci.local	login_account	2026-07-23 17:52:44.161973-05
5473	unknown	notifications_read	2026-07-23 17:52:41.703099-05
5262	ci-test-mry2kdcq-3d95bc@ci.local	login_account	2026-07-23 17:14:53.552134-05
5367	ci-test-mry2lxk8-84bd83@ci.local	login_account	2026-07-23 17:16:06.446947-05
5264	ci-test-mry2kdcq-3d95bc@ci.local	login_account	2026-07-23 17:14:54.07035-05
5265	unknown	notifications_read	2026-07-23 17:14:54.510807-05
5279	frutas.donjaime@gps.test	login_account	2026-07-23 17:14:56.741127-05
5369	ci-test-mry2lxk8-84bd83@ci.local	login_account	2026-07-23 17:16:06.971254-05
5370	unknown	notifications_read	2026-07-23 17:16:07.546084-05
5285	frutas.donjaime@gps.test	login_account	2026-07-23 17:14:57.33578-05
5383	ci-test-mry2lyzv-8fd6a8@ci.local	login_account	2026-07-23 17:16:09.544942-05
5486	ci-test-mry3x0i0-294823@ci.local	login_account	2026-07-23 17:52:43.730635-05
5493	nobody-here@nowhere.local	login_account	2026-07-23 17:52:44.677476-05
5496	ci-test-mry3x2pl-7f84b2@ci.local	login_account	2026-07-23 17:52:45.82051-05
5499	ci-test-mry3x3jx-9df0f7@ci.local	login_account	2026-07-23 17:52:46.798252-05
5508	ci-test-mry3x567-8bd901@ci.local	login_account	2026-07-23 17:52:48.922187-05
5515	unknown	register	2026-07-23 17:52:50.919746-05
5516	unknown	login	2026-07-23 17:52:51.439421-05
5517	3847170908	login_account	2026-07-23 17:52:51.446946-05
5518	unknown	login	2026-07-23 17:52:51.977358-05
5519	just-some-text	login_account	2026-07-23 17:52:52.046625-05
5377	ci-test-mry2lyzv-8fd6a8@ci.local	login_account	2026-07-23 17:16:08.583577-05
5268	frutas.donjaime@gps.test	login_account	2026-07-23 17:14:55.017542-05
5380	ci-test-mry2lz4d-f95861@ci.local	login_account	2026-07-23 17:16:09.074683-05
5273	frutas.donjaime@gps.test	login_account	2026-07-23 17:14:55.593688-05
5483	ci-test-mry3x0ez-e15cc6@ci.local	login_account	2026-07-23 17:52:43.266503-05
5388	nobody-here@nowhere.local	login_account	2026-07-23 17:16:10.102027-05
5391	ci-test-mry2m1dl-ac7d8b@ci.local	login_account	2026-07-23 17:16:11.240454-05
5394	ci-test-mry2m27r-219397@ci.local	login_account	2026-07-23 17:16:12.51168-05
5403	ci-test-mry2m420-2e92a8@ci.local	login_account	2026-07-23 17:16:14.605018-05
5412	3844976858	login_account	2026-07-23 17:16:17.37044-05
5414	just-some-text	login_account	2026-07-23 17:16:17.848812-05
5272	ci-test-mry2kene-2dd704@ci.local	login_account	2026-07-23 17:14:55.59326-05
5275	frutas.donjaime@gps.test	login_account	2026-07-23 17:14:56.178614-05
5426	frutas.donjaime@gps.test	login_account	2026-07-23 17:51:35.860564-05
5277	ci-test-mry2kene-2dd704@ci.local	login_account	2026-07-23 17:14:56.322723-05
5281	ci-test-mry2kf3x-31c440@ci.local	login_account	2026-07-23 17:14:56.880373-05
5430	ci-test-mry3vkel-739407@ci.local	login_account	2026-07-23 17:51:36.080485-05
5286	nobody-here@nowhere.local	login_account	2026-07-23 17:14:57.337742-05
5436	frutas.donjaime@gps.test	login_account	2026-07-23 17:51:37.181419-05
5291	ci-test-mry2kh9v-0e3161@ci.local	login_account	2026-07-23 17:14:58.456256-05
5439	frutas.donjaime@gps.test	login_account	2026-07-23 17:51:37.794837-05
5294	ci-test-mry2ki4y-6dff2b@ci.local	login_account	2026-07-23 17:14:59.569194-05
5441	nobody-here@nowhere.local	login_account	2026-07-23 17:51:37.925222-05
5303	ci-test-mry2kkc8-39aa6b@ci.local	login_account	2026-07-23 17:15:02.507735-05
5312	3844905384	login_account	2026-07-23 17:15:06.080023-05
5314	just-some-text	login_account	2026-07-23 17:15:06.655141-05
5318	unknown	notifications_read	2026-07-23 17:15:30.843613-05
5317	ci-test-mry2l5mp-4b5315@ci.local	login_account	2026-07-23 17:15:30.366653-05
5417	ci-test-mry3vj0u-1ec258@ci.local	login_account	2026-07-23 17:51:33.689064-05
5420	unknown	notifications_read	2026-07-23 17:51:34.614221-05
5424	frutas.donjaime@gps.test	login_account	2026-07-23 17:51:35.425942-05
5432	frutas.donjaime@gps.test	login_account	2026-07-23 17:51:36.690768-05
5329	ci-test-mry2l71u-9bef43@ci.local	login_account	2026-07-23 17:15:32.302922-05
5435	ci-test-mry3vkel-739407@ci.local	login_account	2026-07-23 17:51:37.175744-05
5335	ci-test-mry2l71u-9bef43@ci.local	login_account	2026-07-23 17:15:33.220036-05
5338	nobody-here@nowhere.local	login_account	2026-07-23 17:15:33.67542-05
5341	ci-test-mry2l97r-5492e2@ci.local	login_account	2026-07-23 17:15:34.702856-05
5446	ci-test-mry3vn6t-4e27c7@ci.local	login_account	2026-07-23 17:51:38.935943-05
5344	ci-test-mry2la0v-83c1ad@ci.local	login_account	2026-07-23 17:15:35.681249-05
5449	ci-test-mry3vnxv-026ffd@ci.local	login_account	2026-07-23 17:51:39.856572-05
5353	ci-test-mry2lbl9-1895ae@ci.local	login_account	2026-07-23 17:15:37.745301-05
5458	ci-test-mry3vpkv-783021@ci.local	login_account	2026-07-23 17:51:42.058125-05
5362	3844939996	login_account	2026-07-23 17:15:40.482306-05
5364	just-some-text	login_account	2026-07-23 17:15:40.936139-05
5467	3847104514	login_account	2026-07-23 17:51:44.995669-05
5469	just-some-text	login_account	2026-07-23 17:51:45.459841-05
5320	ci-test-mry2l5mp-4b5315@ci.local	login_account	2026-07-23 17:15:30.867423-05
5419	ci-test-mry3vj0u-1ec258@ci.local	login_account	2026-07-23 17:51:34.299212-05
5332	ci-test-mry2l74r-2b4728@ci.local	login_account	2026-07-23 17:15:32.78626-05
5429	ci-test-mry3vk31-5dd10b@ci.local	login_account	2026-07-23 17:51:36.075631-05
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, vendor_id, author_name, rating, comment, created_at, user_id) FROM stdin;
9e743986-930b-4458-96e4-32f2a65cd737	107fae37-48e7-4bbf-98ed-f6c5025d7d81	Cliente anónimo	5	Audit test review	2026-06-30 20:40:05.544672-05	\N
\.


--
-- Data for Name: sponsorships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sponsorships (id, vendor_id, plan, amount_cents, starts_at, ends_at, status, wompi_reference, payment_method, created_at, cancelled_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, name, role, created_at, phone, city_id, is_active, email_verified, email_verified_at) FROM stdin;
3c681d60-2b25-4147-8f1d-6a1194aa6b49	post-cleanup-1784749427@hermes-test.com	$2b$12$1/vb.Bs6hHMHOTSn6sqlBOGB2tN94aEgPwdPFtTavBlhdaDMyZG1e	Post Cleanup	buyer	2026-07-22 14:43:47.910749-05	\N	\N	t	t	\N
68a4164c-2d5a-495e-8309-b23864a68542	ci-test-mry2l74r-2b4728@ci.local	$2b$12$OeHa1w58cQ4ObygyCPYDm.4AN3539jpy/DprELSlAkFnwzCufV.mi	Test seller mry2l74r-2b4728	seller	2026-07-23 17:15:32.255203-05	3944931419	bogota	t	t	\N
4eac9150-630c-4a23-9b4e-5242cad757b9	katalinasisw@gmail.com	$2b$10$uPDyF3Q8MEV57dq3AbXJFOUA65WBdeKZdFt/XyxHQUedtrquJxN8K	Katalina Henao	buyer	2026-07-10 10:40:19.616889-05	3116286151	cali	t	f	\N
afc020d6-8c62-441a-a43e-9526018e082e	andresmortal1@gmail.com	$2b$10$Uw.tOOWwxHoKWWc4J1Z7F.IVG1o7XYPlkCsbX9E6cozcp5HkzQU8m	Andrés Morales	buyer	2026-06-30 19:45:23.12922-05	3245425387-afc020d6	cali	t	f	\N
6bf1b231-ac50-4240-a37c-3fd587b93b63	cristito282828@gmail.com	$2b$10$DM5WETqneN/lcUvjW3CWw.hV/sc/V5kw1Hs4/AzzLFXUGwwiCniBK	cris	buyer	2026-06-22 14:20:32.318867-05	3180312223	cali	t	f	\N
13d860dc-8dec-4c86-bd1f-5ac7d611f556	andresmoralesc2@gmail.com	$2b$10$u1MMnT.3Xcl4i.2G.dN2GOcRWjwKBuVgtFITrO.fAvu6iJ4fot18m	Andrés Morales	buyer	2026-06-22 16:28:54.577847-05	3245425387	cali	t	f	\N
0723c0c3-44f5-4801-8732-239de7a465b9	frutas.donjaime@gps.test	$2b$10$KhQ9K8kfyW6hqaLI38w6aun7FyGT8T1L4FnnVQQMc.JlEGvuUUnnO	Jaime Ospina	seller	2026-05-30 11:40:15.603237-05	+573181234501	cali	t	f	\N
aebddbe1-610f-4ed5-bc48-c713adf98915	arepas.lacalena@gps.test	$2b$10$KhQ9K8kfyW6hqaLI38w6aun7FyGT8T1L4FnnVQQMc.JlEGvuUUnnO	María Eugenia Valencia	seller	2026-05-30 11:40:15.915571-05	+573181234502	cali	t	f	\N
8e6b239d-d265-4748-9975-702aec464b08	jugos.tropicales@gps.test	$2b$10$KhQ9K8kfyW6hqaLI38w6aun7FyGT8T1L4FnnVQQMc.JlEGvuUUnnO	Carlos Andrés Perea	seller	2026-05-30 11:40:16.25107-05	+573181234503	cali	t	f	\N
057f6b0f-c50a-4628-ac7f-0b2a0112f084	artesanias.pacifico@gps.test	$2b$10$KhQ9K8kfyW6hqaLI38w6aun7FyGT8T1L4FnnVQQMc.JlEGvuUUnnO	Luz Dary Cuero	seller	2026-05-30 11:40:16.553771-05	+573181234504	cali	t	f	\N
a622af45-c55e-4c1f-bca3-f729883bc984	jongrafico13@gmail.com	$2b$10$luD.7WFpT3cOJGctM7k5Pu3jPy07biwv00hL7aJehl2LU5QEQJuPm	Jon	buyer	2026-07-10 10:40:44.317012-05	3173992931	\N	t	f	\N
506fbc78-0128-4c70-a1d7-c9a1706fd255	ropa.calimoda@gps.test	$2b$10$nvOGDHaVzUJOaYhF2jpADeDuT.3lZSDjZ1ho75XGWshrx06f.F1yK	Andrés Felipe Castillo	seller	2026-05-30 11:40:16.817308-05	+573181234505	cali	t	f	\N
67f78921-de4f-45b4-905c-a833ecc3d715	bot-1784750404-1@test.local	$2b$12$7QUxVMwsXLLDk1r1X0tm1eqxPYNu1dhI7YJj7uROt.BEbH4hsdnlu	Bot Test	buyer	2026-07-22 15:00:05.552498-05	\N	\N	t	t	\N
246ac81d-a5fe-4aed-8c0b-db263eba6bed	bot-1784750404-2@test.local	$2b$12$VZW28/SOKOvKElprCj6CkOwfDJLxocUZ/VJReZW8/vUsL28p/yYSq	Bot Test	buyer	2026-07-22 15:00:06.441783-05	\N	\N	t	t	\N
71102347-c89a-48f4-83fb-a891d87808be	bot-1784750404-3@test.local	$2b$12$1S2QaZOyXNJMg0VGKZS.9.jaA1MQsWSoGTDJRwht7gxkAYj5cxxbe	Bot Test	buyer	2026-07-22 15:00:07.157809-05	\N	\N	t	t	\N
131ae702-005b-47da-957a-4e21aa4d72ac	bot-1784750404-4@test.local	$2b$12$BQuydwdb19Wph71cRpNm/ei8IVPsyXsXOpx5sFB9aD1s2L6Yw7hvS	Bot Test	buyer	2026-07-22 15:00:08.063095-05	\N	\N	t	t	\N
72c74745-543f-433e-9fda-986a9edcfb7c	bot-1784750404-5@test.local	$2b$12$iUaRTa1nM5.FhS7fCt9z2./mWaeswj13c.0gngWWf7ZHeEswKb.vW	Bot Test	buyer	2026-07-22 15:00:08.788051-05	\N	\N	t	t	\N
0374ffe5-3825-4d62-93cd-6c42d05fa284	bot-1784750404-6@test.local	$2b$12$MXWtCip8a6JQ5ZaQusw8puoxIBTQxscHW1nclprRxi11.GZxgEVNW	Bot Test	buyer	2026-07-22 15:00:09.370921-05	\N	\N	t	t	\N
dfd85356-3161-4c65-bf07-5f83ec3c0a15	bot-1784750404-7@test.local	$2b$12$b2Vr352eHsLck4zP4IlZN.xd5SVc9lLNCeKQ2wjMt9.BjxZfMDsoC	Bot Test	buyer	2026-07-22 15:00:09.921607-05	\N	\N	t	t	\N
494111a5-7c49-4bac-8f6a-b7c633c399c2	bot-1784750404-8@test.local	$2b$12$VJiYvUf08tJgvKj2ojyVtuL4UoJfEUqDI/uVbz/e7tu.sTTmwXEMG	Bot Test	buyer	2026-07-22 15:00:10.575064-05	\N	\N	t	t	\N
1d915986-e4b2-4131-b33d-3110330f9eff	bot-1784750404-9@test.local	$2b$12$YawUGdtOgYxd/7yZpy3Z3udYhpRk6ziL//XBubgpFy8LylFLHxz8m	Bot Test	buyer	2026-07-22 15:00:11.296654-05	\N	\N	t	t	\N
8d454b84-5ba8-4e43-b62f-941f9beb4d21	bot-1784750404-10@test.local	$2b$12$DrjDv65FNozs1MA4Xlw8qOAdifF70kx/XOGyy6nFnECWmBr6QHrdi	Bot Test	buyer	2026-07-22 15:00:11.901162-05	\N	\N	t	t	\N
9d87eaf2-bf9c-4a44-9972-a562da16a1dd	bot-1784750404-11@test.local	$2b$12$RjySdMEhV2vFoaoGQcECR.6OjM5o5eudjp1VIlge58MW90QTl.oty	Bot Test	buyer	2026-07-22 15:00:12.589066-05	\N	\N	t	t	\N
967f61c7-61a6-494e-b1d5-96606a384aff	bot-1784750404-12@test.local	$2b$12$E1Cxcvx5WbdIgKgJJ9nX4OqcdXTgeYw9Qigsw6.pFaEnn3eYnfWey	Bot Test	buyer	2026-07-22 15:00:13.105344-05	\N	\N	t	t	\N
908a0ea2-46a2-4e21-bc0e-7e1a7d62278c	bot-1784750404-13@test.local	$2b$12$7Skpzp6Slj1gnaV7L1iyMeQYHJG.5nu.tI94bXcMhMXyp.oLDdLZO	Bot Test	buyer	2026-07-22 15:00:13.704356-05	\N	\N	t	t	\N
7d55d91e-d178-4153-b7ce-bb51827e5ef6	bot-1784750404-14@test.local	$2b$12$rkEDvUvI4vUYtMET294SVOUoSKlabZcokYG2DWNzp9EOkc5e/aPQa	Bot Test	buyer	2026-07-22 15:00:14.307245-05	\N	\N	t	t	\N
681da818-7529-4b68-9089-94f842d8ab5f	bot-1784750404-15@test.local	$2b$12$Hm7f5ZJdRidvTxv6nGpy4O7xBCO9KBziaPKjqZVf/OyFsDVoynmty	Bot Test	buyer	2026-07-22 15:00:14.942704-05	\N	\N	t	t	\N
9daafc49-876a-4309-ad8f-3424b667f252	bot-1784750404-16@test.local	$2b$12$/QHwfQH2p6OT7U/5TbB.QumpfnrX/n0EiGzPt42TXGIPHC/fzVQ5i	Bot Test	buyer	2026-07-22 15:00:15.706838-05	\N	\N	t	t	\N
f0e6c31f-30fe-428c-8ea0-a34cc50ed9ae	bot-1784750404-17@test.local	$2b$12$RAdH9AbNORPLByvoF4OpPOE6HhtpeEX5RRnUeMOzQbpO2Uqi3vKra	Bot Test	buyer	2026-07-22 15:00:16.487686-05	\N	\N	t	t	\N
8e43f2ab-3387-4e3e-ab39-92be26aa76a9	bot-1784750404-18@test.local	$2b$12$tMHc7wRKSkq8Z6aMWDvhreJxO2qluiqpDB/DXIBElGwVLDu/17e8O	Bot Test	buyer	2026-07-22 15:00:17.466539-05	\N	\N	t	t	\N
8f78c772-db6b-431f-aaa0-e71465893376	bot-1784750404-19@test.local	$2b$12$vqvwjTTY1n6gXzMlWf.XA.6JTnQq2UC1d2zUWEk5b7fNEFxJUBP4y	Bot Test	buyer	2026-07-22 15:00:18.07614-05	\N	\N	t	t	\N
4b89580c-6385-4d56-b032-c8d5ca571311	bot-1784750404-20@test.local	$2b$12$rjCE1entcf/agXSSDmWAae95O0r7n8zZBatKQATUprBHKWxXql.My	Bot Test	buyer	2026-07-22 15:00:18.603328-05	\N	\N	t	t	\N
aaaa1111-1111-1111-1111-aaaaaaaaaaaa	audit-test@barriotech.co	$2b$12$meY4C.NFy3nNp8wn7Ev.g.L4XxUDLQNpM/d4X1ojw0wvVpA0rNTEq	Audit Test	buyer	2026-07-23 11:18:53.058156-05	+573000000000	\N	t	t	\N
01dec765-be94-4c67-8846-59dc5632a5cc	ci-test-mry2l97r-5492e2@ci.local	$2b$12$xtOvgHMEoospjndNy/4Hi.XQTYQ17Ik.K7Bu.amauOV7fVze8rGd.	Test buyer mry2l97r-5492e2	buyer	2026-07-23 17:15:34.62478-05	3944934119	bogota	t	t	\N
388d9c08-9f4b-41f0-8063-d106ad467f24	ci-test-mry2la0v-83c1ad@ci.local	$2b$12$qDBQKCpe4t0z0irSx11a4uO9VWN6eFqN57Yzm8KmFPymjuZmycQsK	Test buyer mry2la0v-83c1ad	buyer	2026-07-23 17:15:35.622464-05	3944935167	bogota	t	t	\N
8570bc16-2c62-4272-a085-ac8cef7a8a2d	new-seller-1784844936254@test.local	$2b$12$7sDX2yWM.WuWWhy6IvlNF.Wwc9S0my6lABhOBjBXyLgqsji5wnHzC	Fresh Seller	seller	2026-07-23 17:15:36.719736-05	3844936254	bogota	t	t	\N
04c0f8a6-1d9f-4146-ac02-37644a1ebaf7	new-buyer-1784844936762@test.local	$2b$12$/d3NHz2vm/e5wyCoUTY5ku7V0B2GYrGW0r1eUOi/jPZZUQb7Tefq2	Fresh Buyer	buyer	2026-07-23 17:15:37.187502-05	3844936762	bogota	t	t	\N
1194fa3c-f9ba-478a-8ea3-06e21fe605ca	ci-test-mry2lbl9-1895ae@ci.local	$2b$12$niGZC97R9vtkUSX8ew8pqeTawK2mSvxm06SShQGwLh2rmM/FuleUu	Test seller mry2lbl9-1895ae	seller	2026-07-23 17:15:37.665667-05	3944937198	bogota	t	t	\N
7be30b09-9afe-433a-932b-bcd384a401ec	\N	$2b$12$q70cg.RtUCWfzNhQBmN6VOfNUV2HY8R7h93gPqCleWNaJBTF3sq.e	Phone Only Seller	seller	2026-07-23 17:15:38.726708-05	3844938260	cali	t	t	\N
24d1d4f1-6236-4d31-badd-846670de514e	\N	$2b$12$IATnTCdwrM7utOUCbP.0yuohg18zqgREGsd5dAeoSrjGTmTLjctQ.	First	buyer	2026-07-23 17:15:39.37414-05	3844938851	cali	t	t	\N
7f86fc8c-bc26-40db-bc7c-f6d1275fdc11	\N	$2b$12$Nh8a3sya9psBWR0M9s8vNe707cqEANxhu8vmUhTM1O2KvCrnytngK	Phone Login Test	buyer	2026-07-23 17:15:40.455994-05	3844939996	cali	t	t	\N
619a6a94-db26-4d63-ab74-f911e42ec8f2	ci-test-mry2lyzv-8fd6a8@ci.local	$2b$12$I6XqLg8TsJS46ttnOOHwE.2mlLLyXS2R7y16rGGwNtyq7rnyRwLKu	Test buyer mry2lyzv-8fd6a8	buyer	2026-07-23 17:16:08.058524-05	3944967531	bogota	t	t	\N
db76b6ef-60c8-408f-8913-eeca2c632c4c	ci-test-mry2lz4d-f95861@ci.local	$2b$12$vvL0hhtVMiLeXwo4jv2U3uuRTTKZLNBzblTIzzqxxkC7Gt84IYuZ2	Test seller mry2lz4d-f95861	seller	2026-07-23 17:16:08.533986-05	3944967695	bogota	t	t	\N
3c767cbc-3b49-475b-a601-fb5010014da5	\N	$2b$12$qKakyS/qTcGJ7A5fDQ3I4eyl3VW3aZAfAQF6KW895cxqt1QVkYPMa	Phone Only Seller	seller	2026-07-16 15:36:09.269467-05	4234168780	cali	t	f	\N
6c94486c-bd78-4e0e-968a-6c794d1018eb	\N	$2b$12$CvX7y/VLuXnrokJNDarKvuhQ1/a8ZtJuyjniuiDVXznK3JCHRFMPy	First	buyer	2026-07-16 15:36:09.863097-05	4234169396	cali	t	f	\N
80e7329c-401c-4689-b8da-79863918ac32	\N	$2b$12$znnQ5eMJLQmJR0Gc7jCJkuxv7uT4gZH7C/UxldMJaA0sXvUF/Qg1y	Phone Login Test	buyer	2026-07-16 15:36:11.565582-05	4234170831	cali	t	f	\N
a689b55b-f1f5-4b3a-b527-07f115223a3c	\N	$2b$12$OrFDrBcyz3kvaqPAtq7oEOamsj6c1Sa5avfH704atFa0norK59bKO	Phone Only Seller	seller	2026-07-16 15:36:25.42501-05	4234184878	cali	t	f	\N
014c0fff-ecca-4eed-bd53-c83dc0f5a6f6	\N	$2b$12$Xxnsil0MeI60vA9SYy0KjeEmnvPCDbUTsbnya2TiQn9HYmjg3cqje	First	buyer	2026-07-16 15:36:25.983442-05	4234185496	cali	t	f	\N
96c72022-eaec-48e8-b706-8a7770d00ee5	\N	$2b$12$Pr6kdd4l0o3JFoN/M.n4puspMoUz5FwIN3cEu7kXY7nu8LYWlKVD2	Phone Login Test	buyer	2026-07-16 15:36:26.908428-05	4234186474	cali	t	f	\N
b39c5b95-7ce5-474d-b703-f76d2c942fd4	\N	$2b$12$VF54GepxVH0B1We3sjIOneKiAC.BuYl.SG44/Os7G3qPPf0x3UC6G	Cali Vendor Test	seller	2026-07-16 15:36:35.882244-05	3219876543	cali	t	f	\N
3a589757-dcea-4e1c-a5da-fbb5f6cb66f8	\N	$2b$12$L6pN6HGo1UaNO/CusP82TO6NnT7cObsr2K7BLG84rcPlT85pUMlAi	Phone Only Seller	seller	2026-07-16 16:46:09.312548-05	4238368635	cali	t	f	\N
f88899fa-aa79-4260-9e56-e7bfa5040f2c	\N	$2b$12$V./Mfn2muS8f0fsZGH61ZedHAb0FZppwmq9nB4sjiLbNhqJ0zSt/C	First	buyer	2026-07-16 16:46:10.048749-05	4238369517	cali	t	f	\N
08b982ec-de96-465a-b84d-6bb2202b0018	\N	$2b$12$n6KHK3cmIFDhYmCH4MIBKe04Dgii4WNVjIhl.Fg.UR1H0XziFoiU.	Phone Login Test	buyer	2026-07-16 16:46:11.413318-05	4238370775	cali	t	f	\N
d688c2f2-aa3a-48c8-86b4-76df6b799ffa	\N	$2b$12$.FguiFFKqOthUYhhHt5OI.kWGMQMU390PERx2WQB8N.uZ5VEs1TQy	Phone Only Seller	seller	2026-07-16 16:57:56.24992-05	4239075725	cali	t	f	\N
c253fac1-6820-4c9b-8bf4-0a2391caca7c	\N	$2b$12$l5kyU29zVOAghugm7uP6WOIBGIoM7yEFrrV.5e.YzW2x1jKqDW8x6	First	buyer	2026-07-16 16:57:56.906391-05	4239076426	cali	t	f	\N
0fdf63d9-5503-46f5-9006-513f5a253704	\N	$2b$12$w3c0YEe.fa/.sn7Xmr/8MeVgcHPxZEmWLaTSWPtp0kLW/BycWr1O.	Phone Login Test	buyer	2026-07-16 16:57:57.963-05	4239077466	cali	t	f	\N
11102364-7a38-4b24-af96-5063147a1a49	ci-test-mry2lxk8-84bd83@ci.local	$2b$12$fun6QRaBeIYf1pgjKVjZYeW/1dUzprxOxJeNeQRSPipT8EEQ9Sorm	Test buyer mry2lxk8-84bd83	buyer	2026-07-23 17:16:06.253786-05	3944965673	bogota	t	t	\N
e48b08dc-f4d8-4edd-84be-3de96492dc87	\N	$2b$12$sDJSPYeTwVr6jdyTFWeo.u5azGBrCCDAzz8UlZ/f7UkDp0ZPgmg/O	Phone Only Seller	seller	2026-07-17 00:06:43.719272-05	4264803248	cali	t	f	\N
84a4142b-26f8-47b8-9bb8-041e1dbcb0bf	\N	$2b$12$OCCZesvAF9TVmoYdUXgw5egiFufeFqBTecuoh9e01NojdOcT0HF7C	First	buyer	2026-07-17 00:06:44.46242-05	4264803827	cali	t	f	\N
0ba3d84e-4e31-4d58-a875-a3b461ecf8c3	\N	$2b$12$VvQd7qty.1l7nBNh/TlmaualodQits4Lr5m75h2Li5fkt3r07e62.	Phone Login Test	buyer	2026-07-17 00:06:45.70046-05	4264805062	cali	t	f	\N
3332f1b0-00fd-4094-a272-6f68d5219cae	\N	$2b$12$Qya/zuw2LNMekUYXAtElM./RGTvAI9ASs/YR6l49Cx3IZnak1tz9q	Phone Only Seller	seller	2026-07-17 00:12:14.880387-05	4265134415	cali	t	f	\N
3888f407-b11a-434e-b85e-66467f979a35	\N	$2b$12$QI8m7Gjbt9KqFoxICCHlBuCvDA3ILVrzW2YVhkPOEbtfb2p4FJ.gS	First	buyer	2026-07-17 00:12:15.525461-05	4265135002	cali	t	f	\N
00d80e30-754e-404b-91f8-46edea2a8443	\N	$2b$12$ZRHFoy.we9uLTBH9vW.22ed6uDgZ83h3joLNzg1yX0p9GqVY37Epq	Phone Login Test	buyer	2026-07-17 00:12:16.498773-05	4265136061	cali	t	f	\N
2577dc1d-8c55-43c0-8bf7-249ab23802f0	\N	$2b$12$I1R/ONBULzfR0IqTr7dhuORyKW6kqzyVtuHYtk/abw39pl5ulQ/0m	Phone Only Seller	seller	2026-07-17 00:16:33.962235-05	4265393434	cali	t	f	\N
c2e1e116-593b-4f96-9ef8-97eaa95d6d80	\N	$2b$12$Z2oWX.hXuVDMuZZ1R1yrPe7qkrQU7UhLQhEk3BGYuj/DstMNuCq5C	First	buyer	2026-07-17 00:16:34.71124-05	4265394183	cali	t	f	\N
9e795cb0-b91d-498b-802c-2c4ac43ee92b	\N	$2b$12$Ff7lumVXhHEj5RbMGec84uCMWUgedf3t9DUSHvwNboQOiuqkR3eGW	Phone Login Test	buyer	2026-07-17 00:16:35.66825-05	4265395221	cali	t	f	\N
fcbf6fc3-7e5c-43b3-926a-2791a33c9ac9	\N	$2b$12$9CX.fp26by/7Y7LOaC.ye.ZOoS0G2qKxi5dbJ5wNmn/Srtq.awCIu	Phone Only Seller	seller	2026-07-17 00:21:50.084896-05	4265709281	cali	t	f	\N
95ec0089-acb9-4bfe-8b4e-05712a0f0ff8	\N	$2b$12$Y4KS02AH461e9.k6aCoWKeU3oJMv9c8whVL6WXlzYlSSYaPK3WiUy	First	buyer	2026-07-17 00:21:50.805061-05	4265710303	cali	t	f	\N
b07ded4d-7c7d-4329-8b03-bb5179a83d95	\N	$2b$12$7eiubF2pKevKumzEl0NbD.UjRAy/RQF226hrZMV0sRHhLf2C.1u1u	Phone Login Test	buyer	2026-07-17 00:21:52.280001-05	4265711686	cali	t	f	\N
dfceaed0-d39a-42d8-87e0-8c4557fefab6	\N	$2b$12$eOkWdHABEPpxfUBdZJ06OeOUg3wEGtZryfCRVPk5P4SgMc0jYhSH2	Phone Only Seller	seller	2026-07-17 00:35:16.872627-05	4266516280	cali	t	f	\N
fa56aad0-2a89-4bf5-a466-2c641b9e9742	\N	$2b$12$sL55jKqy1jB0Nio/Fprn9uTktqj5BLuEDSTWIAmh5DoL3/O.cwTue	First	buyer	2026-07-17 00:35:17.674326-05	4266517073	cali	t	f	\N
39aef468-264a-45a6-ac75-161bae44557d	\N	$2b$12$rPvvnTMZJLRVkxGKlaHgEOktihlxAm0N40oDWNDnFJcqZHrL/Vtk2	Phone Login Test	buyer	2026-07-17 00:35:18.994064-05	4266518216	cali	t	f	\N
4a5e5e75-803c-4261-b1f3-1472ee9de18c	\N	$2b$12$f/voZd4tmHmAO7taP398LerbZyI1NCijQMgR0Tp0.D9RAaO1FKQny	Phone Only Seller	seller	2026-07-17 01:46:35.179627-05	4270794713	cali	t	f	\N
2907924e-f345-4d5f-99fa-11c790506740	\N	$2b$12$Xq3JDsZccMekqf35tbqYv./9xe7tURPWSrh9ilMl6ywnaOqDDP1zS	First	buyer	2026-07-17 01:46:35.8158-05	4270795294	cali	t	f	\N
7df34dbf-8571-458d-8c3b-d229a80a51c1	\N	$2b$12$E/5nPtySkPsuy.pFg/3xV.SsX0Y4ocuIJtJMOfC1.nj.XlcFT0qf6	Phone Login Test	buyer	2026-07-17 01:46:36.865158-05	4270796428	cali	t	f	\N
d9a267f0-9c81-4190-8274-5d9e4c4948a2	\N	$2b$12$B7pnyY2mAtY3H8mcUhae/eg/cVChDAZQcdMm4PnMLi1twPF3dRPtm	Phone Only Seller	seller	2026-07-17 01:47:16.639145-05	4270836006	cali	t	f	\N
9bcb0ac8-2b68-486a-ba23-aeddfb2e5ebd	\N	$2b$12$6D.aR2Se/rmjCjv89nOtiu2yXLMY2WjU7HMmvFPOiN33J6fF8hu4O	First	buyer	2026-07-17 01:47:17.489023-05	4270836893	cali	t	f	\N
815880ef-6dc1-495e-ada0-97e86a4fbf05	\N	$2b$12$ch1PA2n7RUoRQWJvP7DsROrFHFowHgGd68/UXEiW6EaoF9pkjKXM2	Phone Login Test	buyer	2026-07-17 01:47:18.640134-05	4270838115	cali	t	f	\N
78e67b0e-0e69-4c8b-922e-9e8231a622ea	\N	$2b$12$As83tXW.yrA/MdJ9MFmJq.eGyAPKvxOFZ9AtGcjUKsv4sAVJuJlqK	Phone Only Seller	seller	2026-07-17 01:58:58.018255-05	4271537555	cali	t	f	\N
9be92888-23b2-4992-97c9-2a006c981e50	\N	$2b$12$dRmu292qzyAPJt410GfP..yJ/vuLo.W7Uktm37YkTwA6YzYQi1IXG	First	buyer	2026-07-17 01:58:58.641259-05	4271538189	cali	t	f	\N
77623f88-7b36-48c6-8104-64e1835b491b	\N	$2b$12$JPzFydvfkY9wgCoXFg2C3u1fFBEf4DbECnFsWeegaK/rbK10nNYIm	Phone Login Test	buyer	2026-07-17 01:58:59.729655-05	4271539223	cali	t	f	\N
f0a2fbf1-a9d6-4521-85c6-5b694161487c	ci-test-mry2m1dl-ac7d8b@ci.local	$2b$12$5wgPECTTdFYrXUM.DmqbBuRqsNSJD3FjTrf8ucs1XVYmgGcdUY9qK	Test buyer mry2m1dl-ac7d8b	buyer	2026-07-23 17:16:11.183259-05	3944970617	bogota	t	t	\N
1275a3d5-71fc-4ac7-94cc-496da0bfef2c	ci-test-mry2m27r-219397@ci.local	$2b$12$OGYPxrYIgny9UOBHYwXFEuxoiUr5NxKnGDRkzy05CsTaG7Tn4OERK	Test buyer mry2m27r-219397	buyer	2026-07-23 17:16:12.177675-05	3944971704	bogota	t	t	\N
7c6cf21d-4fe1-4096-ac76-cd8ffdd8ab78	new-seller-1784844973152@test.local	$2b$12$8QxUQl8OGnJttPWusr0FWOtJqRFuxO8A2LuKs63XN7Ov5D4U8Z5Au	Fresh Seller	seller	2026-07-23 17:16:13.621279-05	3844973152	bogota	t	t	\N
f663a216-5967-4b35-a2a5-16e0951e330b	\N	$2b$12$mPXRYYiGZFefbATBFI7Sx.h6CKz.DhWSLcyswLPwC2VqmkbZ4Giqq	Phone Only Seller	seller	2026-07-17 08:43:49.559428-05	4295829021	cali	t	f	\N
66bddb0b-df12-4a58-9afa-f03a854b2d54	\N	$2b$12$06iuZrIRl7ulqDUoxepJduCc2AdaC6skAxg5JtChhEwrqFpIEfNeC	First	buyer	2026-07-17 08:43:50.207958-05	4295829643	cali	t	f	\N
765becc5-b1b8-4673-8a35-0c1b7895000a	\N	$2b$12$blUV0qxBF4q.8vzyJ5eD7u5OcI6sUxLtySi5dybdRHEMTkbzMnJmy	Phone Login Test	buyer	2026-07-17 08:43:51.384956-05	4295830879	cali	t	f	\N
c8152626-746b-4ffe-803a-ff1eaccd28f4	new-buyer-1784844973667@test.local	$2b$12$4Iyr1P5VVyTvC2icqE8Z0uHQaM7UR/cZoGtP1hSmUEVJDFsS.5R8m	Fresh Buyer	buyer	2026-07-23 17:16:14.080878-05	3844973667	bogota	t	t	\N
4887726f-ada6-4764-af29-5c422b745275	ci-test-mry2m420-2e92a8@ci.local	$2b$12$yKcpFu9KRsd8Zq5uLeyp4OiAb6RCk7T6Ap8lL29K1fSx3YSKHQEF2	Test seller mry2m420-2e92a8	seller	2026-07-23 17:16:14.538183-05	3944974089	bogota	t	t	\N
034c126b-3a33-4b57-9cdd-39422557890c	\N	$2b$12$xEhQBw6EKZtrtxTC6NxeMujeqfBeiCW2WwIZ9yjyViNj3jVdUz9SG	Phone Only Seller	seller	2026-07-23 17:16:15.692717-05	3844975098	cali	t	t	\N
59528487-bafa-4ba3-9987-65f9d1ca050d	\N	$2b$12$d5VovzqMb5Brc/h6IsvGMebz6Hy7b/d7pbAldGnJI5KT0y6qQKEru	First	buyer	2026-07-23 17:16:16.296233-05	3844975826	cali	t	t	\N
51007b86-f1be-4e46-9c0b-6d074579af63	\N	$2b$12$eEuYxJfm.xkAgkINbz4BYeekT8r..3ALLUEg/5zDjGyoeg00JtJAa	Phone Only	buyer	2026-07-17 09:11:55.821711-05	3784297514	bogota	t	f	\N
e25e9d5a-d3d2-4c1f-b86c-bac64dc079d8	\N	$2b$12$2UfEBHEq6S67t9KckoHeB.I5Kyx6.dS0Vx5OfR/i8tBAgXg8MSHN2	Phone Login Test	buyer	2026-07-23 17:16:17.32165-05	3844976858	cali	t	t	\N
44d09e64-f9a9-4eab-8102-eaf0a6e706f0	\N	$2b$12$ly3gv7pU.xGLvwdMJ4RyquvcWCKzrim2oI9tYr2VtwHrvIyz9EOpy	Phone Only Seller	seller	2026-07-17 09:36:33.017843-05	4298992554	cali	t	f	\N
23aa6746-59df-47eb-8ed1-7330b3348919	\N	$2b$12$qlWktzU9j5b.X38GaindjeLJ2Ygurf5Sk1PI9RbTT7.Gj9tu.pG5u	First	buyer	2026-07-17 09:36:33.590105-05	4298993111	cali	t	f	\N
718f788d-e989-4251-bf76-c59c5eeb7891	\N	$2b$12$uBNsWL7uwwIdBh8dfvsCMejtEDjNqNJOIVCW/WJvGQfYYHeXfpr5e	Phone Login Test	buyer	2026-07-17 09:36:34.690329-05	4298994195	cali	t	f	\N
8339c428-516d-46ea-acbd-9a5c538e7f8a	\N	$2b$12$w17F84dmepmX6d4uOAK.H.TPHNMM07DufxdgDvrjqcGrkcP8jpUAK	Phone Only Seller	seller	2026-07-17 09:51:29.352397-05	4299888810	cali	t	f	\N
ee27cb98-42f5-42c3-908a-5244b81eef17	\N	$2b$12$tfIltlYvolJz/T1W.wfeGu7bGaZM/BLSXUDYiTHcxCa0aDvNc8xMq	First	buyer	2026-07-17 09:51:29.988594-05	4299889425	cali	t	f	\N
1b185486-0ada-4929-8010-8ca9566687be	\N	$2b$12$YCbAL8Cd2uixW7bmfDyU7O8O11.f2NxkjLIgu3txkEqKvod12cdXW	Phone Login Test	buyer	2026-07-17 09:51:31.095758-05	4299890608	cali	t	f	\N
b0f0b17b-f31f-4fd1-910c-8b6597f466e9	\N	$2b$12$54w9PgMiMMEkDus.jOPN4eGeWZO39NlqYUAVLk0XdgDRzvpXkBGZu	Phone Only Seller	seller	2026-07-17 10:31:19.168998-05	4302278279	cali	t	f	\N
51fd0645-286b-4fe3-9029-4ef604a09402	\N	$2b$12$8QS21No0eJbjmQEAVSY2vuHEb0tl97xizeDN2Siw6NOpYg1Nruo5e	First	buyer	2026-07-17 10:31:20.776567-05	4302279514	cali	t	f	\N
b7cda2e9-f984-43a4-b5c2-5db9332db3cc	\N	$2b$12$r0NBSV/0kHsE4VxQj0U2qOkicDQkPsq6VetIKOg0yTg4rkV9gM.Ui	Phone Login Test	buyer	2026-07-17 10:31:22.424205-05	4302281477	cali	t	f	\N
6dcf16e9-070d-4b23-8be1-a1a705767a3c	\N	$2b$12$27c8jkNy71CfXmj6rI3Wou0w7nS/BBxxHjRiqSo2nXbEn0qP7LAl6	Phone Only Seller	seller	2026-07-17 10:52:46.590275-05	4303566147	cali	t	f	\N
e71359ca-3c1a-467b-af77-16a4d8ea7872	\N	$2b$12$oj2ahOkuhUF/ha05ti8xQOWn9r8LYf.howfbUHCJhznGFkOj4/A0W	First	buyer	2026-07-17 10:52:47.219911-05	4303566694	cali	t	f	\N
377ce0dd-e0ed-4bdd-87ef-91e9824d55ed	\N	$2b$12$iNLuv1/7dx8Ld3qCvuwxY.lv8anLaMsN0WdYzBbryNGiaSN8W0cCW	Phone Login Test	buyer	2026-07-17 10:52:49.086335-05	4303568443	cali	t	f	\N
eef91055-13bc-4755-af71-4b9444bed188	\N	$2b$12$d81Md8jYS21.0zI3OrsfWedPB2LWEgZm/BUrVL3qG0Xt09rBb.9oa	Phone Only Seller	seller	2026-07-17 11:07:49.528891-05	4304469026	cali	t	f	\N
a034fac0-eff9-4bc4-9087-4423bb62b9f1	\N	$2b$12$if1Hco8INm9a6cB/cTzCOOSB70YdnT5K1sRygu3JHt1UBDIlk1cT2	First	buyer	2026-07-17 11:07:50.175162-05	4304469607	cali	t	f	\N
db405169-00ea-4134-b909-6d93544258e2	\N	$2b$12$ubXwoIRiF1RLLaSxMPpogeU2YUNwI2yj5fB2K9RioCTldO6gWsAwe	Phone Login Test	buyer	2026-07-17 11:07:51.433689-05	4304470943	cali	t	f	\N
4f4386ce-1d48-4909-9bcc-06b6b0c96b15	\N	$2b$12$AZHdgWdaM4GJK6Tl9okVquyuisMiH92A271HL5ltq/WEVGcmcqE/G	Phone Only Seller	seller	2026-07-17 11:16:27.70189-05	4304987113	cali	t	f	\N
302ced86-9f26-4fce-b6d1-6b97e0acee0c	\N	$2b$12$KFiehNqs/l3ZxIe/6ETCgOUlZMaSas9IIdgEVsJ37O0EWArINnTMK	First	buyer	2026-07-17 11:16:28.591344-05	4304987980	cali	t	f	\N
871d3c34-16ae-4b52-b3d8-c9dce447f573	\N	$2b$12$fvOPXYVP.6EkKghkfEIjl.Sp/48uNHw6CzYYYXGghBQ30Y.prJF9u	Phone Login Test	buyer	2026-07-17 11:16:29.812365-05	4304989372	cali	t	f	\N
bb3de6f4-226f-4c5c-930a-6c47580973aa	\N	$2b$12$8069AyBQjCb2z3B3IamfoOTRRcI/FxEug8zTb2ELaaF6eUTB9V8KC	Phone Only Seller	seller	2026-07-17 12:03:17.336724-05	4307796171	cali	t	f	\N
c381a0dc-85c2-468c-9153-3025775e32f8	\N	$2b$12$5XnRRFoO.wLefaFaTHHHSueD2svKoItP2n5uJlaG4nOWmF9qZygkO	First	buyer	2026-07-17 12:03:18.285629-05	4307797561	cali	t	f	\N
ef056109-054d-4d8f-8945-3ceba8994597	\N	$2b$12$b0NsM/UTLuwbDy588wTQdOWHPrNwVf44PiOcG0f7qcKPCyznRbBOK	Phone Login Test	buyer	2026-07-17 12:03:19.639443-05	4307799174	cali	t	f	\N
ba18bb83-75dd-43d4-a116-2fc1e77b0ed9	\N	$2b$12$dT7dgM.Yj/QVRHiE70osBOHodAohm88wIZ5N5NVrtg7z8Mj50KY0C	Phone Only Seller	seller	2026-07-17 14:29:25.208875-05	4316564705	cali	t	f	\N
5540e77a-b823-4c3e-ad4b-a5b5a5225fb8	\N	$2b$12$LYpfn71Ku/sMKyOCQOVB1eR6FB0boZiFUkhtIzwiE19RGgNWR7H1y	First	buyer	2026-07-17 14:29:25.827931-05	4316565339	cali	t	f	\N
280c79aa-8e8e-4ed8-9c8e-298cbea5cc07	\N	$2b$12$0Bc2bIz4jS7ig1JHORASyexY9qdVdqrOBTv5A7px/Ff2vp/4umr8C	Phone Login Test	buyer	2026-07-17 14:29:26.746167-05	4316566309	cali	t	f	\N
c02bb3ef-76c6-49b1-b3bd-8336857caff0	new-seller-1784844401191@test.local	$2b$12$DwIpgCPVB1OPw1.MmPQdNe2cUPylkNLG5zng6q/5gN0SYM5xvWbw.	Fresh Seller	seller	2026-07-23 17:06:41.659214-05	3844401191	bogota	t	t	\N
e5a6e099-7386-46b4-ba00-b61a4cd028ac	\N	$2b$12$e7CkXyBamN0MiH5oP97TDeyi6dLd8Xj541Iy2wYKn0S/IBUa5GXRC	Phone Only Seller	seller	2026-07-17 14:29:33.425159-05	4316573001	cali	t	f	\N
8fcf64e3-a0c7-41b8-8878-920481ed6699	\N	$2b$12$.zDHPIw5qezaNvYD27wPreckjxaLmhLPHWqQJcLd0m8SYji6tgwxq	First	buyer	2026-07-17 14:29:34.037487-05	4316573506	cali	t	f	\N
8aa41f63-d0dc-4e6a-9188-de32d8e7706c	\N	$2b$12$.mKZ1VIRhS4Bx.vLEv3/u.ZeVb7fV6icgAfOvTsOIPHrwZji7S2W2	Phone Login Test	buyer	2026-07-17 14:29:35.072557-05	4316574609	cali	t	f	\N
cfa5c63a-16cd-41d4-8de1-51abd875c2c5	new-buyer-1784844401759@test.local	$2b$12$qhOd5xhnl4h.nzME5TFN5Olq2/7BahNrVKFhnV/LWMzpKxtwnHg3i	Fresh Buyer	buyer	2026-07-23 17:06:42.270201-05	3844401759	bogota	t	t	\N
63e1dcb0-da46-4a94-976f-2d7b9bcf2633	\N	$2b$12$clYvLu7m2Y1i5XIGaVSgtO/n..G4hu1mwcu8ZgOLujTK3jnwRDAw6	Phone Only Seller	seller	2026-07-23 17:06:42.816405-05	3844402351	cali	t	t	\N
3f976b2e-c078-408b-84bb-f5aa444189a9	\N	$2b$12$9EXWx8.D.L.qj420bHlRKuxDoyX2J2q4WJPh4.kuz1TDDYJZDo4rm	Phone Only Seller	seller	2026-07-17 15:15:43.917343-05	4319343415	cali	t	f	\N
c2fb8eda-1f3b-4338-915f-510af2b8fc94	\N	$2b$12$7sAVgYJOz0duBJFCBAbHdOSnpWQDWFkN.6uf0vDWrYM2/6dHWquEu	First	buyer	2026-07-17 15:15:44.671649-05	4319344053	cali	t	f	\N
110500a9-d3ec-4ebd-930c-010137ede9b8	\N	$2b$12$FYqx0mVdU4im9QWDUvs5euv5MuDFENAQktHKFaaWqpF.hI1eFHKyW	Phone Login Test	buyer	2026-07-17 15:15:46.030365-05	4319345467	cali	t	f	\N
88ddebae-dc18-4a6f-a923-08561ccb6367	\N	$2b$12$5g3fR5A638NNwzjYALApu.tsggV0Jv4uT1ICEEzSxdlozZAi8i2nC	First	buyer	2026-07-23 17:06:43.359236-05	3844402906	cali	t	t	\N
2068767e-9e35-4d75-9d0c-1dc72f686b9f	\N	$2b$12$6F.uMbK22qNAdCE5gE8ChODUyZB08kQt6ZDy6nVgPF6XlNrNSxMBy	Phone Login Test	buyer	2026-07-23 17:06:44.309383-05	3844403861	cali	t	t	\N
b1510400-b320-4a66-a56f-b18a8a072669	\N	$2b$12$NbPZ8r9CH4Byg9bEDZY2TuuIkbsV..lZMO4npZgbuAsYhbFwL7vbC	Phone Only Seller	seller	2026-07-17 16:48:55.247898-05	4324934721	cali	t	f	\N
584cadda-afab-4234-bfa5-aec97bf19684	\N	$2b$12$wbivf.VzATdYvsJ5ZJzZz.wxks.z3x7M9P8RjBcQg5W.afVJk7xLu	First	buyer	2026-07-17 16:48:55.878537-05	4324935379	cali	t	f	\N
8c2a0a70-1ba3-4392-8c6b-c2413081f27c	\N	$2b$12$xcNjg01/4eNdM/hpwPkSrOxmTgjXiLbBjYQUldII9mm9TpPkGFGfC	Phone Login Test	buyer	2026-07-17 16:48:57.616004-05	4324936452	cali	t	f	\N
a24b13fe-7867-4360-87f9-b5fd49cbe422	new-seller-1784844409195@test.local	$2b$12$3wUHpA5OELOUrBLDTIiTjucHNSYUtaczXm83WGN6iJjm6rtN2Sunq	Fresh Seller	seller	2026-07-23 17:06:49.713832-05	3844409195	bogota	t	t	\N
47119788-1621-4d8d-892b-64427d7a2e60	new-buyer-1784844409752@test.local	$2b$12$COhfM4.ToBYJFPDPP5PsS.3gn7xsz6.Ey/FofLUrhqZAQQ6aPOTga	Fresh Buyer	buyer	2026-07-23 17:06:50.183784-05	3844409752	bogota	t	t	\N
5c697674-bc02-43c9-8a90-e600f5c808f8	\N	$2b$12$xuSWPASRu0tTia4ZORjwIOmlsl7Jbc4mS6pjee9uSjnXeSWZP/UXm	Phone Only Seller	seller	2026-07-17 20:03:01.301352-05	4336580756	cali	t	f	\N
a5b9a3c1-e013-44dc-b288-dd068ffd5954	\N	$2b$12$TsdADCyrQ5VDSOC5cY8I8ezxrto3A9yJGK/mo5zWLJBcX1iImsZoe	First	buyer	2026-07-17 20:03:02.099016-05	4336581566	cali	t	f	\N
2edafeb8-73e2-4cd9-8fa1-104970de1e4d	\N	$2b$12$8XGKYD0tHCBaUBLFn6xF1esUi7LDt7sDnfIsY1.1989yO0q8Ti.rG	Phone Login Test	buyer	2026-07-17 20:03:03.578725-05	4336582848	cali	t	f	\N
668e7e9f-a6de-4d21-b65a-11407f073060	\N	$2b$12$0rAba0FPUO8Sc9x/WPkKRust5PeYUYbPtk6PwaBd9v3cIjV8VbZFS	Phone Only Seller	seller	2026-07-23 17:06:50.677948-05	3844410249	cali	t	t	\N
8fdfc246-a7d7-423f-83fd-f43002fc6f47	\N	$2b$12$/m0HrZuYpCgwM.cxhM39Uu.TUWzHkQ7.BUdphQOYAciFH.FeB81TK	First	buyer	2026-07-23 17:06:51.198114-05	3844410753	cali	t	t	\N
6d221f87-0754-4888-830b-1f2917d5620c	\N	$2b$12$qShSusXtOSDVIG3h8Gl2Gef3n0hTvOM2uTqKFE0ZIrAHyJZJQbGje	Phone Only Seller	seller	2026-07-18 09:48:06.489313-05	4386085884	cali	t	f	\N
bd7697e6-df10-43c4-80b9-f49968a08e6f	\N	$2b$12$liyKMb4iS.Bg1jBEHxRdqu6.MGxDrVuYeHh65C7t66BC6k385L83i	First	buyer	2026-07-18 09:48:07.320403-05	4386086700	cali	t	f	\N
a32f1b52-1e5a-4131-8849-c72a69cbeb65	\N	$2b$12$FrbmXhoJVgyKRDSP/tUwseMTsnaUDmMUu0gSEpicKL8P8pHIxmsza	Phone Login Test	buyer	2026-07-18 09:48:08.560036-05	4386087930	cali	t	f	\N
8b5c8fc8-5282-4ffe-b9a7-578f66e2b251	\N	$2b$12$agiPgE9NcqOfP06cVDbQ.O5FC013WOjXwI9BvmGo3TKBFzp32dcdC	Phone Login Test	buyer	2026-07-23 17:06:52.077063-05	3844411675	cali	t	t	\N
a286c88b-b997-44a9-b7ab-6cc652fa5065	ci-test-mry3vj0u-1ec258@ci.local	$2b$12$6UqMP4k3JYolnS0ZyjSfm.VJGa6yQxmvONgtkLpyZ7SGD6WiQ/2IO	Test buyer mry3vj0u-1ec258	buyer	2026-07-23 17:51:33.581723-05	3947093007	bogota	t	t	\N
9cc23a64-1bc8-415c-96f0-97507015b0fe	\N	$2b$12$9PsMMxn/Ajvl6dzA0754iu3XMTYu9Ea1LWg8R4/OpEEaUwJbF.l/C	Phone Only Seller	seller	2026-07-18 10:59:03.021529-05	4390342461	cali	t	f	\N
159e3e5b-1b58-43a9-86f8-9ba14411ee2c	\N	$2b$12$4aKNwUqI.c7XrjlcEfZsyueMgMa/10dq/VnIGJRuH8o1UMov07hwW	First	buyer	2026-07-18 10:59:03.764126-05	4390343103	cali	t	f	\N
8f961c51-0385-49f2-a660-b6afa61ef1d0	\N	$2b$12$Tc8IKpNPG4gznrKzK/GFIOcvtbDjTA7iES5kameubP59zJNugs402	Phone Login Test	buyer	2026-07-18 10:59:05.105608-05	4390344596	cali	t	f	\N
acbc0846-cabd-4954-a482-f1cac9f42327	\N	$2b$12$t2lkJcL01lgyUAmzU.ouTuJh2qVQ7pNY9GEElTVSss1ZUFkKFn5oW	Phone Only Seller	seller	2026-07-18 17:27:58.518473-05	4413678108	cali	t	f	\N
249a7ecb-2f63-4e95-9b4d-e5b41185012a	\N	$2b$12$jPy76zUHQH2Y9vkwo.AoEuQWVnj0Kv5J7cunOeJpUt3oJvq/T4kdu	First	buyer	2026-07-18 17:27:59.025194-05	4413678591	cali	t	f	\N
d045807b-7682-4b0a-9577-97853df0a646	\N	$2b$12$6aZ3o3u.A6VwwkFEcPy0RO/qZpc0W4tx6qlOwWHAyhXs/DIMTKHU.	Phone Login Test	buyer	2026-07-18 17:27:59.928226-05	4413679516	cali	t	f	\N
40c42d01-6184-4a60-8340-f8eebd4da0ce	\N	$2b$12$BiU.pPnrqSeL5zdkalrEVuwR2fbhPtnQ4US2gmiz8ozqLKhPYkH/O	Phone Only Seller	seller	2026-07-18 18:08:22.431695-05	4416101958	cali	t	f	\N
227b2451-73a0-4317-a0d3-2c5ceb47ebeb	\N	$2b$12$xWuZKpR1sgZlAf6epBcKpOALTqL8Nid4LXe2TjFZ.Cs7SaVV0NCfq	First	buyer	2026-07-18 18:08:22.89675-05	4416102497	cali	t	f	\N
8ac1f81b-d562-4541-949c-3df2b7cb4a96	\N	$2b$12$eocbPiBgtKQlO1Qdpt81yOq08YD.T8u9TY7IuOWMQ2Ia1qjJ.fBTS	Phone Login Test	buyer	2026-07-18 18:08:23.797865-05	4416103390	cali	t	f	\N
f3f4e5d1-40bb-4bb3-93f9-62fab74997d4	\N	$2b$12$FIOKyP8Cq5lB0dVZ9ScogO0BYeJRlQ0GtWPNmrD3IXlwhEl.Bbi.q	Phone Only Seller	seller	2026-07-18 18:22:07.063923-05	4416926419	cali	t	f	\N
7433117b-bd89-4289-aa81-c6dfa8ce8f49	\N	$2b$12$V8ACIB04sL9fa0zzFE/x1O1uT6RqevAC0cQbzSndHvAFYC0WV4Hx.	First	buyer	2026-07-18 18:22:07.762068-05	4416927206	cali	t	f	\N
84e14413-4cfb-400f-bf97-5a7af6bea078	\N	$2b$12$wHl0F/62ZaQzySN9BBu1BOLnI.ChiPHoGN.rzgpJXbNCQfgTDUiee	Phone Login Test	buyer	2026-07-18 18:22:08.963249-05	4416928458	cali	t	f	\N
c9829328-0d54-42e7-afe2-6aeeaa91cf11	ci-test-mry2g2zf-abfc2d@ci.local	$2b$12$XaL46M1Khs4W5cJ0fMwiEe2G8aZeP06XdfJxk413zCbo23M7hJvgG	Test buyer mry2g2zf-abfc2d	buyer	2026-07-23 17:11:33.253997-05	3944692763	bogota	t	t	\N
5a8b0a99-ff4c-4da4-b673-66927e6c6190	\N	$2b$12$dtzIVFnM5sq3DlQ/vkEoXewnFlDjaRK1eDsAbAmYbEBVnxXGzCnGu	Phone Only Seller	seller	2026-07-18 18:27:44.958988-05	4417264514	cali	t	f	\N
fe0d2aad-7415-4c52-a867-7093278f6c67	\N	$2b$12$NWGZWMT8SdLqwI9/9ts3Luuox1/GZUZKeH9FXZr/qN/nc7IHwSy1e	First	buyer	2026-07-18 18:27:45.506822-05	4417265037	cali	t	f	\N
8e2c52ce-71a3-421e-9b2b-ee32a1d6f967	\N	$2b$12$JGqhU2InuettDHIAokYwNOLiA7fsM823g7uygd4AF1b/XkC6LK3xm	Phone Login Test	buyer	2026-07-18 18:27:46.540371-05	4417266070	cali	t	f	\N
eb68604d-4d57-490a-89d3-1d55ea7abc8b	ci-test-mry2g42q-dd3ceb@ci.local	$2b$12$hv/notJx10Db9W5V6WRiUe/1jvrTwJMRueLObr7F4mZR.4gdhXc6O	Test buyer mry2g42q-dd3ceb	buyer	2026-07-23 17:11:34.65531-05	3944694178	bogota	t	t	\N
4b7babcd-08c0-4b2c-9962-8ca01da5fce3	ci-test-mry2g5jb-33a332@ci.local	$2b$12$OOTklltNNElQanNaOliEa.LOMF.j08lQtyg3vcUvg9WbS8FpbC7Pi	Test buyer mry2g5jb-33a332	buyer	2026-07-23 17:11:36.516781-05	3944696071	bogota	t	t	\N
55576117-f0cf-4d5a-bd4d-f55871561369	\N	$2b$12$yWip3x.WQEZaIWCSJpAzxeFLFNRDOx1jNU4ttRoqfrHXo2iHuO3yy	Phone Only Seller	seller	2026-07-18 18:27:53.880838-05	4417273468	cali	t	f	\N
4f6797b8-fdd3-4793-9fab-4e114858e6ce	\N	$2b$12$gJuLVTgJBnb9TKgabaYfG.Ec8.eHaDr6y1cD0PynG9o/bavnomAea	First	buyer	2026-07-18 18:27:54.388712-05	4417273945	cali	t	f	\N
aa5796d8-bbf8-4dcd-a9d3-11bd7db56348	\N	$2b$12$MHyor3FxeeQ8UH63V/gOvuiQAtkyLg8sr2UAyJpftFGNMYu8AmhUq	Phone Login Test	buyer	2026-07-18 18:27:55.424038-05	4417274976	cali	t	f	\N
41f8c8ee-81cc-4266-b78d-2ad9b60d77e9	ci-test-mry2g6bf-fe02b3@ci.local	$2b$12$cCYAAA8yOGyMs8Zp94/34uDdyTjJN.5zFDOm1poEb7Wl.pex7MTBS	Test buyer mry2g6bf-fe02b3	buyer	2026-07-23 17:11:37.532208-05	3944697083	bogota	t	t	\N
7cdd61fc-173a-4ac9-b729-c36e6ff11981	new-seller-1784844698184@test.local	$2b$12$ThrKkeheuGGYYCQ9Zd0/.uli7JKdUfUKN7qeNzVQBsqGyvOrqNTmG	Fresh Seller	seller	2026-07-23 17:11:38.613985-05	3844698184	bogota	t	t	\N
f36809fc-e9f6-4d96-9bc0-bdc754adb85c	\N	$2b$12$HH26ssmb1B4.kk0x9BEFGuDjtDzN2qa1xRe4fubTXwIiQ9rpBBOby	Phone Only Seller	seller	2026-07-18 18:28:04.47151-05	4417283925	cali	t	f	\N
2e03210f-c162-4953-89b4-4cca7bf2cee1	\N	$2b$12$tPQnxB5wx5LXcAnRLREpnuXF5ewQkbFOGO.2o12Rki2aAHv4GNxYi	First	buyer	2026-07-18 18:28:05.282516-05	4417284748	cali	t	f	\N
291a6748-ea39-40e2-a691-b42f95d9cc09	\N	$2b$12$57t9Y3mpcVF6tKb20PJE4.96sF37sCCyzMEX6BU6uQagMNZGN11FW	Phone Login Test	buyer	2026-07-18 18:28:06.485244-05	4417285890	cali	t	f	\N
85e35802-4818-4fb9-9563-9cca9a818bb9	new-buyer-1784844698642@test.local	$2b$12$f235HC3uZjF4maZpvqlVKuE4ArYC8kX6WIgOVE/7WfmrzSPNBkUj.	Fresh Buyer	buyer	2026-07-23 17:11:39.103546-05	3844698642	bogota	t	t	\N
13481b07-567a-453b-bd8e-41a49de3514b	ci-test-mry2g7vt-149335@ci.local	$2b$12$G/DsmLHXUg2aCblKKH6KCO/WI.upOtlr6ZYyy8bqI9ASvotl4OJMe	Test seller mry2g7vt-149335	seller	2026-07-23 17:11:39.579867-05	3944699114	bogota	t	t	\N
4f92dab5-40c1-47ef-b72b-4a310e3eee2b	\N	$2b$12$KYJuqjqzYfN5fJxknB3TL.Z1OqeYNgO6Pj/Da.F6m61OEqh2N9c7m	Phone Only Seller	seller	2026-07-18 18:29:02.192846-05	4417341737	cali	t	f	\N
e3110068-61fc-46d2-bb45-606eb509ae5c	\N	$2b$12$.Tdv/IXkCDbK43HqF/W3fu/ktlG4Bm2n4gegjXWZ.7l3eLSFYPb66	First	buyer	2026-07-18 18:29:02.885377-05	4417342308	cali	t	f	\N
1a837bb2-771f-4a01-b856-e9341412cc0e	\N	$2b$12$YUG.vaoxafZpVzxOeGEeUON2eTwQFLSa7uZY3mCVcsWWpBjtS6q5m	Phone Login Test	buyer	2026-07-18 18:29:03.967643-05	4417343471	cali	t	f	\N
ac9fd34c-3765-4177-8783-720685e4aabf	\N	$2b$12$7lGEDY3HFBoW.hthTI23m.mYYORqmEH2o7UU9VkmiH4esCKvPd1be	Phone Only Seller	seller	2026-07-23 17:11:40.554727-05	3844700088	cali	t	t	\N
6f1df609-6dc2-4bd3-91cb-cff3c4d46647	\N	$2b$12$ztfhQnZohIHLgjxxL5bJ3.6dfbIbYcdDptZQeLumWANrwf.uxrk6S	First	buyer	2026-07-23 17:11:41.089817-05	3844700631	cali	t	t	\N
858acd46-cbae-491a-a818-0957efcac21e	\N	$2b$12$DWKpnYMxSv8WyjTSKcVAwufZOuVQ.GvpyarGCR/3pPnc14FVxnIia	Phone Only Seller	seller	2026-07-18 18:29:11.725359-05	4417351291	cali	t	f	\N
d32ee731-f947-4eff-9e8e-93153afb89eb	\N	$2b$12$eQQmjE8eaO9F7CalRsovr.1HYoWyR7.F5sywMYA2GW4AbHCQr8M0i	First	buyer	2026-07-18 18:29:12.257525-05	4417351796	cali	t	f	\N
e27ce020-ff44-4b86-9ab0-4d84d99ead76	\N	$2b$12$ahqAUwa195knLn8jKaNt8OMBlUV7nyqoahTrk8AYqoNino/eBVO5a	Phone Login Test	buyer	2026-07-18 18:29:13.298923-05	4417352775	cali	t	f	\N
201bcc60-6004-4819-ab3e-2da635f4952a	\N	$2b$12$CqG/DmhtXRIlKKfOWjogouz6E6waXM84PSX8OMlZniRVxeKJ4mF6i	Phone Login Test	buyer	2026-07-23 17:11:42.221649-05	3844701638	cali	t	t	\N
8d10abe7-e7ea-4497-933b-3dc5c0278d4d	ci-test-mry2gqpg-86b75b@ci.local	$2b$12$WWNhj7nKv2zuqOqOdFYz.OxPISzRD3Cos4dvgCuCJML9ttsk85VIW	Test seller mry2gqpg-86b75b	seller	2026-07-23 17:12:04.060914-05	3944723508	bogota	t	t	\N
b4a2ebe3-1dee-4a20-8664-78564e19b146	\N	$2b$12$sgP8hoiykNZSIZH2vCsD3Ou/MqTJwl.jZ8xp0Tij6cbPkj3ofJK8i	Phone Only Seller	seller	2026-07-18 18:32:39.358493-05	4417558901	cali	t	f	\N
6e336ee3-61ac-414c-8cff-22e0f31f87f4	\N	$2b$12$V8HFTkocFrKzrqwO..1VAuPPMxapdU.euP1/r9jidgxkH7dSM9Xuy	First	buyer	2026-07-18 18:32:39.889461-05	4417559445	cali	t	f	\N
29e15d1d-c79a-4ee9-95eb-8e552d18edc1	\N	$2b$12$EeMbE.9OwBIFDPry3gHWnOWUOrTMTBVvadP907Zb3cyg3CMA/Insm	Phone Login Test	buyer	2026-07-18 18:32:40.933417-05	4417560479	cali	t	f	\N
d81a1e45-cc2e-4c45-9b9a-377a3b07eb12	ci-test-mry2guqu-336261@ci.local	$2b$12$et8o5LKHChmDw9P5RijCJuoYosjuNs7YgQ1AuIsQbXfDigIkShgzK	Test seller mry2guqu-336261	seller	2026-07-23 17:12:09.232813-05	3944728742	bogota	t	t	\N
33f80b76-b1e6-46c1-b3b1-7c19af1a8db4	ci-test-mry2h53d-c6d1ee@ci.local	$2b$12$A26yMQBCtXIJqiOmbL2ETeDMre7f/GYrcANHBQh0QiIxrDSnhPyl6	Test seller mry2h53d-c6d1ee	seller	2026-07-23 17:12:22.597072-05	3944742154	bogota	t	t	\N
2ae6825d-92f8-422c-aa20-d0c0bc7d5e59	\N	$2b$12$wVsXeShXHmfX12lQlXbVnuBUxANSvtg5/XJHfBf2biBu4AWnfnTyW	Phone Only Seller	seller	2026-07-18 19:36:51.047046-05	4421410619	cali	t	f	\N
6b154aee-2375-4a20-9be1-ab9faf374cba	\N	$2b$12$K5PKYV9jwIJJ4B2.MkFJ6uPH56jofJ27ZDPGeF4UbKU/dmejyNS6.	First	buyer	2026-07-18 19:36:51.542693-05	4421411110	cali	t	f	\N
cae329cc-b83f-448b-a8b8-02b03e684097	\N	$2b$12$4xUji96HZiIeUjQQI5tqFu8xV7TwR8D7GgIQz7Xnp7f07dsDpfwmi	Phone Login Test	buyer	2026-07-18 19:36:52.509277-05	4421412055	cali	t	f	\N
461579e9-e451-40aa-9d31-881d8d987cb8	ci-test-mry2h8fu-f67404@ci.local	$2b$12$jL/xzwZAWD82Tf15RtGy8OV0N9lt1lY43GDDtX1rni86yWupcaQsS	Test seller mry2h8fu-f67404	seller	2026-07-23 17:12:26.924137-05	3944746491	bogota	t	t	\N
cf6fdd5a-86ae-48b3-adda-25e1f363be20	ci-test-mry2hoyt-6e4764@ci.local	$2b$12$FQCaYoSJ1ClJeUMn1oEw6O9wHFagdcoR.PDGWAAU19dDmuBd2pN1y	Test seller mry2hoyt-6e4764	seller	2026-07-23 17:12:48.395227-05	3944767910	bogota	t	t	\N
a900f90a-c783-4036-9935-323ae4503ad3	\N	$2b$12$pyg8jat3x0SruVOg9ZbyoOSwREmRB1LLNK9OtSP9Zit7/m5kRR1eO	Phone Only Seller	seller	2026-07-18 21:53:18.230825-05	4429597674	cali	t	f	\N
0236dbba-48e4-4cc5-9d40-65d4825a1587	\N	$2b$12$.PicVVwzbgXAfXxURqo4geRvBYB7HAP.xVnK/9UpG8cYo7T7976Ku	First	buyer	2026-07-18 21:53:18.849673-05	4429598335	cali	t	f	\N
0f586b84-9ca5-4656-a21e-ac84c62dc340	\N	$2b$12$8CcqSy0XDsp383F.ODTC2.WvcOGcdliLK59mh0nBzINGL6mkXBqNe	Phone Login Test	buyer	2026-07-18 21:53:19.973813-05	4429599502	cali	t	f	\N
98af4b2e-d943-4817-a2ec-1965140a9907	ci-test-mry2hsmp-862804@ci.local	$2b$12$Az7Vkwje5pA3aokbiDJik.FGH3msggdgyb0JvAxp7NFp5zDs.dGpO	Test seller mry2hsmp-862804	seller	2026-07-23 17:12:53.121096-05	3944772657	bogota	t	t	\N
c1207ef7-4245-42a0-9f65-2a770aa9c870	ci-test-mry2i4jb-322125@ci.local	$2b$12$OpjoAZCQr0wF.wuM8F7L1.WEEyjxHhjES6tDoBi1zYnLNeGzO.Axu	Test seller mry2i4jb-322125	seller	2026-07-23 17:13:08.595092-05	3944788087	bogota	t	t	\N
414b39b6-5390-4711-bf30-d525f73014ce	ci-test-mry2insc-f78a47@ci.local	$2b$12$nAQzflRB5W5bVQ3JoThIKefa6eU84r1wxRgxR/LsSOB765MNgopla	Test seller mry2insc-f78a47	seller	2026-07-23 17:13:33.587196-05	3944813036	bogota	t	t	\N
0cf4e6b1-f499-4231-9b7d-2b752937ab1e	\N	$2b$12$OMatdlhOOqZq1z4RwI8kQO.kXSQAxrNW0ANkdhLVI1LP3Y/mzfcfC	Phone Only Seller	seller	2026-07-18 21:54:44.408993-05	4429683938	cali	t	f	\N
7f50d24d-66f2-46e2-81c3-ee8d864fdb97	\N	$2b$12$gmm3kKSqldK5TBwxEqAsk.DlrycCA7pdvjyzEwazA5wv9NPG69kiq	First	buyer	2026-07-18 21:54:44.942974-05	4429684480	cali	t	f	\N
2043315d-779d-4e6d-b0ba-b77df1832c83	\N	$2b$12$SZ6ktaa61dsX4p9zosRkhOum.gi4QfRK9DY3ludKlfioSIUNMrtFW	Phone Login Test	buyer	2026-07-18 21:54:45.96638-05	4429685491	cali	t	f	\N
8008c6d5-88b8-4b6c-b6be-bec5613e852e	ci-test-mry2j3ff-414463@ci.local	$2b$12$8jaH5H5bO1PsnEWudVNRWeYH1ncEcBMZJudSov.PLPaMQIUUHmWg2	Test seller mry2j3ff-414463	seller	2026-07-23 17:13:53.81032-05	3944833307	bogota	t	t	\N
c61c74a2-10cf-4b1e-862a-3a02dd029844	ci-test-mry2j7ih-e4695a@ci.local	$2b$12$fNX7CqmESk8JCU5MDkPxMuAYzliTbPhUMHK6IQiN.NBc2dE6FHdPW	Test seller mry2j7ih-e4695a	seller	2026-07-23 17:13:59.126502-05	3944838601	bogota	t	t	\N
46864330-b89f-4352-b36d-41d0e0193dd1	\N	$2b$12$ePRLontTnqAk1EklNW/xu.6rd70tF0lIx1dhZxmHaPOd7BZX3B6Ee	Phone Only Seller	seller	2026-07-18 21:55:34.08371-05	4429733517	cali	t	f	\N
1b6fd34f-5a0b-4898-ae6e-b082a9cfcb38	\N	$2b$12$GfnuJt86QRlg6AKKUq/HCuSw0bGHfTGAO49ci0o9FmT0l9v8BzJoy	First	buyer	2026-07-18 21:55:34.655535-05	4429734173	cali	t	f	\N
40be659b-b657-4eea-b36b-9671e06c9cf9	\N	$2b$12$U0sD5wmIHo.ITdv7r9L6ROIZR0K0F6MzrFvS7G66PVAzCs8nTMVOy	Phone Login Test	buyer	2026-07-18 21:55:35.64976-05	4429735177	cali	t	f	\N
e790a742-94e6-4e7b-9f03-a3b2e0fb3ab5	ci-test-mry2jccu-144e3c@ci.local	$2b$12$QWuoA44VfGuNP95qGxUvC.oTEP2w9qsMkLUjfyko6bPNSxp86JQDG	Test seller mry2jccu-144e3c	seller	2026-07-23 17:14:05.352451-05	3944844878	bogota	t	t	\N
b20a67ed-fc47-485f-83b5-662196d76fd9	ci-test-mry2jrvs-c4043c@ci.local	$2b$12$zbcAFOV5wrOhdt6W60iiOuMIW7hr6fBr.fZcOajm0K50KqlZwpM06	Test buyer mry2jrvs-c4043c	buyer	2026-07-23 17:14:25.561434-05	3944865000	bogota	t	t	\N
d7ad375c-94f2-4065-84c5-3947682709a0	ci-test-mry2jt20-c242e9@ci.local	$2b$12$sKgMk7ZUDeInWA4VH6n3c.HQz4B5Bb5ukqUbAjozh.HCIqDqJkxsu	Test buyer mry2jt20-c242e9	buyer	2026-07-23 17:14:26.944832-05	3944866520	bogota	t	t	\N
6e98f4d0-176f-400b-9480-a17a948c615e	\N	$2b$12$47Uy3rhZYjEJua5ZZ4GyueBMbNy6gp1UzZl6nyGD0461Bbl.ZOJiq	Phone Only Seller	seller	2026-07-18 22:12:53.261735-05	4430772785	cali	t	f	\N
9d5ad988-6594-430b-9835-b26b5a5d1710	\N	$2b$12$9ylfOphUgFMpNAu4fRJWVeMUJdEWzSBFuW88AfPdUk2elZ8z3.fGS	First	buyer	2026-07-18 22:12:53.875054-05	4430773416	cali	t	f	\N
0d67a491-8680-4eb9-8894-f52389467836	\N	$2b$12$0OZQYmOnNmEgJ8ef9UZgXu9BTQfWH2F45f92lQe4N4r7fa9ZBlL4K	Phone Login Test	buyer	2026-07-18 22:12:55.379635-05	4430774642	cali	t	f	\N
2506ba2a-831c-4bf1-9697-8df11d9c1e69	ci-test-mry2juj8-de3fe6@ci.local	$2b$12$M/UuIgYIwkJaDGFHOrp6vunSnHycI8dBQwaXxkDrCijt5ZP113LXe	Test buyer mry2juj8-de3fe6	buyer	2026-07-23 17:14:28.889829-05	3944868436	bogota	t	t	\N
0d35f76c-58a2-4fa1-bf5c-b345018e2cf2	ci-test-mry2jv9t-fd4d7d@ci.local	$2b$12$Jh5e.LEa03Z0uxqkXUyxX..bd0nlmmMsL3raLh0fFDNt72R5PeUeG	Test buyer mry2jv9t-fd4d7d	buyer	2026-07-23 17:14:29.868963-05	3944869393	bogota	t	t	\N
9de1ec14-f464-4228-a1fa-958b9bafd0aa	\N	$2b$12$dL5BBbOTLlhvOXZi7Ta/9.YpYkAZozU4bCUexk.27Yxz0APmHlaEa	Phone Only Seller	seller	2026-07-18 22:13:53.506915-05	4430832991	cali	t	f	\N
48299db7-d224-4c37-b1fe-b8c29b39e3f4	\N	$2b$12$S3dq2I5HhIXMJHXRWuP2Jex.f3GT1Xt5epZoC86YYj0Np7DGwS/qy	First	buyer	2026-07-18 22:13:54.381342-05	4430833777	cali	t	f	\N
500a3368-5e72-4e35-99ac-70dd19288a04	\N	$2b$12$NEQWUK52qIKlWMfR7070auivUB8DY19TjBXTyKNz24kPJy7tme.2i	Phone Login Test	buyer	2026-07-18 22:13:55.61346-05	4430835068	cali	t	f	\N
fa287960-7b8a-4379-baaa-66ef6f32d1fe	new-seller-1784844870584@test.local	$2b$12$4SCRUmOHHaDQcWplr8uPv.5t0elatiOd.RCFrMabfuxOotmadxG4.	Fresh Seller	seller	2026-07-23 17:14:31.041356-05	3844870584	bogota	t	t	\N
25d9ca18-48f6-4407-b8f7-3e8862e983ee	new-buyer-1784844871061@test.local	$2b$12$8nORTnu0rR3KHHXnkkP3YOu0AaraZ2/ua2S7MBEjz.W9IYc1C4ZY.	Fresh Buyer	buyer	2026-07-23 17:14:31.502067-05	3844871061	bogota	t	t	\N
2dbb3df0-c184-402b-89ef-15fc0eb4646f	ci-test-mry2jwwq-27e315@ci.local	$2b$12$0vXaoR1VVCph8gNSKP4h1.QJIstHuI4OfqLz1ZUqZCZU.VzlMFW3G	Test seller mry2jwwq-27e315	seller	2026-07-23 17:14:31.942979-05	3944871514	bogota	t	t	\N
979ff6f8-9a13-4af3-a23a-8f233234e249	\N	$2b$12$l7SYuaCpx89fBx/vytdYjuvdp77IXwFhi23n55m0gaSWX73ZwGDlq	Phone Only Seller	seller	2026-07-18 22:23:47.257357-05	4431426835	cali	t	f	\N
ebde703c-3309-45af-909b-d9ceeeb0118b	\N	$2b$12$5zdzMcw/bmzhHioRmLuIUuQwRtG0/tyzOjRAg.YDj9rbQlgS5ulUK	First	buyer	2026-07-18 22:23:47.826916-05	4431427355	cali	t	f	\N
37075a78-5f8f-4929-9b4f-75db12a04cd0	\N	$2b$12$H1KOUivdPp82fyD936RkEeIfRLwuLLybnIEf9g1S4gBib4POhxPwi	Phone Login Test	buyer	2026-07-18 22:23:48.787594-05	4431428351	cali	t	f	\N
e47957cd-0322-481d-87a5-683c2a106072	\N	$2b$12$vnoxE6wR/J1vheKxz99ckO0Ho6WKT/7nkOEjXogGPDKcGh/94DL.m	Phone Only Seller	seller	2026-07-23 17:14:32.945485-05	3844872475	cali	t	t	\N
7b5fe3c0-af1c-4ded-a9c0-1d4ee112f907	\N	$2b$12$m3yAMoH6mYkznWLiRmi11.gJ2akvhxAF9Jcdf.EsqaSdqo/eKapUm	First	buyer	2026-07-23 17:14:33.49942-05	3844873054	cali	t	t	\N
b706df1c-3c23-4924-be03-767346ec976d	\N	$2b$12$GA4PFv4LLTU.bw32ZBippOne/bdKdCrh7jkLcP3GFNyJoAnA0f9KS	Phone Only Seller	seller	2026-07-19 00:00:19.072348-05	4437218563	cali	t	f	\N
260b20c9-58ac-49f4-9f40-d84e1c153bf1	\N	$2b$12$hd5nUBPbl2KmWHVhWOnqYOV2PMd7xBWzIyIOr0axLQbfQf1mgP942	First	buyer	2026-07-19 00:00:19.680959-05	4437219154	cali	t	f	\N
558c638e-c8f1-4f21-bba6-56f710305ac5	\N	$2b$12$CL9N4Ryz3Z5LgyFchJyq0O9c6.1mjpBAFmr5Ggs2EecNYJpIP9Xc6	Phone Login Test	buyer	2026-07-19 00:00:21.292599-05	4437220562	cali	t	f	\N
3e134f87-188f-4a5b-b85a-8a6cbd8f2432	\N	$2b$12$rosh80JLprDsSwBJE98/cO0klWMlyCp/etz2sURBlhbgwCpNKYL/G	Phone Login Test	buyer	2026-07-23 17:14:34.466733-05	3844874031	cali	t	t	\N
5350473a-4730-4945-8a3e-b90b452da51d	ci-test-mry2k08x-24e9a0@ci.local	$2b$12$ctpyDzrA3KVxW/T8HEn.ie1ILvSRJ7lS1IXwadv0wUQfwruvUoIie	Test seller mry2k08x-24e9a0	seller	2026-07-23 17:14:36.308066-05	3944875841	bogota	t	t	\N
70d1e47a-fc7a-43da-914d-890fb65e36af	\N	$2b$12$ygyoMkPwe7jE6njP9/KjpuYpRB2AfQi1XFWTXtnM/fZLTlx5yCgf6	Phone Only Seller	seller	2026-07-19 00:26:42.983662-05	4438802474	cali	t	f	\N
18f57014-a9dc-48c6-bd9d-e78ddbc5597f	\N	$2b$12$UpJL7HhZPNDphkCUnZfJ3eeQmOkdZYxvXTUWmn1f8aPcHe0T63GS6	First	buyer	2026-07-19 00:26:43.620596-05	4438803109	cali	t	f	\N
c56623fd-6b07-4831-9aef-85606b143ee4	\N	$2b$12$rVqZCQV7AlejOmPL2FpH2.zgk1BPl8AoJL1GkmmDu8iGpdl1ecFiW	Phone Login Test	buyer	2026-07-19 00:26:44.679858-05	4438804192	cali	t	f	\N
f55e540e-b65f-4276-9158-526490610b9f	ci-test-mry2k33n-969470@ci.local	$2b$12$4Wfnt8gTY0CDy.fqDppE9Ov/RE0/0BQxZpFtMWdhMWtb4V05qHC12	Test seller mry2k33n-969470	seller	2026-07-23 17:14:40.40304-05	3944879539	bogota	t	t	\N
791e4727-5851-482b-afe2-2371392c79f3	ci-test-mry2k5h1-a30d6d@ci.local	$2b$12$CxDJcI2no0HlZJMoyKh14.Vx0IyU.nm1xR8zES9S9M9pi8TsMj7mW	Test buyer mry2k5h1-a30d6d	buyer	2026-07-23 17:14:43.062685-05	3944882614	bogota	t	t	\N
81a3a658-663d-4983-a014-f995db220aa4	\N	$2b$12$KAv9sMH3qN3xLXhPz3l2kOOlnQ0MhcZ/PioLIavwZTu53bP4mQG96	Phone Only Seller	seller	2026-07-19 00:48:01.892208-05	4440081385	cali	t	f	\N
dd1568fc-68bb-4bf6-9e05-233f503d478b	\N	$2b$12$vp3AvFayqfezPPTz0MgFKed91lPyGJ/UTq.PYStQPiO4yONsz4Rce	First	buyer	2026-07-19 00:48:02.517066-05	4440082017	cali	t	f	\N
e3f13a74-e3bf-4a6a-9c04-c6c3e600bc7a	\N	$2b$12$CIniNn7u5iuRK3Fns7Z70eoCjHdjN9pWdnJiGDX1aRBNBrBt42uDu	Phone Login Test	buyer	2026-07-19 00:48:03.820329-05	4440083311	cali	t	f	\N
2f1367b2-4d73-456b-88a5-b10521de7c1d	\N	$2b$12$a5wqRwrYmI6JHAsA2nLS8eC6wA6vTBD/HhU0XTHjHu5L2FNinGr3e	Phone Only Seller	seller	2026-07-19 09:22:11.819763-05	4470931398	cali	t	f	\N
59100546-2b3c-4d60-8f89-0513f25535ea	\N	$2b$12$96d.gv9eEZmq7nYYy3IPr.GjssWjXWQ2xxRKA3JL9sTrY6I0se0gW	First	buyer	2026-07-19 09:22:12.349087-05	4470931888	cali	t	f	\N
0c8ce9d2-0d76-416a-a3e3-b550280b8912	\N	$2b$12$l3jx2V5AXp2xztpqLWc.W.nO3W9wjkGDESmg0Tlw7vThWOtNfM.nm	Phone Login Test	buyer	2026-07-19 09:22:13.530855-05	4470932878	cali	t	f	\N
af9684cc-46f5-487b-830f-1f303f3d2d68	ci-test-mry2k1i5-49ec36@ci.local	$2b$12$MWQaBeOF.KuzjM.YhJ3NOOYcS2YBYSKc2aD2O.i7XlPMP58hCcd4.	Test buyer mry2k1i5-49ec36	buyer	2026-07-23 17:14:38.119337-05	3944877469	bogota	t	t	\N
1bdc0caf-d672-49de-aa01-72992ff0665b	\N	$2b$12$xUK0EMdlV4gSgLRyV6TKY.S9FyFG6bKUvxvArANpiTHoTDInAnba6	Phone Only Seller	seller	2026-07-19 10:01:23.064623-05	4473282534	cali	t	f	\N
38cbca7a-1cdc-4a23-b224-e546d67e061d	\N	$2b$12$0LvnKn0sAWEGDpqFbznZqezWMa3/cLhvIvN5nxRmrll5W7jnhYddm	First	buyer	2026-07-19 10:01:23.738931-05	4473283175	cali	t	f	\N
830699f1-cdf1-4c2e-9a6e-e2462cef549e	\N	$2b$12$ddYAfSo2lDAGIZsVDjenyuSACVtnyQbGToWKuBJlhWPCGzrCX2FCO	Phone Login Test	buyer	2026-07-19 10:01:24.921336-05	4473284427	cali	t	f	\N
1c7d8717-6837-4184-b967-d1436ba40370	ci-test-mry2k31c-3ac225@ci.local	$2b$12$yLhqavTNbZgMcfslWCcS8.4gpkLm3wuNOgDXZ/pe5ECj3Bd5jVP26	Test buyer mry2k31c-3ac225	buyer	2026-07-23 17:14:40.092383-05	3944879456	bogota	t	t	\N
60677628-0b09-45ce-8130-85c619700a5f	ci-test-mry3vk31-5dd10b@ci.local	$2b$12$n3smX9APZip5KC5OLGGmO.gx5Qq9WXNt1ZFOlkX8WwtyuC7o/UpwC	Test seller mry3vk31-5dd10b	seller	2026-07-23 17:51:35.32404-05	3947094381	bogota	t	t	\N
bc57d151-9ff4-49ba-92c6-a8f4241c7687	\N	$2b$12$kMqvznMCKEuJc6475KiDG.Pwu3aQszxDj/n2vW7/OjpiBslawLyBq	Phone Only Seller	seller	2026-07-19 10:16:19.992358-05	4474179414	cali	t	f	\N
b57ff7b7-a707-44ad-a65b-6ea2308e5ca5	\N	$2b$12$ocAgxmugPwmfoVXfo7F8C.ZKybZvosV98UFqOUpwBJf9yaDHursI6	First	buyer	2026-07-19 10:16:20.822393-05	4474180266	cali	t	f	\N
9009e21c-3a0c-4a11-b5da-445f02e9ef01	\N	$2b$12$X0bBzZCV3oGl82R9DlBQKetezpAqW9mOV/CL2YbvDqoxj1XH2ReCC	Phone Login Test	buyer	2026-07-19 10:16:22.568807-05	4474182024	cali	t	f	\N
c1b87145-800e-41c9-a293-799773ca5b31	\N	$2b$12$kD4hnvE/UeXEc8NVaj1zuu/daF09uiBui.Vjdq5I7umm7F3WUDP72	Phone Only Seller	seller	2026-07-19 10:20:46.374528-05	4474445871	cali	t	f	\N
ae406b22-a870-4a32-88f5-053b844d9029	\N	$2b$12$OG6c7n9gP5Z7o4SJrVJVS.a/yuNCqstF7JmtDRa3k1hU2At85Q7l.	First	buyer	2026-07-19 10:20:47.362376-05	4474446850	cali	t	f	\N
b1de0165-3cf1-4b65-9ce6-6f02926b8ca9	\N	$2b$12$ArQmjiTGw5fDghgobL/quedWen59bwONtkQxueI9K4MyJbcZVBXrq	Phone Login Test	buyer	2026-07-19 10:20:48.376751-05	4474447902	cali	t	f	\N
bcb501a8-67bc-4a57-b9ff-5716b74c1043	\N	$2b$12$Nwqt.f5nm6MlVOfffq04yOiFdHWbUfv/XBh4izb0KrxtnpAQpo8N6	Phone Only Seller	seller	2026-07-19 11:13:29.611649-05	4477609110	cali	t	f	\N
07f3fe90-fc1c-4f8b-8d20-7767f67cce15	\N	$2b$12$96vdDqJDmmBZvtzrutXs9O60GEljm0YIRial9kfeNp1jQ5YC1TVqW	First	buyer	2026-07-19 11:13:30.395871-05	4477609766	cali	t	f	\N
57dbb985-45b4-4a67-bc3f-b32ce5ea179c	\N	$2b$12$6a9T6nmzumBEX5WWDlEQTOPgtqBexupbtu.q1CjGFY0vBHQJFF/n.	Phone Login Test	buyer	2026-07-19 11:13:31.680426-05	4477611113	cali	t	f	\N
56b630d8-a2ea-4f3e-9acb-9bccbee86955	\N	$2b$12$XGJZ46KjJiHjvRQm4fGbquRnARppW90CPj9EhnDPdQkIHcT2X2uJe	Phone Only Seller	seller	2026-07-19 12:15:56.039368-05	4481355509	cali	t	f	\N
de93d678-09a3-4332-9ac1-ed9e1ef119b7	\N	$2b$12$.UcdMSRbBTmjztcFFDnzmOg9tAxcUPWhBPQD7vm.USfdnXmSWDp0e	First	buyer	2026-07-19 12:15:56.674887-05	4481356175	cali	t	f	\N
9ffad944-0748-43f2-8c50-ed573e4e8c19	\N	$2b$12$LCQy2EFQURuK19JmMSZzF.dyG9YSWGFyljvIiOkTOv0OUGP3qd5ma	Phone Login Test	buyer	2026-07-19 12:15:58.035566-05	4481357520	cali	t	f	\N
6cf91698-b30e-4092-b46d-4005a8dae99b	\N	$2b$12$ym7F/IU1VOhgkPN8us.AJumMA5bx30LdrJN1wOYl17EbLLRGJL4rC	Phone Only Seller	seller	2026-07-19 13:11:23.58205-05	4484682832	cali	t	f	\N
8adf6f40-c312-4a8f-ac48-8fbf31944d53	\N	$2b$12$ZPm6klUwucuexcAj2.ChnOukckHnZ1gQjIyadiU3fxsKeAhgRUj4y	First	buyer	2026-07-19 13:11:24.311989-05	4484683754	cali	t	f	\N
9ffc90e7-d448-4abc-bb04-544901c14a30	\N	$2b$12$2m88ApciXHgEbWa8I9Ixy.3ilrTFEWnp5/OErJgFr12lgTkwxeCHu	Phone Login Test	buyer	2026-07-19 13:11:25.46877-05	4484684881	cali	t	f	\N
5c144462-4810-40c7-811f-6e820a779e9a	\N	$2b$12$qyqvv2pAknmKLfCDJ1m/SOsuXTInr/rqLCzFCLHX60uNIGvoTCtne	Phone Only Seller	seller	2026-07-19 13:19:19.651433-05	4485159093	cali	t	f	\N
b946625b-3fa5-4aed-a023-d096e8fa2476	\N	$2b$12$5p2JPGzthlTr3PId5NwjQ.nAAYXqb57f7fe80wvK/L1gIvH.28F0m	First	buyer	2026-07-19 13:19:20.296972-05	4485159768	cali	t	f	\N
52686dbc-b17d-4407-88c3-cb0e87d13754	\N	$2b$12$9SH/fViZAzAxiobl5A6zM.af5v4juxfOrLPKnTTVlAI8woEJWaKRO	Phone Login Test	buyer	2026-07-19 13:19:21.438344-05	4485160983	cali	t	f	\N
2bfb3707-124d-44bf-9977-820b8fdfc21c	\N	$2b$12$ggXPpiB7rNnj2j5VM4yIoupOLCSXq8rxsOA2hrn292vDBZzZUrJAi	Phone Only Seller	seller	2026-07-19 13:31:45.77201-05	4485905242	cali	t	f	\N
29caca55-2628-46cc-9889-12cf70c0a7cb	\N	$2b$12$RIYV/D6LfnwSDii7Zsx17OFaaEDAos.Q1Qev7CrdE8Xo2Jo8sup/C	First	buyer	2026-07-19 13:31:46.685109-05	4485906130	cali	t	f	\N
cc0f243b-34ef-4458-96cd-93eee3497633	\N	$2b$12$.Mxdhk1FmMkBEH9tgCeI8.9ioLRXxOgL6qU3l86eQ20BnPnvqMFNK	Phone Login Test	buyer	2026-07-19 13:31:47.934236-05	4485907323	cali	t	f	\N
ef3610ec-2575-4be6-a8cd-f15f580818df	\N	$2b$12$xoEFQES9.4L.ejH/NliZd.1cyjQsRH5tbJFSWJ0Zft.34sFBbfVw2	Phone Only Seller	seller	2026-07-19 17:32:13.552852-05	4500333088	cali	t	f	\N
40b0318f-e20b-419a-aad9-9e94e773855f	\N	$2b$12$8nzMEGpoPz3RLX0.Q9x9G.XnXw1dgc6rsBUs7FL8KdX.R5awwjRrm	First	buyer	2026-07-19 17:32:14.220171-05	4500333725	cali	t	f	\N
b7e4e75e-62d3-4067-8d3b-e7778844fe1f	\N	$2b$12$EiZjikIwmOu9iVI6fqiPjew/uKgWpMOcVHs2VqVI3bKvvTtLBCVqm	Phone Login Test	buyer	2026-07-19 17:32:15.472817-05	4500334898	cali	t	f	\N
c6a937e4-5124-41b4-a198-e5ad1e99aacc	ci-test-mry2k690-92c448@ci.local	$2b$12$DGi7kYFbtdeyUQvJpMVKHeRzFMThsyQEo9TF8Fzrkgtts.pLmtKgu	Test buyer mry2k690-92c448	buyer	2026-07-23 17:14:44.070416-05	3944883620	bogota	t	t	\N
0a4b778c-485d-4a1b-9179-ea7b9e7fff83	\N	$2b$12$V5hTPCTWMy.ib9ASjr0BoOquNpMrddJIeZ/Jo20.lkCmXpBlNFWZK	Phone Only Seller	seller	2026-07-19 17:41:46.05813-05	4500905508	cali	t	f	\N
b8f64bfe-0851-4c9a-bc85-45a237051395	\N	$2b$12$9lae6nhQQkgTKRWg8WSrieEEesL.iwFTikizbbqrkVlQalbyUzIIO	First	buyer	2026-07-19 17:41:46.80462-05	4500906194	cali	t	f	\N
17ac4148-215f-4a55-8b89-a3432ab05b92	\N	$2b$12$qgmY8zq6JBS0PEo3J.rNHunhrbTriUZNqO8KBCnVqXpvM68onToQe	Phone Login Test	buyer	2026-07-19 17:41:48.177014-05	4500907707	cali	t	f	\N
e007c9a0-31cf-4e23-9c2b-66584faad617	new-seller-1784844884671@test.local	$2b$12$Ic0f2gOnh07CWYo4gl915O1G/tvveJiXMpTZBr28WF2NL6a3vSOF2	Fresh Seller	seller	2026-07-23 17:14:45.121996-05	3844884671	bogota	t	t	\N
a6ca1e85-393f-431b-9c8c-95a17ff328e2	\N	$2b$12$DjpSpSHQTJThfF5t4c/bH.EY7Trszk94chcdqbPr1adh1XS0mgWCC	Phone Only Seller	seller	2026-07-19 20:12:27.95506-05	4509947340	cali	t	f	\N
96609694-d769-4975-b470-3f0af63f5e33	\N	$2b$12$hEPdKOtVO8aAJ/SkMLlNMemKEXnWVYjNrwZCecNFOjYzqIoYjJD5q	First	buyer	2026-07-19 20:12:28.982194-05	4509948307	cali	t	f	\N
61adcf55-e33d-4616-9540-6bf74acf3a5b	\N	$2b$12$lWd8aRzW21Qjfnnx.mvb/eNdUgFC1aFEvcY.qS.2rZMpM1cZa2cuW	Phone Login Test	buyer	2026-07-19 20:12:29.95881-05	4509949502	cali	t	f	\N
5685c1b4-d004-473f-a8e2-2749cbfae92e	new-buyer-1784844885150@test.local	$2b$12$hhDqJD6epeG2WeQk2rz0Lubtmy9mudOnmhAuZpSO0Tban1KSyKQN2	Fresh Buyer	buyer	2026-07-23 17:14:45.608261-05	3844885150	bogota	t	t	\N
bf59852c-8666-4f58-b5ae-b40369271ed7	ci-test-mry2k7sg-3b9b3d@ci.local	$2b$12$jWxVsrS1asHCCYl7Mle90u8skNJZ4KEMQHBepKdlASEO7PP0hRfMK	Test seller mry2k7sg-3b9b3d	seller	2026-07-23 17:14:46.073711-05	3944885616	bogota	t	t	\N
9979afd1-5bca-4e19-900c-fe6559262ee7	\N	$2b$12$PFP6ISkSYw5.vhyViQ7YOeCCwdS0Io983sZAAQB92dan9E5ehFrKK	Phone Only Seller	seller	2026-07-19 17:43:30.92506-05	4501010479	cali	t	f	\N
5c6653f9-4ef8-4e42-a8d8-4136412a13aa	\N	$2b$12$jZjFeQosJZUwBNCaRWi06eMkykvIvNYuOMhX5b/2ybJKsXzRoF8M.	First	buyer	2026-07-19 17:43:31.498655-05	4501011051	cali	t	f	\N
a085aa28-b809-49a8-bec8-d8391ede1b70	\N	$2b$12$SwpcLsMTAzKYGyDQsxFaSODmtVMsLS5a224ZSYQttgRqBZz41t1S.	Phone Login Test	buyer	2026-07-19 17:43:32.632786-05	4501012186	cali	t	f	\N
5fc96667-49f1-4f44-97ee-245cfba994d7	\N	$2b$12$U1/CMFtlOlMBfYF8ND3NzO60KWQoBhJKiSLqjKCAWy0fim3xO.lLW	Phone Only Seller	seller	2026-07-23 17:14:47.138998-05	3844886665	cali	t	t	\N
6628cfc3-d739-4b24-b805-57c466dc1f0c	\N	$2b$12$ML4FFS1Cu.nVwB6Mb/wQN.F.HZwo4.j1bGDNqPt40NMfKhEOENE62	First	buyer	2026-07-23 17:14:47.6539-05	3844887205	cali	t	t	\N
f8b3843c-55ca-4bd9-9888-efc3c6eed559	\N	$2b$12$q7n.h3.hgaudqCA10baiGO4aoeYtqim6UiPqQb9Y91ou2osjOI8bW	Phone Only Seller	seller	2026-07-19 18:03:22.067138-05	4502201637	cali	t	f	\N
8ea82a91-46bd-456c-8539-6ae502d2dd21	\N	$2b$12$a5zoThgymXHfBeXXZZStAu1CfaN0tN25GOWaPt0CayZ7knddgY16C	First	buyer	2026-07-19 18:03:22.640581-05	4502202169	cali	t	f	\N
c687923f-5b25-4d6e-a5ef-f5e89b8c0cf2	\N	$2b$12$jVoj6KY.1HkPvv4QspXpluAjAUAdEPZjPSakG6DtkgtZ8qqcHLGuK	Phone Login Test	buyer	2026-07-19 18:03:23.670234-05	4502203197	cali	t	f	\N
f6464337-2293-4557-a0bf-1515d5ebe0d1	ci-test-mry3vkel-739407@ci.local	$2b$12$iUdtN6dkUAhSZTs.FKC6veN.10lZxISBKlss2HNdoJANclOr88kSS	Test buyer mry3vkel-739407	buyer	2026-07-23 17:51:35.801764-05	3947094797	bogota	t	t	\N
ed872e8f-a8b9-4236-b92f-ab181c77e4dc	ci-test-mry3vn6t-4e27c7@ci.local	$2b$12$4JNDXxrp.D5ZChgOmyyCcOICLH1AiuxR8TAkqFsAK5e2m5tJwkvXa	Test buyer mry3vn6t-4e27c7	buyer	2026-07-23 17:51:38.876441-05	3947098405	bogota	t	t	\N
838cc6b0-1cb4-4142-9e83-af6b78599a0e	ci-test-mry3vnxv-026ffd@ci.local	$2b$12$w2JX.t/6UXQHfwuhaTn9cOViEUh4q/bJ3QYaUHGE1bnkleyBhdfsG	Test buyer mry3vnxv-026ffd	buyer	2026-07-23 17:51:39.804478-05	3947099379	bogota	t	t	\N
a06089d7-84fd-4ecd-a03e-1805819a797c	new-seller-1784847100429@test.local	$2b$12$v3/g.LvRcTZglzxTXJGoOOa6e/4OTK0KFobMY0bn8xqB6xdvkYXCO	Fresh Seller	seller	2026-07-23 17:51:40.880484-05	3847100429	bogota	t	t	\N
428d7be5-1e52-4cec-9268-4dc360d64778	\N	$2b$12$PKuNeV0JNLYbL7GEVB1F0edr536IX6QhfSkBIC6SdpQiNMTcfLkBq	Phone Only Seller	seller	2026-07-19 18:04:23.917486-05	4502263363	cali	t	f	\N
23bbe1da-da24-424f-b978-6e08c3b154b7	\N	$2b$12$bWMTocvH9Y5t9ZBbo7Mt6uLbSJL/pqbAXpp9Ty/gvTo64ACD6aT4i	First	buyer	2026-07-19 18:04:24.637419-05	4502264088	cali	t	f	\N
30394294-13f3-4a22-a056-c14fca1f6ac4	\N	$2b$12$GefXqDNxn.8jifE0Mn3hhuMmGX2H.mqQ9KL8jcdg5UI6P3GtxxxhK	Phone Login Test	buyer	2026-07-19 18:04:25.636662-05	4502265158	cali	t	f	\N
8d3f442e-8854-4a68-868c-20c115b8190d	new-buyer-1784847100908@test.local	$2b$12$0Hh49tdR5eVnsCbeCpUQOu6uSeGxt/RP/LZ7ekB01T6OLrF6QOID.	Fresh Buyer	buyer	2026-07-23 17:51:41.491201-05	3847100908	bogota	t	t	\N
1327609f-392f-4a1d-8cd8-6a0e60883948	ci-test-mry3vpkv-783021@ci.local	$2b$12$jMvhL6IKeqxXWv0zuUD3GuxLc.8VB/BddmZ.c5gzVznAQ88AFVHo2	Test seller mry3vpkv-783021	seller	2026-07-23 17:51:41.956035-05	3947101503	bogota	t	t	\N
305a9faa-3edf-4245-bc7e-3b0217bd51b2	\N	$2b$12$Ig.ghw9nsp7tNv82EM8IT.g.LGFmBcFO/cwrUn.fLhAeJ9e2wRgVC	Phone Only Seller	seller	2026-07-19 18:45:18.043635-05	4504717313	cali	t	f	\N
17deff3b-82c1-4060-af04-ea5a68cfc217	\N	$2b$12$gbUVBSriXNAItHCwzk4fuuN9rR0DgUJNtt5xpO4J5XJlo/KN3Aj4G	First	buyer	2026-07-19 18:45:18.848495-05	4504718220	cali	t	f	\N
fc10fb8e-09bc-4eaf-85a0-5b49a3d18ebb	\N	$2b$12$RQlHmjPbrcQY9ePpPVHHou2COl6/9hs0YxDLw9KeCreQYMswADAni	Phone Login Test	buyer	2026-07-19 18:45:19.972271-05	4504719473	cali	t	f	\N
4115b67c-8b2b-4c95-9bcf-2174f3c30c97	\N	$2b$12$FQfcYGEIzNo49P23UDDgMeAD7NL.tLF74e3P0iexPxN3YIs1a634u	Phone Only Seller	seller	2026-07-23 17:51:43.114477-05	3847102574	cali	t	t	\N
76bd9b02-1236-4131-a527-25be71b6c0f6	\N	$2b$12$vBI.XSleJqEwlWK.dQIcnukBmTQNqx5tFe7kwouHgMEHaMbPGpgiW	First	buyer	2026-07-23 17:51:44.007093-05	3847103474	cali	t	t	\N
2b6436ca-e882-4749-a4cd-eb38d3861046	\N	$2b$12$Fzw9Liv0nADemAAfX5ZxMevuiBAOqiEHPO.eM4CzhT9ctmLGHM4Ba	Phone Only Seller	seller	2026-07-19 18:45:28.615436-05	4504728095	cali	t	f	\N
4ac7da40-bfed-4a3c-9288-bf3df1c155aa	\N	$2b$12$VIJDD3xAVc0HP5ILDnHakeRD.BhBzDJdyIs0WL2Cht7jW8aF/ymSO	First	buyer	2026-07-19 18:45:29.600998-05	4504729063	cali	t	f	\N
48ba5c10-a774-4b21-bca3-f2f3cc653e7d	\N	$2b$12$lu6fxxNW0.cQg7R8WAn1jOx8/Y7XgdrXFY3m3189PXf3OLVAVF85m	Phone Login Test	buyer	2026-07-19 18:45:30.809715-05	4504730122	cali	t	f	\N
4c744bbc-8c73-4cbc-ab29-cc077802957e	\N	$2b$12$l8aT6O0BdHfFJ5IvnjWX1uoQnZwk8B3ZzkxbuDBSwBAWvGHGNdqIm	Phone Login Test	buyer	2026-07-23 17:51:44.968402-05	3847104514	cali	t	t	\N
6252ece0-c608-483f-8f93-cf15e1a3644d	\N	$2b$12$jC9G3jQnEPf1zMtu39Ok7u5LjjChOdt7nlOfoOAiytImvuWitnptC	Phone Only Seller	seller	2026-07-19 18:48:52.298791-05	4504931845	cali	t	f	\N
2726fd44-8326-4b2e-840e-e041f9b7b1c9	\N	$2b$12$cpJsPlCmwGRiqZF90pbtPe559cEmC5E7OzlJvzoduZQEPF6UXiF72	First	buyer	2026-07-19 18:48:53.043652-05	4504932495	cali	t	f	\N
0e1a2125-f484-4770-8701-c3a0ab346997	\N	$2b$12$XmlrlvmNwpnv5WZPliPtKuTEhJ4H6cf2CmAkt4jM6AA/er.JIfRAq	Phone Login Test	buyer	2026-07-19 18:48:54.2855-05	4504933673	cali	t	f	\N
e9d3ea42-7b6f-466f-84f1-8ce015dc82bb	\N	$2b$12$7kpA5tP9/GPuM/3th7Jo2uTjJkPkknzfpvwIh0lwFhcgm6fNsEMrK	Phone Only Seller	seller	2026-07-19 20:22:14.701454-05	4510534108	cali	t	f	\N
6c4e6d0b-fe54-469f-8382-29d716df1b84	\N	$2b$12$8/vBwAVr0MekhrUhAlAdFOQaH3JzpJFle1WBHDRKmOAXA56DCXZjy	First	buyer	2026-07-19 20:22:15.350331-05	4510534830	cali	t	f	\N
ecac1ef0-7578-457a-b476-ffed8ece11a5	\N	$2b$12$A5srIgVU8fBtQLrcKIigSunqk5DlRc.memT4fG6xCUkfTDbn5MYye	Phone Login Test	buyer	2026-07-19 20:22:16.670439-05	4510536102	cali	t	f	\N
8c672955-d4d1-4d9e-b308-228a07ecd857	\N	$2b$12$gtIN6/8.Rojh8XxdSw6a6O6ye5nnqLzlWKOD31oyDtYXd76YdO1em	Phone Login Test	buyer	2026-07-23 17:14:48.738895-05	3844888223	cali	t	t	\N
c9c5e252-1f4c-4f53-a82c-56f74a52af4d	ci-test-mry2kdcq-3d95bc@ci.local	$2b$12$Y9GmI1lVRhUp1tuxBudY9ubfqZdE3qtjG.PJ4ldX1Qs9atEtk/C3q	Test buyer mry2kdcq-3d95bc	buyer	2026-07-23 17:14:53.431118-05	3944892827	bogota	t	t	\N
21edbd2d-92b8-458a-933e-0337e799bb60	ci-test-mry3wz3y-91e483@ci.local	$2b$12$QpZr2kQihQLJSPDVEVw.heuiCaxH5RcSVqZA1ZtE/IleA2OendppG	Test buyer mry3wz3y-91e483	buyer	2026-07-23 17:52:41.095764-05	3947160511	bogota	t	t	\N
0cebc6f7-4862-4ee3-9731-ac7ad9450830	ci-test-mry3x0i0-294823@ci.local	$2b$12$MwE4t0KgAJQYCo9wzxg1SecCE3Tvz7l7mOJDzG9tynNANNZAYgNdm	Test seller mry3x0i0-294823	seller	2026-07-23 17:52:43.194902-05	3947162312	bogota	t	t	\N
f0e7bbe5-1605-44b6-b069-0af7ea817e88	\N	$2b$12$4rScNsVqouSh5aqVUTsx7.epeV3FZBhFMNLppiYyJus48K.TbjNv6	Phone Only Seller	seller	2026-07-20 10:57:28.344476-05	3563047872	cali	t	f	\N
bc7718fd-3b93-458c-ba8b-758ecddb780e	\N	$2b$12$DLibkUMxXXzN/OQR97JyZejDlSos5DHWjYiBggrSevBzt6LC4tMMO	First	buyer	2026-07-20 10:57:28.899058-05	3563048434	cali	t	f	\N
e2542781-e1e2-4f2d-aa64-b12cd3dd57cb	\N	$2b$12$PxCkZUl/VLkWVb5p9akXmuZ/bHX/ye/B5.TpfRpC8oS9DLrZufjiO	Phone Login Test	buyer	2026-07-20 10:57:30.070605-05	3563049573	cali	t	f	\N
5acb6a2f-b74b-4062-bbb6-5d4cca2469c1	\N	$2b$12$24Ab22sfgcrMsLyakbxtr.WDX.aasVrMhS3ossZQZvPs5Qri.5cNu	Phone Only Seller	seller	2026-07-20 11:29:02.591779-05	3564942089	cali	t	f	\N
a01cbd8a-2791-4e65-8a3b-54644f066d14	\N	$2b$12$vCquSiZ4S18aYwE5mjGxtu3/vFhmxC7ar..5Vv6H.fuo6FWgLYclW	First	buyer	2026-07-20 11:29:03.163132-05	3564942693	cali	t	f	\N
08e6e8b1-bacc-422d-a016-757ad0097e34	\N	$2b$12$RdG21ef93nUCjWDJZoF0.upPtgLeQ0I3cltEhRTYr/DT6MarfiS1i	Phone Login Test	buyer	2026-07-20 11:29:04.550748-05	3564943900	cali	t	f	\N
c58f2748-72d6-4f77-a619-9edc69aa8280	\N	$2b$12$rr.kcjAqendq3sZ2pyufZu4tm0MydQNB1vdPPXQydC95kvK9/X6r2	Phone Only Seller	seller	2026-07-20 13:31:07.024143-05	3572266469	cali	t	f	\N
b848fc6a-1aa4-4a93-b77d-3d99d3fe5edd	\N	$2b$12$PnovSCGFqaiBSkLsD/VIG.LhN08tQhqddbnZ.2aiqPkeYPgxxrSGW	First	buyer	2026-07-20 13:31:07.653108-05	3572267162	cali	t	f	\N
a3f6ab64-5241-438e-87c5-76f9311714cf	\N	$2b$12$x97RuKhRPvG0EFzpGlALCepCHS7ViZJNqwQh.Aefle7rgJc5.Q7P6	Phone Login Test	buyer	2026-07-20 13:31:09.099092-05	3572268423	cali	t	f	\N
e1a34ea8-4651-4f49-befd-231e113becca	\N	$2b$12$AAqCJygmq46xkcLOIeHRU.VB7RzPhqZbpnZdDn8x35OQGGXk/yAOS	Phone Only Seller	seller	2026-07-20 16:46:03.231787-05	3583962677	cali	t	f	\N
2d8137da-1ab9-4109-8acc-c0c0d90a66f2	\N	$2b$12$kqi63aKmV3hYhyJlxqRvz.sw7xaqi8Wm3NMLHR5n/WE6P1LYGJb5i	First	buyer	2026-07-20 16:46:04.248359-05	3583963675	cali	t	f	\N
49b91607-d983-49e2-9b30-206a9dcacf39	\N	$2b$12$6P7.zxF1YlzfgS5eelGc7.cyQM1RIk9w8kVzofw2n9TRfg/JKI2F6	Phone Login Test	buyer	2026-07-20 16:46:06.013783-05	3583965077	cali	t	f	\N
51d84e70-3991-4b59-86fa-619dbf6be258	\N	$2b$12$aLpZFroBuIddhgzylzOKc.bgEma.gFd8OhDIi/.TqFpMQvuHKRjpa	Phone Only Seller	seller	2026-07-20 16:59:11.417519-05	3584750946	cali	t	f	\N
057d6c59-5466-4b00-96bd-b05cf65d7f1b	\N	$2b$12$/IzOFbVQ/gnzATcwnC2Ihur23vbtxcbS6mHaQdLJt5WaSLrQaum.S	First	buyer	2026-07-20 16:59:11.941997-05	3584751503	cali	t	f	\N
4abff3f5-58dc-4592-8e7b-f8576c8c35af	\N	$2b$12$mu/GkCh.zwG43z1CYpI42O7LR9dfuKCflZlnEOL2Jv9VIT3MQj7by	Phone Login Test	buyer	2026-07-20 16:59:12.917789-05	3584752475	cali	t	f	\N
be2d04a0-6be5-4b72-b7e6-4b721cc1410d	ci-test-mry2kene-2dd704@ci.local	$2b$12$sFWjtROWZug0pdoRrTof.OhQSWWDDMbLDgz1wKHivT9X9MXknSXhe	Test buyer mry2kene-2dd704	buyer	2026-07-23 17:14:55.01388-05	3944894506	bogota	t	t	\N
0e74a23c-eb41-42af-a4a0-08d047f17234	ci-test-mry2kh9v-0e3161@ci.local	$2b$12$uj3P5rx2TTAq3Erj6VufgOaUX0h4ZdtVa9OEM9cXad9EH1D4cv8v.	Test buyer mry2kh9v-0e3161	buyer	2026-07-23 17:14:58.365209-05	3944897907	bogota	t	t	\N
0a3eb64d-bbfb-4137-9a80-907b0dd04a10	ci-test-mry2ki4y-6dff2b@ci.local	$2b$12$jPsxvBtM3Y1wBTOJfaMryeWcriL67Yz7SbZrc04QXucmC5Rd78HbS	Test buyer mry2ki4y-6dff2b	buyer	2026-07-23 17:14:59.49737-05	3944899027	bogota	t	t	\N
d17f4bfd-48c5-4ec0-abe7-bada1ad9e510	\N	$2b$12$DLK4a9I.ySGEEhMPtOtUTefQFKz12XAh1y2/ZjkGQhKjeRaCsn6le	Phone Only Seller	seller	2026-07-20 17:08:04.520363-05	3585283891	cali	t	f	\N
34e29ed7-9421-495a-bfa8-2cc97dd9e85c	\N	$2b$12$ovfBjgAcgtlcNsrpMkvPM.Cpb7uV8VNULHm5w1cbcBO4GNrdXjo82	First	buyer	2026-07-20 17:08:05.486155-05	3585284852	cali	t	f	\N
cb9a7294-8e69-4e21-b1dd-7b3d099c0f31	\N	$2b$12$c8lAxmUbAopRTZv0TOw48u3rwqlejtYUwq76VQCt2tKvPvizH.xqu	Phone Login Test	buyer	2026-07-20 17:08:06.703177-05	3585286147	cali	t	f	\N
34c9d2fe-2445-4034-9e73-208323817d79	new-seller-1784844900400@test.local	$2b$12$EcBmHw0DcDM.VsnEMFFGmeSJN44XnEF0EIHB/KIA2Hh15x1maeVcu	Fresh Seller	seller	2026-07-23 17:15:01.316819-05	3844900400	bogota	t	t	\N
d20bdb35-2f60-4570-863c-df8e6edea9d0	new-buyer-1784844901340@test.local	$2b$12$XysHVHarNf8r80iZq2WoyObOfWaKtgbMz7jPpciqBR0DlYjVaFgCG	Fresh Buyer	buyer	2026-07-23 17:15:01.806534-05	3844901340	bogota	t	t	\N
b07344b3-e4e0-42c3-91bd-1828ccd1d37a	\N	$2b$12$dd2QTpKwNm9h/z2dn.G82uOoXOwTM8WJp49rPP4FZ41N.rSQqVyc.	Phone Only Seller	seller	2026-07-20 19:07:52.420171-05	3592471972	cali	t	f	\N
9acd16c4-657a-47a5-b233-6cd15b3f5bdc	\N	$2b$12$NR7BnwZGINnwXC.V67Kq2OsycDHbMFHXN./.5pTBuLQSaUs2TNUZ6	First	buyer	2026-07-20 19:07:53.002563-05	3592472509	cali	t	f	\N
a46c5338-59e8-4a5a-aa29-80f8e7b86211	\N	$2b$12$RCktYYjVUa6/tXpGzLFrNeroUPNmfPG1Oro92Vri.iv9KI0V.8YoW	Phone Login Test	buyer	2026-07-20 19:07:53.977117-05	3592473549	cali	t	f	\N
4d50e9c0-5b96-4969-9131-85ef648d342b	ci-test-mry2kkc8-39aa6b@ci.local	$2b$12$l2kjtNg85yIFcitpM3H2DO583nxWIO1gn7ZcrV2afM30ZBLBawoH2	Test seller mry2kkc8-39aa6b	seller	2026-07-23 17:15:02.366191-05	3944901880	bogota	t	t	\N
383ac6aa-d725-4d6c-bc92-d4f99882842f	\N	$2b$12$Pwl6T736FpsdgNIGFFmf9eDji8QjOuvVhHRV1Y0XiU9GYsZ5rdL5.	Phone Only Seller	seller	2026-07-23 17:15:03.867817-05	3844903058	cali	t	t	\N
86a2c8b1-90b7-47c6-b90a-6a6944f49414	\N	$2b$12$VhNFNUG963.ZoNqxJpcvN.IqDDBbO5IviMzEbxUduG15zVweQsyA6	First	buyer	2026-07-23 17:15:04.859068-05	3844904167	cali	t	t	\N
795720a4-19ac-4e1b-8b07-4f45c5823fd8	\N	$2b$12$D5f3XpJCifwHGjAicQJOIuHUefGpf0K9xITAHb44K2ePYBFmazJf2	Phone Login Test	buyer	2026-07-23 17:15:06.040138-05	3844905384	cali	t	t	\N
9be1b916-0010-4f7e-89dc-d345b2452d5b	ci-test-mry2l5mp-4b5315@ci.local	$2b$12$3ME3wYC1PtUnqoGvlA37le5QmZZ.6uuD8bFbhs2ZFU/JcnFJNUi9C	Test buyer mry2l5mp-4b5315	buyer	2026-07-23 17:15:30.15546-05	3944929473	bogota	t	t	\N
56b850df-3abb-4812-9498-2f2ccba31508	ci-test-mry2l71u-9bef43@ci.local	$2b$12$OaEDVmR5RcXGGZbwBVAAd.Acr5O0FumZfmm.FRkfs1.isA8xV0UxK	Test buyer mry2l71u-9bef43	buyer	2026-07-23 17:15:31.925186-05	3944931314	bogota	t	t	\N
1138d83b-30b7-42e4-b4b6-a764f5928205	ci-test-mry3x0ez-e15cc6@ci.local	$2b$12$KWFEpV1sOubViwz9j9Q8V.g6BGaa2j7mSG/PNNdOLcg7MNY8hznDK	Test buyer mry3x0ez-e15cc6	buyer	2026-07-23 17:52:42.96233-05	3947162203	bogota	t	t	\N
3f056c1d-9345-4cec-a785-65f53a83b8b9	ci-test-mry2kf3x-31c440@ci.local	$2b$12$C6nQAcY0fuQvPI8Mr6G5QuiH0ubxFMDfkuVHCesK1j1wW4OFfoinC	Test seller mry2kf3x-31c440	seller	2026-07-23 17:14:55.592494-05	3944895101	bogota	t	t	\N
79f86ba9-f562-45a4-929a-f9fe13d52cd5	ci-test-mry3x2pl-7f84b2@ci.local	$2b$12$Gm0XZ3.KFlavGSwIfoaavuA92kpUsYVcjQtIk2fNOkvhkVK3EZV5i	Test buyer mry3x2pl-7f84b2	buyer	2026-07-23 17:52:45.732475-05	3947165177	bogota	t	t	\N
ef914522-e769-45cb-9cd5-977b076c608d	ci-test-mry3x3jx-9df0f7@ci.local	$2b$12$CGKxpSgNPZxonFXJR7TWAupdaOCqS6kgzMF7tIZ1q2dOIR4cC/UaS	Test buyer mry3x3jx-9df0f7	buyer	2026-07-23 17:52:46.72683-05	3947166269	bogota	t	t	\N
d9f87de1-51c8-4e83-a749-0ca28d099664	new-seller-1784847167353@test.local	$2b$12$APvqkYqYmSnJlGuQlbI6aeAe6wJAmSMv/qYCqQSBtEYvEqV3xLN/K	Fresh Seller	seller	2026-07-23 17:52:47.831901-05	3847167353	bogota	t	t	\N
9f779994-accb-4e3d-9e8a-57a4874040d4	new-buyer-1784847167865@test.local	$2b$12$dYtHhjb0zmPLk/iVifip4.SlFeeTOXQB3U7tChdt5RDYhFzQEv84.	Fresh Buyer	buyer	2026-07-23 17:52:48.344095-05	3847167865	bogota	t	t	\N
7950c817-5ff1-41a6-99aa-9681c3e93af3	ci-test-mry3x567-8bd901@ci.local	$2b$12$vzYeCSXJF1lgd6dV7KzxZ.CNgh53DZYabWVrGPntfLvEG7KSO1W7G	Test seller mry3x567-8bd901	seller	2026-07-23 17:52:48.835597-05	3947168367	bogota	t	t	\N
a52a1e88-60af-4475-8cc1-72549ada4791	\N	$2b$12$O6IEYZfVBM3VRv8jhxEurOdeSHSQWjhu5lY1C/NegRnFO6GaP2KEu	Phone Only Seller	seller	2026-07-23 17:52:49.84888-05	3847169387	cali	t	t	\N
df011129-d85d-48e0-8ff2-4089c0c8a9e1	\N	$2b$12$q3Fm88YMAsXc3nTrKdhpY.da2DI0WwPfzFEkaYVIt02pbf3/fJH5y	First	buyer	2026-07-23 17:52:50.390842-05	3847169933	cali	t	t	\N
d246c130-8da1-4f01-89a3-1cd60a813263	\N	$2b$12$xsVYkgQPNyhxmG1Nk0UAOexJg/soI7pWIo2qJpfkxF0Jy7bQi2AGi	Phone Only Seller	seller	2026-07-20 19:36:58.116596-05	3594217549	cali	t	f	\N
525f1ea1-a6ed-4397-9bd0-f71bcb3dba75	\N	$2b$12$cEQEmS4QEMxjsarIax2LYeDrQbd28t.pxrTzSArNgeRT/r9Sm8Pfu	First	buyer	2026-07-20 19:36:58.753995-05	3594218285	cali	t	f	\N
07c709cd-b640-4a88-ab4b-ef211dc36f56	\N	$2b$12$iU/mmEkX3nmWonOz2LlvG.QGKQjLj5r8DgLBhzqMpnzGZN/MmH5yS	Phone Login Test	buyer	2026-07-20 19:36:59.75145-05	3594219280	cali	t	f	\N
4cd88e16-2c5b-4f73-adbd-31687cd2479c	\N	$2b$12$tU/E1vjO0ypLok.b4M1K7.GBzIO3R3LylkLp8ZJpSuVcoI2oRfL0K	Phone Login Test	buyer	2026-07-23 17:52:51.404468-05	3847170908	cali	t	t	\N
177a60cf-7527-438d-a262-1f969d63c09e	\N	$2b$12$np2kD8CHh.y1oxaXkPbmiO56ZLsN7KRd0GMrVEWDZdjJiB/9Z0omC	First	buyer	2026-07-20 20:03:30.271889-05	3595809733	cali	t	f	\N
9290ed56-10e0-4054-b66b-5e9456e71a87	\N	$2b$12$242gGlzOu8Wlx5YLeru0Wufo6i4lb.yWpk4CPdXZ3snJ/3wpqeQAK	Phone Only Seller	seller	2026-07-20 20:03:29.624758-05	3595809187	cali	t	f	\N
27edd1fa-3f95-45b3-86f4-4dd9a92f6e28	\N	$2b$12$d1hbf0izmjCuzQU0FyJY1.CECQnGrpjB61Rn6z3mNAEuWeWv0dOcC	Phone Login Test	buyer	2026-07-20 20:03:31.303349-05	3595810865	cali	t	f	\N
1603205f-d1a7-4793-ad10-c7cf45586703	\N	$2b$12$ss4ECa3E3RMkWdZSKozQDOZHCbuC2hj2X6.KJ6pwZ9EY.xiPpqQGK	Phone Only Seller	seller	2026-07-20 20:27:04.094359-05	3597223538	cali	t	f	\N
b7821822-a887-4439-ab85-beeb70ad9c48	\N	$2b$12$iK0dj.jvphyDRgB4ZTIJ0OXVwfJ121nz/EBAPbd.c/0aW.EcOtJ4O	First	buyer	2026-07-20 20:27:04.922949-05	3597224257	cali	t	f	\N
67be03dc-cb89-4ee7-aad2-9d7ec6d0ca69	\N	$2b$12$Q8cEGssj3QE3WG7zxcwHe.nW0dAwxJEf7jIgUVc4QqARglV8GOlBS	Phone Login Test	buyer	2026-07-20 20:27:06.413847-05	3597225715	cali	t	f	\N
e8c8d9e8-d7a3-4f29-a4c9-89899db0f2c2	info@andresmorales.com.co	$2b$12$IHPmr4tA9E9VrJXv7bQbbOcTCyjVSIRKy7HnGckZHLQkIisz5qsAK	Andres Morales	seller	2026-07-22 09:16:46.312921-05	3008768786	cali	t	t	2026-07-22 09:19:23.372619-05
\.


--
-- Data for Name: vendor_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_contacts (id, vendor_id, buyer_id, contact_type, ip_address, user_agent, created_at) FROM stdin;
f500426e-3b46-42eb-9594-0832508ccbf3	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	\N	call	::ffff:127.0.0.1	curl/8.5.0	2026-07-23 11:36:20.444663-05
df476e36-5f92-49da-aa35-f2ff6bfb4ad3	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	\N	whatsapp	::ffff:127.0.0.1	curl/8.5.0	2026-07-23 11:36:20.485268-05
\.


--
-- Data for Name: vendor_location_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_location_history (id, vendor_id, latitude, longitude, recorded_at) FROM stdin;
\.


--
-- Data for Name: vendor_views; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_views (id, vendor_id, viewed_at, user_id, user_ip) FROM stdin;
5	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 11:48:23.308602-05	\N	\N
6	218d7369-a1ea-4814-b2e4-a1e3077b5da9	2026-06-29 11:53:45.823294-05	\N	\N
7	107fae37-48e7-4bbf-98ed-f6c5025d7d81	2026-06-29 11:54:07.743511-05	\N	\N
8	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 11:56:02.454889-05	\N	\N
9	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 11:58:20.945734-05	\N	\N
10	78312336-9ad9-44bb-bac6-77e2ab9f8138	2026-06-29 11:58:43.267244-05	\N	\N
11	78312336-9ad9-44bb-bac6-77e2ab9f8138	2026-06-29 12:05:16.548571-05	\N	\N
12	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 12:05:28.306071-05	\N	\N
13	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 12:07:42.723422-05	\N	\N
14	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 12:17:07.987431-05	\N	\N
15	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 12:58:15.713974-05	\N	\N
16	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:04:31.259031-05	\N	\N
17	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:07:01.597842-05	\N	\N
18	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:11:44.630032-05	\N	\N
19	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:11:44.945695-05	\N	\N
20	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-29 13:11:49.840696-05	\N	\N
21	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:13:26.855242-05	\N	\N
22	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:13:27.13878-05	\N	\N
23	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-29 13:13:32.384346-05	\N	\N
24	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:16:03.96246-05	\N	\N
25	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:16:04.100198-05	\N	\N
26	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-29 13:16:09.039761-05	\N	\N
27	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:34:43.188422-05	\N	\N
28	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:34:44.315023-05	\N	\N
29	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:36:35.639121-05	\N	\N
30	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:36:35.794114-05	\N	\N
31	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-29 13:36:40.858891-05	\N	\N
32	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 13:38:07.586526-05	\N	\N
35	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 14:20:44.180965-05	\N	\N
36	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 15:52:46.153763-05	\N	\N
37	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 15:52:46.222966-05	\N	\N
40	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 17:20:12.19777-05	\N	\N
41	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 17:20:12.271447-05	\N	\N
42	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-29 18:39:35.271392-05	\N	\N
43	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-29 18:39:35.756274-05	\N	\N
44	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 21:20:16.614976-05	\N	\N
45	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 21:22:14.670319-05	\N	\N
46	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 21:22:19.408702-05	\N	\N
47	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 21:24:31.837017-05	\N	\N
56	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 23:19:02.072965-05	\N	\N
57	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 23:19:19.974665-05	\N	\N
58	107fae37-48e7-4bbf-98ed-f6c5025d7d81	2026-06-29 23:20:00.109284-05	\N	\N
60	107fae37-48e7-4bbf-98ed-f6c5025d7d81	2026-06-29 23:21:55.69714-05	\N	\N
61	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-30 09:42:54.592118-05	\N	\N
62	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-30 09:42:57.112001-05	\N	\N
63	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-30 09:43:31.668013-05	\N	\N
64	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-30 09:43:33.914486-05	\N	\N
65	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-30 09:44:55.31413-05	\N	\N
66	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-30 09:44:57.45131-05	\N	\N
67	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-30 09:45:25.479254-05	\N	\N
68	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-30 09:45:27.360751-05	\N	\N
69	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-30 09:53:05.584405-05	\N	\N
70	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-30 12:22:11.128757-05	\N	\N
71	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-30 13:48:25.504927-05	\N	\N
72	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-30 13:48:43.867454-05	\N	\N
48	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 21:25:26.946565-05	\N	\N
49	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 21:26:29.044263-05	\N	\N
50	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 21:26:57.666992-05	\N	\N
76	107fae37-48e7-4bbf-98ed-f6c5025d7d81	2026-07-10 18:26:51.342275-05	506fbc78-0128-4c70-a1d7-c9a1706fd255	\N
77	107fae37-48e7-4bbf-98ed-f6c5025d7d81	2026-07-10 18:27:07.890948-05	506fbc78-0128-4c70-a1d7-c9a1706fd255	\N
78	107fae37-48e7-4bbf-98ed-f6c5025d7d81	2026-07-10 18:28:09.874394-05	506fbc78-0128-4c70-a1d7-c9a1706fd255	\N
79	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-07-10 18:28:28.273669-05	506fbc78-0128-4c70-a1d7-c9a1706fd255	\N
80	218d7369-a1ea-4814-b2e4-a1e3077b5da9	2026-07-10 18:30:10.424111-05	506fbc78-0128-4c70-a1d7-c9a1706fd255	\N
81	107fae37-48e7-4bbf-98ed-f6c5025d7d81	2026-07-15 10:34:42.509783-05	\N	\N
82	218d7369-a1ea-4814-b2e4-a1e3077b5da9	2026-07-15 18:52:29.858935-05	afc020d6-8c62-441a-a43e-9526018e082e	\N
87	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-07-17 00:32:08.605493-05	afc020d6-8c62-441a-a43e-9526018e082e	\N
88	218d7369-a1ea-4814-b2e4-a1e3077b5da9	2026-07-17 14:33:02.886005-05	afc020d6-8c62-441a-a43e-9526018e082e	\N
89	218d7369-a1ea-4814-b2e4-a1e3077b5da9	2026-07-17 14:44:49.377312-05	afc020d6-8c62-441a-a43e-9526018e082e	\N
90	218d7369-a1ea-4814-b2e4-a1e3077b5da9	2026-07-17 16:35:33.272899-05	afc020d6-8c62-441a-a43e-9526018e082e	\N
91	218d7369-a1ea-4814-b2e4-a1e3077b5da9	2026-07-17 19:47:42.710997-05	afc020d6-8c62-441a-a43e-9526018e082e	\N
92	107fae37-48e7-4bbf-98ed-f6c5025d7d81	2026-07-17 20:04:07.473767-05	afc020d6-8c62-441a-a43e-9526018e082e	\N
93	107fae37-48e7-4bbf-98ed-f6c5025d7d81	2026-07-17 20:28:50.966689-05	afc020d6-8c62-441a-a43e-9526018e082e	\N
33	218d7369-a1ea-4814-b2e4-a1e3077b5da9	2026-06-29 14:17:06.191436-05	\N	\N
34	218d7369-a1ea-4814-b2e4-a1e3077b5da9	2026-06-29 14:17:06.937971-05	\N	\N
38	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 16:36:47.060785-05	\N	\N
39	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 16:36:47.952044-05	\N	\N
73	3bcf9bba-661f-4ad7-a89f-7f9271c81a82	2026-06-30 19:44:37.213233-05	\N	\N
95	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-07-18 17:41:20.45691-05	\N	\N
96	107fae37-48e7-4bbf-98ed-f6c5025d7d81	2026-07-18 17:42:09.219921-05	\N	\N
51	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 23:10:13.180976-05	\N	\N
52	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 23:11:31.888993-05	\N	\N
53	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 23:12:43.497704-05	\N	\N
55	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 23:18:03.774054-05	\N	\N
54	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 23:15:48.144887-05	\N	\N
59	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-06-29 23:21:40.717881-05	\N	\N
99	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-07-19 12:59:08.812633-05	\N	\N
100	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-07-19 13:10:28.375795-05	\N	\N
104	29037c34-3eb8-4bb8-8cc7-48e038dc1b42	2026-07-19 17:25:13.791182-05	\N	\N
113	218d7369-a1ea-4814-b2e4-a1e3077b5da9	2026-07-21 17:18:50.598338-05	\N	\N
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendors (id, profile_id, name, description, category, latitude, longitude, is_active, rating, review_count, photo_url, created_at, phone, city_id, is_verified, location_updated_at, vehicle_type, vehicle_photo_url, slug, business_hours_enabled, business_hours_start, business_hours_end, business_days, station_type, geo_mode, geo_zone_lat, geo_zone_lng, geo_zone_radius_m) FROM stdin;
827347c0-e44f-40c3-b31f-2dbe5f3531c2	0cb84762-c32b-4752-b283-f0983614e4ea	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:14:46.073711-05	3944885616	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-16	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
c83383df-8c02-4222-9605-a23861915896	361ca621-e709-4616-8392-d86d982cf199	Mi negocio de Phone		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:14:47.138998-05	3844886665	cali	f	\N	\N	\N	mi-negocio-de-phone-cali-5	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
dd0c70d3-fadf-4097-8bb8-b20462ab7210	11f0a317-9423-452e-a4ef-2bfaa82e37f8	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:14:57.356863-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2kgtw-a260	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
83e8e738-6bb4-4281-8521-4284603f20fe	84689891-7b7b-4fb3-b804-b91edb1fc587	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:51:36.917835-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry3vm0q-cc65	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
19a1edbd-765d-43dc-8a5a-fcd581629390	15b255d9-4641-4b63-a4dd-fcc0bf59132d	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:12:04.060914-05	3944723508	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-2	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
df1cdea3-18dc-49db-baf2-fb7af8ce23ef	a57643d9-aec3-4f5d-90a8-7902e4d3c8d6	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:12:09.232813-05	3944728742	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-3	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
08b68485-6114-4c03-add9-9e1765b8f8a3	fe80335c-5300-4152-b104-2572c165ab3b	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:12:22.597072-05	3944742154	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-4	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
3600ea20-8989-4e4d-8b74-e5f21390001c	16ce8f41-1320-49fc-b8da-36adf1cf6198	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:12:26.924137-05	3944746491	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-5	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
1ab97d10-fbd8-41bb-b449-c63e7dca81d2	15f7ad61-37b2-42a0-8c02-2beaf92cba05	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:12:48.395227-05	3944767910	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-6	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
53b1e772-9959-40c9-be93-58447dc41135	ba98063c-bc61-4447-98df-76351008de6b	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:12:53.121096-05	3944772657	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-7	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
4404f87f-f767-4117-8a86-41a3682aada6	ba98063c-bc61-4447-98df-76351008de6b	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:12:53.69927-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2htey-7fd6	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
b7a22889-fafc-463e-ac62-308feff34a16	85504939-b83b-40c8-84c6-94901ef7e01f	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:13:08.595092-05	3944788087	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-8	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
21122a04-aaed-42fd-ad2e-e1b8ba1a86da	646601f2-9dcf-47b5-84b9-0c3d4163b838	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:13:33.587196-05	3944813036	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-9	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
f327c190-673a-4b77-b7ab-e7e601632e1f	3ffb5603-66f1-4772-9514-7994bda9845e	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:13:53.81032-05	3944833307	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-10	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
267cfd3d-d9b9-4d03-8797-79f4d2b84071	4cfb04d2-3025-4758-9235-057494d8822b	Mi negocio de Fresh		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:15:36.719736-05	3844936254	bogota	f	\N	\N	\N	mi-negocio-de-fresh-bogota-7	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
21fa653a-536e-420e-868f-66fa29ac8494	bc84faa6-3932-48be-97e0-ca6e6f6f0d64	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:13:59.126502-05	3944838601	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-11	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
f1cff093-932b-45bf-8047-c5e64cbbb333	bb370842-6f3d-43f4-911b-2ed644c14d10	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:14:05.352451-05	3944844878	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-12	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
3d23a0bc-bd39-4bc8-897f-35b88835c746	bb370842-6f3d-43f4-911b-2ed644c14d10	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:14:05.892444-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2jd4e-6397	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
0a71f55d-afe7-4235-ad73-0aac32c4a7c3	d2eda067-b477-43cf-a29c-54b5dc25f568	Mi negocio de Fresh		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:14:31.041356-05	3844870584	bogota	f	\N	\N	\N	mi-negocio-de-fresh-bogota-4	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
aa04112f-e99f-415e-bed5-c064aa6614c9	7acb52bb-7a4d-4bf9-b513-f44ea55b399b	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:14:31.942979-05	3944871514	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-13	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
60ac9b19-2797-4c27-8d05-619ca66de66e	9c8ad310-2da7-4fb6-a567-8603bad978d7	Mi negocio de Phone		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:14:32.945485-05	3844872475	cali	f	\N	\N	\N	mi-negocio-de-phone-cali-4	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
e26a58e2-f3f8-4c2c-94e7-122f1d75a3f3	a10d8462-c6ea-4170-b6e6-74cf3daa69de	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:14:36.308066-05	3944875841	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-14	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
dded7455-e7d6-48b3-81ca-e967911bb9a6	daa7fdbd-e1af-4fd8-b421-442e4d5470a3	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:14:40.40304-05	3944879539	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-15	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
148ac4c7-68b2-4a5a-9234-f3e95cd1c762	4ea79ba7-6129-45f7-91cf-72a474616a0f	Mi negocio de Fresh		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:14:45.121996-05	3844884671	bogota	f	\N	\N	\N	mi-negocio-de-fresh-bogota-5	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
f7f0a2ee-6c70-42d3-adf3-c0d69e25b9f8	5176d1bf-b848-41e0-b5a4-bc718884eb07	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:15:37.665667-05	3944937198	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-20	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
e0ad2445-889c-4404-895a-106889de130b	bd21cd75-3e37-4c27-bda1-c4634b55125f	Mi negocio de Phone		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:15:38.726708-05	3844938260	cali	f	\N	\N	\N	mi-negocio-de-phone-cali-7	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
7dc0632f-978e-49c0-b39a-5a8dfe2c3109	87232528-bab5-4ab3-b18f-101e76b66ae7	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:16:08.533986-05	3944967695	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-21	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
b77e2db5-b629-4420-9de5-c7e504e3e8da	771c7823-28a9-4ee3-86fb-afe3a8ccdc69	Mi negocio de Fresh		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:52:47.831901-05	3847167353	bogota	f	\N	\N	\N	mi-negocio-de-fresh-bogota-10	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
20d0f3ce-5499-41cd-a885-e1ec4782e300	013bead8-e428-4607-b86b-45af0673deba	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:52:48.835597-05	3947168367	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-26	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
405150bd-e142-437a-a816-e03afdf42588	a29b92c5-0952-4130-9704-f195886b96bf	Mi negocio de Phone		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:52:49.84888-05	3847169387	cali	f	\N	\N	\N	mi-negocio-de-phone-cali-10	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
8984f4e5-5857-4dbb-83e3-daef4664f79f	fe80335c-5300-4152-b104-2572c165ab3b	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:12:23.18489-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2h5v6-9a58	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
1cc3afac-4bc4-4bbd-ad9e-737a20da9233	85504939-b83b-40c8-84c6-94901ef7e01f	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:13:09.290173-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2i5fh-746a	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
ef701367-0157-44a1-94d2-07159ff2fe9f	a10d8462-c6ea-4170-b6e6-74cf3daa69de	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:14:36.87045-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2k10v-becb	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
2563bbe5-66ec-4af0-9aa5-0739009de322	09747573-0b3e-419e-bf1b-321d3997e81b	Mi negocio de Fresh		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:15:01.316819-05	3844900400	bogota	f	\N	\N	\N	mi-negocio-de-fresh-bogota-6	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
32e431b9-2c4e-4dd4-b8a9-e44c54b77343	5c418992-5589-48d5-9d75-c6c3ef173dc6	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:15:02.366191-05	3944901880	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-18	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
2e320061-af58-4f5f-8354-ed854b989dd6	d4232837-e7f9-4ee8-b657-cb222aaa9790	Mi negocio de Phone		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:15:03.867817-05	3844903058	cali	f	\N	\N	\N	mi-negocio-de-phone-cali-6	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
7cc740e4-0ff0-4e4d-98d9-553ee8c4eae0	87232528-bab5-4ab3-b18f-101e76b66ae7	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:16:09.57058-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2m0js-dc2f	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
3bcf9bba-661f-4ad7-a89f-7f9271c81a82	4e9295e7-ac73-4d88-8ede-cad219749072	Arepas La Caleña	Arepas tradicionales de maíz blanco y amarillo. Rellenas de queso, choclo, carne desmechada y la clásica arepa delgada con hogao. Receta familiar de 3 generaciones.	comida	3.4516	-76.532	t	4.5	0	/vendors/cali/arepas-la-calena.jpg	2026-05-30 11:41:34.414235-05	+573181234502	cali	t	2026-07-23 10:04:27.653014-05	moto	\N	arepas-la-calena-cali	t	06:00:00	20:00:00	{mon,tue,wed,thu,fri,sat}	mobile	precise	\N	\N	\N
218d7369-a1ea-4814-b2e4-a1e3077b5da9	605e439d-32f7-4a2a-b66a-325f5b9bc56e	Jugos Tropicales La Gran Colombia	Jugos naturales recién hechos: lulo, maracuyá, guanábana, borojó y nuestra especialidad, el viche energético. Fruta picada al instante, sin azúcar añadida.	bebidas	3.46	-76.535	t	4.5	0	/vendors/cali/jugos-tropicales.jpg	2026-05-30 11:41:35.035531-05	+573181234503	cali	t	2026-07-22 22:51:21.181348-05	pie	\N	jugos-tropicales-la-gran-colombia-cali	t	08:00:00	22:00:00	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
cdcb44a4-2caf-4aa2-ac0d-e55df5d61961	dcc794e3-8576-410b-a635-3bce0e8b4a34	Mi negocio de Fresh		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:51:40.880484-05	3847100429	bogota	f	\N	\N	\N	mi-negocio-de-fresh-bogota-9	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
81b0535f-d6e0-4635-a07a-1797d19eeab0	7783c5a8-ed59-489f-85f7-a200d2353808	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:51:41.956035-05	3947101503	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-24	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
b0a2766a-ce96-4b7e-8427-d8a8093e45a0	cf6f184d-521a-4f0d-abb8-1015e03b2d93	Mi negocio de Phone		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:51:43.114477-05	3847102574	cali	f	\N	\N	\N	mi-negocio-de-phone-cali-9	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
62c72c8a-e77e-4c79-8e97-46f81e2b433b	a2fc4fa3-3316-4b91-a508-44a35b8cd4de	Mi negocio de Fresh		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:06:41.659214-05	3844401191	bogota	f	\N	\N	\N	mi-negocio-de-fresh-bogota	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
8d67bc83-2441-443d-85ce-02e10857ff4c	d29c5c3f-fe66-469d-87a3-66b49e5530d8	Mi negocio de Phone		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:06:42.816405-05	3844402351	cali	f	\N	\N	\N	mi-negocio-de-phone-cali	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
bc4c0b0e-3631-47b7-9a5a-d8cff612384b	a3cad777-af50-45fd-8d57-dc920ab6dbca	Mi negocio de Fresh		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:06:49.713832-05	3844409195	bogota	f	\N	\N	\N	mi-negocio-de-fresh-bogota-2	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
696c7090-b739-4cb0-9633-64e3bb0ad189	111966cc-255b-408a-82c9-58909abc85c3	Mi negocio de Phone		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:06:50.677948-05	3844410249	cali	f	\N	\N	\N	mi-negocio-de-phone-cali-2	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
06540163-0d19-4644-968c-4ae03b22e338	c05793ca-1e97-4305-bf79-c79c4d567e8f	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:52:43.194902-05	3947162312	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-25	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
51703b4e-4b1b-487f-996e-1d302abdf342	16ce8f41-1320-49fc-b8da-36adf1cf6198	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:12:27.480876-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2h96d-c645	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
b65aa1ff-2245-4dd0-b73a-cb01e7bbd4dc	646601f2-9dcf-47b5-84b9-0c3d4163b838	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:13:34.086906-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2iok0-d48e	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
c2f6d3be-0e96-45eb-891b-f826d6c338e4	daa7fdbd-e1af-4fd8-b421-442e4d5470a3	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:14:42.118388-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2k52j-b33f	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
0e7cb1a5-89f1-4551-a21a-7aaf48cb5aee	ab90c6d5-e9f0-4e10-a44c-853fc68e981c	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:15:32.255203-05	3944931419	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-19	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
ef28a1d7-cb36-48e1-bebe-e9b40dcfe3fb	094bbb57-8dd5-4878-a0a9-e1b50e872d73	Mi negocio de Fresh		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:16:13.621279-05	3844973152	bogota	f	\N	\N	\N	mi-negocio-de-fresh-bogota-8	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
4231c2d7-259d-42c4-9fda-99a39fc240ed	8de2b5a9-ae23-4066-b26f-bae5a73fec0d	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:16:14.538183-05	3944974089	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-22	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
b47c4674-c771-4d97-9a8d-76e15018c78f	5b175566-53a8-4526-89bd-d2bb76b6d6f0	Mi negocio de Phone		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:16:15.692717-05	3844975098	cali	f	\N	\N	\N	mi-negocio-de-phone-cali-8	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
78312336-9ad9-44bb-bac6-77e2ab9f8138	e2e80832-b458-4951-a24e-dc83b8effbe6	Artesanías del Pacífico	Mochilas wayuu, sombreros vueltiaos, collares de chaquiras y tallas en tagua. Trabajamos directamente con artesanos de Guapi, López de Micay y La Tola.	artesanias	3.452	-76.534	t	4.5	0	/vendors/cali/artesanias-pacifico.jpg	2026-05-30 11:41:35.585507-05	+573181234504	cali	t	2026-07-22 22:51:21.181348-05	triciclo	\N	artesanias-del-pacifico-cali	t	09:00:00	20:00:00	{tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
29037c34-3eb8-4bb8-8cc7-48e038dc1b42	15d0374f-74cb-4fd4-8135-f9dcd425efe0	Frutas Don Jaime	Frutas frescas del Valle del Cauca, cosechadas en Palmira. Especialidad en mango de azúcar, lulo y guayaba. Servimos en la Plaza de Cayzedo hace 12 años.	frutas	3.45	-76.54	t	4.5	0	/vendors/cali/frutas-don-jaime.jpg	2026-05-30 11:41:33.722551-05	+573181234501	cali	t	2026-07-23 11:02:15.704319-05	carro	\N	frutas-don-jaime-cali	t	06:00:00	19:00:00	{mon,tue,wed,thu,fri,sat}	fixed	precise	\N	\N	\N
b5c77b43-46e2-4be3-8d44-e087e948b9c2	84689891-7b7b-4fb3-b804-b91edb1fc587	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:51:35.32404-05	3947094381	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-23	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
5295119f-9938-44b8-a97c-c342187f92bd	8959f652-b38f-4cb8-a805-78e8e3c7ea2d	Mi negocio de Fresh		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:11:38.613985-05	3844698184	bogota	f	\N	\N	\N	mi-negocio-de-fresh-bogota-3	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
3fe7ebbf-a914-4484-9bda-fc516bc7d4eb	da2c87fe-77d0-4555-8bf7-d04be41ccf1e	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:11:39.579867-05	3944699114	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
ced202bf-a731-44ed-af2d-a6ea04e349bc	958016b5-ac56-4014-95e9-aea1957642d0	Mi negocio de Phone		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:11:40.554727-05	3844700088	cali	f	\N	\N	\N	mi-negocio-de-phone-cali-3	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
2e7c4c07-87ce-455c-ba0e-dc076ec21950	c05793ca-1e97-4305-bf79-c79c4d567e8f	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:52:44.266301-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry3x1yi-4338	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
b37b88e7-05b2-4111-ac4f-e816a1a17c4e	15f7ad61-37b2-42a0-8c02-2beaf92cba05	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:12:49.014306-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2hpsp-9202	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
6e4f1910-7508-45c8-a83e-438aca664f37	bc84faa6-3932-48be-97e0-ca6e6f6f0d64	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:13:59.727601-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2j8c1-62e8	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
67bf228a-c47f-43f6-aff4-ab42ef928f2e	11f0a317-9423-452e-a4ef-2bfaa82e37f8	Mi negocio de Test		comida	\N	\N	f	0.0	0	\N	2026-07-23 17:14:55.592494-05	3944895101	bogota	f	\N	\N	\N	mi-negocio-de-test-bogota-17	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	mobile	precise	\N	\N	\N
a09da636-b377-42b0-918d-492542ab3100	ab90c6d5-e9f0-4e10-a44c-853fc68e981c	CI Test Vendor	\N	comida	4.65	-74.05	t	0.0	0	\N	2026-07-23 17:15:33.248621-05	\N	bogota	t	\N	\N	\N	ci-test-slug-mry2l8iw-2c07	f	\N	\N	{mon,tue,wed,thu,fri,sat,sun}	\N	precise	\N	\N	\N
107fae37-48e7-4bbf-98ed-f6c5025d7d81	9706ff42-0b5b-4f12-9e49-79ec364fab47	Ropa Cali Moda	Camisetas con diseños urbanos caleños, gorras, chaquetas y accesorios. Colección inspirada en la salsa, la trova y el orgullo caleño. Tallas desde S hasta XXL.	ropa	3.456	-76.53	t	5.0	1	/vendors/cali/ropa-cali-moda.jpg	2026-05-30 11:41:36.09815-05	+573181234505	cali	t	2026-07-22 22:51:21.181348-05	carro	\N	ropa-cali-moda-cali	t	10:00:00	21:00:00	{mon,tue,wed,thu,fri,sat,sun}	fixed	precise	\N	\N	\N
\.


--
-- Name: job_runs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_runs_id_seq', 2148, true);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 22, true);


--
-- Name: rate_limit_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rate_limit_attempts_id_seq', 5519, true);


--
-- Name: vendor_location_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendor_location_history_id_seq', 6, true);


--
-- Name: vendor_views_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendor_views_id_seq', 118, true);


--
-- Name: ad_campaigns ad_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: consent_logs consent_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_logs
    ADD CONSTRAINT consent_logs_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_buyer_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_buyer_id_vendor_id_key UNIQUE (buyer_id, vendor_id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: job_runs job_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_runs
    ADD CONSTRAINT job_runs_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_filename_key UNIQUE (filename);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: product_photos product_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_photos
    ADD CONSTRAINT product_photos_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_attempts rate_limit_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_attempts
    ADD CONSTRAINT rate_limit_attempts_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: sponsorships sponsorships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_contacts vendor_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_pkey PRIMARY KEY (id);


--
-- Name: vendor_location_history vendor_location_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_location_history
    ADD CONSTRAINT vendor_location_history_pkey PRIMARY KEY (id);


--
-- Name: vendor_views vendor_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_views
    ADD CONSTRAINT vendor_views_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: consent_logs_type_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consent_logs_type_version_idx ON public.consent_logs USING btree (consent_type, policy_version);


--
-- Name: consent_logs_unique_user_type_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX consent_logs_unique_user_type_version ON public.consent_logs USING btree (COALESCE((user_id)::text, (email)::text), consent_type, policy_version) WHERE (user_id IS NOT NULL);


--
-- Name: consent_logs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consent_logs_user_id_idx ON public.consent_logs USING btree (user_id, created_at DESC);


--
-- Name: email_verification_tokens_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_verification_tokens_expires_idx ON public.email_verification_tokens USING btree (expires_at) WHERE (used_at IS NULL);


--
-- Name: email_verification_tokens_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_verification_tokens_user_idx ON public.email_verification_tokens USING btree (user_id);


--
-- Name: idx_ad_campaigns_active_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_campaigns_active_window ON public.ad_campaigns USING btree (status, starts_at, ends_at) WHERE (status = 'active'::text);


--
-- Name: idx_ad_campaigns_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_campaigns_created_by ON public.ad_campaigns USING btree (created_by);


--
-- Name: idx_ad_campaigns_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_campaigns_target ON public.ad_campaigns USING btree (target_city_id, target_category);


--
-- Name: idx_ad_campaigns_target_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_campaigns_target_category ON public.ad_campaigns USING btree (target_category);


--
-- Name: idx_favorites_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_vendor_id ON public.favorites USING btree (vendor_id);


--
-- Name: idx_job_runs_job_name_ran_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_runs_job_name_ran_at ON public.job_runs USING btree (job_name, ran_at DESC);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_buyer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_buyer_id ON public.orders USING btree (buyer_id, created_at DESC);


--
-- Name: idx_orders_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_vendor_id ON public.orders USING btree (vendor_id, created_at DESC);


--
-- Name: idx_product_photos_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_photos_product_id ON public.product_photos USING btree (product_id, "position");


--
-- Name: idx_products_vendor_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_vendor_created ON public.products USING btree (vendor_id, created_at DESC);


--
-- Name: idx_products_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_vendor_id ON public.products USING btree (vendor_id);


--
-- Name: idx_push_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_user ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_rate_limit_ip_bucket_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limit_ip_bucket_time ON public.rate_limit_attempts USING btree (ip, bucket, attempted_at DESC);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_reviews_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_vendor_id ON public.reviews USING btree (vendor_id);


--
-- Name: idx_sponsorships_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sponsorships_expires ON public.sponsorships USING btree (ends_at) WHERE (status = 'active'::text);


--
-- Name: idx_sponsorships_vendor_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sponsorships_vendor_active ON public.sponsorships USING btree (vendor_id) WHERE (status = 'active'::text);


--
-- Name: idx_vendor_location_history_vendor_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_location_history_vendor_time ON public.vendor_location_history USING btree (vendor_id, recorded_at DESC);


--
-- Name: idx_vendor_views_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_views_user_id ON public.vendor_views USING btree (user_id);


--
-- Name: idx_vendor_views_vendor_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_views_vendor_date ON public.vendor_views USING btree (vendor_id, viewed_at);


--
-- Name: idx_vendor_views_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_views_vendor_id ON public.vendor_views USING btree (vendor_id);


--
-- Name: idx_vendors_business_hours_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_business_hours_enabled ON public.vendors USING btree (business_hours_enabled) WHERE (business_hours_enabled = true);


--
-- Name: idx_vendors_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_category ON public.vendors USING btree (category);


--
-- Name: idx_vendors_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_profile_id ON public.vendors USING btree (profile_id);


--
-- Name: idx_vendors_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_slug_idx ON public.vendors USING btree (slug);


--
-- Name: idx_vendors_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_vendors_slug_unique ON public.vendors USING btree (slug);


--
-- Name: idx_vendors_station_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_station_type ON public.vendors USING btree (station_type) WHERE (station_type IS NOT NULL);


--
-- Name: password_reset_tokens_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_tokens_expires_idx ON public.password_reset_tokens USING btree (expires_at) WHERE (used_at IS NULL);


--
-- Name: password_reset_tokens_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX password_reset_tokens_hash_idx ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: password_reset_tokens_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_tokens_user_idx ON public.password_reset_tokens USING btree (user_id);


--
-- Name: products_fts_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_fts_idx ON public.products USING gin (to_tsvector('spanish'::regconfig, ((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: profiles_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX profiles_email_unique ON public.profiles USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: users_phone_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_phone_unique ON public.users USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: vendor_contacts_buyer_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_contacts_buyer_created_idx ON public.vendor_contacts USING btree (buyer_id, created_at DESC) WHERE (buyer_id IS NOT NULL);


--
-- Name: vendor_contacts_ip_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_contacts_ip_created_idx ON public.vendor_contacts USING btree (ip_address, created_at DESC) WHERE (ip_address IS NOT NULL);


--
-- Name: vendor_contacts_vendor_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_contacts_vendor_created_idx ON public.vendor_contacts USING btree (vendor_id, created_at DESC);


--
-- Name: users users_role_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_role_immutable BEFORE UPDATE OF role ON public.users FOR EACH ROW EXECUTE FUNCTION public.users_role_immutable_guard();


--
-- Name: TRIGGER users_role_immutable ON users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER users_role_immutable ON public.users IS 'Prevents silent privilege escalation by blocking any UPDATE that changes role. The current role is fixed at /api/auth/register. To change a role, disable the trigger, run the UPDATE, and re-enable it.';


--
-- Name: ad_campaigns ad_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ad_campaigns ad_campaigns_target_category_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_target_category_fkey FOREIGN KEY (target_category) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: ad_campaigns ad_campaigns_target_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_target_city_id_fkey FOREIGN KEY (target_city_id) REFERENCES public.cities(id) ON DELETE SET NULL;


--
-- Name: consent_logs consent_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_logs
    ADD CONSTRAINT consent_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id);


--
-- Name: favorites favorites_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id);


--
-- Name: orders orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_photos product_photos_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_photos
    ADD CONSTRAINT product_photos_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: sponsorships sponsorships_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_contacts vendor_contacts_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: vendor_contacts vendor_contacts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_location_history vendor_location_history_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_location_history
    ADD CONSTRAINT vendor_location_history_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_views vendor_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_views
    ADD CONSTRAINT vendor_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: vendor_views vendor_views_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_views
    ADD CONSTRAINT vendor_views_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_category_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_category_fkey FOREIGN KEY (category) REFERENCES public.categories(id);


--
-- Name: vendors vendors_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE SET NULL;


--
-- Name: vendors vendors_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- PostgreSQL database dump complete
--

