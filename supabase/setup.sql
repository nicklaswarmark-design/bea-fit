-- BEACTIVE / Bea Fit – full database setup for a fresh Supabase project.
-- Run once in Supabase SQL Editor (or applied automatically).

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Bea',
  level text NOT NULL DEFAULT 'Medel',
  goal text NOT NULL DEFAULT 'Muskeltillväxt och kroppssammansättning',
  strength_per_week int NOT NULL DEFAULT 3,
  runs_per_week int NOT NULL DEFAULT 1,
  run_ability text NOT NULL DEFAULT '3–5 km',
  training_days int[] NOT NULL DEFAULT '{1,3,5,0}',
  equipment text[] NOT NULL DEFAULT '{}',
  session_minutes int NOT NULL DEFAULT 60,
  avoid_movements text NOT NULL DEFAULT '',
  weight_increment numeric NOT NULL DEFAULT 2.5,
  reminders_enabled boolean NOT NULL DEFAULT false,
  reminder_time text NOT NULL DEFAULT '07:00',
  program_start date NOT NULL DEFAULT current_date,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- EXERCISE LIBRARY (shared, read-only)
CREATE TABLE public.exercises (
  id text PRIMARY KEY,
  name text NOT NULL,
  muscles text[] NOT NULL DEFAULT '{}',
  equipment text[] NOT NULL DEFAULT '{}',
  instructions text NOT NULL DEFAULT '',
  mistakes text[] NOT NULL DEFAULT '{}',
  alternatives text[] NOT NULL DEFAULT '{}',
  media_url text
);
GRANT SELECT ON public.exercises TO authenticated, anon;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "library readable" ON public.exercises FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.exercises (id,name,muscles,equipment,instructions,mistakes,alternatives) VALUES
('hip_thrust','Hip thrust','{Säte,Baksida lår}','{Skivstång,Bänk}','Vila övre ryggen mot bänken, fötterna höftbrett. Pressa genom hälarna och lyft höften tills kroppen är rak från axlar till knän. Knip ihop sätet i toppen och sänk kontrollerat.','{Överextenderar ländryggen i toppen,Fötterna för långt fram,Hakan pekar uppåt}','{glute_bridge,cable_kickback}'),
('squat','Knäböj','{Framsida lår,Säte}','{Skivstång,Rack}','Stången på övre ryggen, fötter axelbrett. Andas in, spänn bålen och sätt dig ner mellan hälarna. Pressa upp med hela foten.','{Knäna faller inåt,Hälarna lyfter,Rundad rygg i botten}','{leg_press,goblet_squat}'),
('leg_press','Benpress','{Framsida lår,Säte}','{Maskin}','Fötterna höftbrett mitt på plattan. Sänk tills knäna är ca 90° utan att ländryggen lyfter. Pressa tillbaka utan att låsa knäna.','{Låser knäna,Ländryggen lämnar dynan,För kort rörelse}','{squat,goblet_squat}'),
('romanian_deadlift','Rumänsk marklyft','{Baksida lår,Säte,Ländrygg}','{Skivstång,Hantlar}','Lätt böjda knän. Skjut höften bakåt och låt vikten glida längs benen tills du känner sträck i baksida lår. Res dig genom att föra höften framåt.','{Rundar ryggen,Böjer knäna för mycket,Vikten långt från kroppen}','{leg_curl,glute_bridge}'),
('bulgarian_split_squat','Bulgarisk utfallsböj','{Framsida lår,Säte}','{Hantlar,Bänk}','Bakre foten på bänken. Sänk rakt ner tills främre låret är parallellt med golvet. Pressa upp genom främre hälen.','{Främre knäet faller inåt,För kort steg,Lutar för mycket framåt}','{goblet_squat,leg_press}'),
('leg_curl','Lårcurl','{Baksida lår}','{Maskin}','Justera maskinen så knäleden ligger i linje med vridpunkten. Böj benen kontrollerat och sänk långsamt.','{Höften lyfter,För snabb excentrisk fas}','{romanian_deadlift}'),
('hip_abduction','Höftabduktion','{Säte (gluteus medius)}','{Maskin}','Sitt upprätt, pressa knäna utåt mot dynorna, håll en sekund och återgå långsamt.','{Gungar med överkroppen,Släpper vikten snabbt}','{cable_kickback}'),
('lat_pulldown','Latsdrag','{Rygg (lats),Biceps}','{Kabelmaskin}','Grip något bredare än axlarna. Dra stången mot övre bröstet med armbågarna nedåt och bakåt. Släpp upp kontrollerat.','{Lutar sig långt bakåt,Drar bakom nacken,Rycker i vikten}','{chest_supported_row,seated_cable_row}'),
('seated_cable_row','Sittande kabelrodd','{Mellanrygg,Lats,Biceps}','{Kabelmaskin}','Sitt med lätt böjda knän och rak rygg. Dra handtaget mot magen och för ihop skulderbladen. Sträck armarna kontrollerat.','{Gungar med överkroppen,Höjer axlarna}','{chest_supported_row,lat_pulldown}'),
('db_chest_press','Hantelpress','{Bröst,Triceps,Främre axlar}','{Hantlar,Bänk}','Ligg på bänken med fötterna i golvet. Sänk hantlarna till bröstets sidor med armbågarna i ca 45°, pressa upp.','{Armbågarna rakt ut,Studsar i botten,Svankar kraftigt}','{machine_chest_press}'),
('db_shoulder_press','Hantelpress axlar','{Axlar,Triceps}','{Hantlar,Bänk}','Sitt upprätt med stöd för ryggen. Pressa hantlarna upp ovanför huvudet och sänk till öronhöjd.','{Svankar,Hantlarna för långt fram}','{db_lateral_raise}'),
('db_lateral_raise','Sidolyft','{Sidoaxlar}','{Hantlar}','Lätt böjda armbågar. Lyft hantlarna ut åt sidorna till axelhöjd och sänk långsamt.','{Rycker med kroppen,Lyfter axlarna mot öronen,För tung vikt}','{db_shoulder_press}'),
('triceps_pushdown','Triceps pushdown','{Triceps}','{Kabelmaskin}','Armbågarna fixerade vid sidan. Pressa ner handtaget tills armarna är raka, återgå kontrollerat.','{Armbågarna åker framåt,Lutar sig över vikten}','{db_chest_press}'),
('biceps_curl','Bicepscurl','{Biceps}','{Hantlar}','Stå upprätt med armbågarna nära kroppen. Böj armarna och sänk långsamt.','{Svingar med ryggen,Armbågarna åker framåt}','{seated_cable_row}'),
('goblet_squat','Goblet squat','{Framsida lår,Säte}','{Hantel,Kettlebell}','Håll vikten mot bröstet. Sätt dig ner med upprätt överkropp och armbågarna mellan knäna. Pressa upp.','{Hälarna lyfter,Rundar ryggen}','{leg_press,squat}'),
('glute_bridge','Glute bridge','{Säte,Baksida lår}','{Kroppsvikt,Hantel}','Ligg på rygg med fötterna i golvet. Pressa upp höften, knip sätet i toppen och sänk kontrollerat.','{Svankar,Pressar med tårna}','{hip_thrust}'),
('chest_supported_row','Bröststödd rodd','{Mellanrygg,Lats}','{Hantlar,Lutande bänk}','Ligg med bröstet mot en lutande bänk. Ro hantlarna mot höfterna och för ihop skulderbladen.','{Lyfter bröstet från bänken,Drar med nacken}','{seated_cable_row}'),
('machine_chest_press','Bröstpress maskin','{Bröst,Triceps}','{Maskin}','Justera sitsen så handtagen är i brösthöjd. Pressa framåt utan att låsa armbågarna, återgå kontrollerat.','{Axlarna rullar framåt,För snabb återgång}','{db_chest_press}'),
('cable_kickback','Kabel-kickback','{Säte}','{Kabelmaskin,Fotlänk}','Fäst fotlänken, luta dig lätt framåt och för benet bakåt med rak höft. Knip i toppen.','{Svankar,Svingar benet}','{hip_thrust,glute_bridge}'),
('pallof_press','Pallof press','{Bål,Sneda magmuskler}','{Kabelmaskin,Gummiband}','Stå i sidled mot kabeln. Pressa handtaget rakt fram och motstå rotation. Återgå kontrollerat.','{Roterar med kroppen,Står för nära}','{}');

-- WORKOUT TEMPLATES
CREATE TABLE public.workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'strength',
  day_of_week int,
  warmup text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]',
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_templates TO service_role;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own templates" ON public.workout_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SCHEDULED SESSIONS (overrides: moved / rest)
CREATE TABLE public.scheduled_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  planned_date date NOT NULL,
  original_date date,
  status text NOT NULL DEFAULT 'planned',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_sessions TO authenticated;
GRANT ALL ON public.scheduled_sessions TO service_role;
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own schedule" ON public.scheduled_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WORKOUT SESSIONS
CREATE TABLE public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'strength',
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds int NOT NULL DEFAULT 0,
  effort int,
  notes text NOT NULL DEFAULT '',
  reduced_volume boolean NOT NULL DEFAULT false,
  state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.workout_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.workout_sessions(user_id, started_at DESC);

-- EXERCISE SETS
CREATE TABLE public.exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id text NOT NULL,
  exercise_order int NOT NULL DEFAULT 0,
  set_index int NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 0,
  reps int NOT NULL DEFAULT 0,
  rep_min int,
  rep_max int,
  completed boolean NOT NULL DEFAULT false,
  too_hard boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_sets TO authenticated;
GRANT ALL ON public.exercise_sets TO service_role;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sets" ON public.exercise_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.exercise_sets(user_id, exercise_id);
CREATE INDEX ON public.exercise_sets(session_id);

-- RUNNING SESSIONS
CREATE TABLE public.running_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  run_date date NOT NULL DEFAULT current_date,
  distance_km numeric NOT NULL,
  duration_seconds int NOT NULL,
  effort int,
  intervals boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.running_sessions TO authenticated;
GRANT ALL ON public.running_sessions TO service_role;
ALTER TABLE public.running_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own runs" ON public.running_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PERSONAL RECORDS
CREATE TABLE public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_id text NOT NULL,
  weight numeric NOT NULL,
  reps int NOT NULL,
  est_1rm numeric NOT NULL,
  session_id uuid REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  achieved_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_records TO authenticated;
GRANT ALL ON public.personal_records TO service_role;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prs" ON public.personal_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- MILESTONES
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own milestones" ON public.milestones FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed default program for a user (callable for reset too)
CREATE OR REPLACE FUNCTION public.seed_default_program(_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workout_templates (user_id,name,subtitle,kind,day_of_week,warmup,duration,items,sort) VALUES
  (_uid,'Underkropp','Säte & ben','strength',1,'5–8 min lätt cardio + uppvärmningsset','50–60 min',
   '[{"exercise_id":"hip_thrust","sets":4,"rep_min":8,"rep_max":10},
     {"exercise_id":"squat","sets":3,"rep_min":8,"rep_max":12,"alt":"leg_press"},
     {"exercise_id":"romanian_deadlift","sets":3,"rep_min":10,"rep_max":10},
     {"exercise_id":"bulgarian_split_squat","sets":3,"rep_min":10,"rep_max":10,"per_side":true},
     {"exercise_id":"leg_curl","sets":3,"rep_min":12,"rep_max":12},
     {"exercise_id":"hip_abduction","sets":2,"rep_min":15,"rep_max":15}]'::jsonb,1),
  (_uid,'Överkropp','Rygg, bröst & armar','strength',3,'5 min uppvärmning','45–55 min',
   '[{"exercise_id":"lat_pulldown","sets":3,"rep_min":10,"rep_max":10},
     {"exercise_id":"seated_cable_row","sets":3,"rep_min":10,"rep_max":10},
     {"exercise_id":"db_chest_press","sets":3,"rep_min":10,"rep_max":10},
     {"exercise_id":"db_shoulder_press","sets":3,"rep_min":10,"rep_max":10},
     {"exercise_id":"db_lateral_raise","sets":3,"rep_min":12,"rep_max":15},
     {"exercise_id":"triceps_pushdown","sets":2,"rep_min":12,"rep_max":12},
     {"exercise_id":"biceps_curl","sets":2,"rep_min":12,"rep_max":12}]'::jsonb,2),
  (_uid,'Helkropp','Styrka från topp till tå','strength',5,'5 min uppvärmning','45–55 min',
   '[{"exercise_id":"goblet_squat","sets":3,"rep_min":10,"rep_max":10,"alt":"leg_press"},
     {"exercise_id":"glute_bridge","sets":3,"rep_min":12,"rep_max":12},
     {"exercise_id":"chest_supported_row","sets":3,"rep_min":10,"rep_max":10},
     {"exercise_id":"machine_chest_press","sets":3,"rep_min":10,"rep_max":10},
     {"exercise_id":"cable_kickback","sets":3,"rep_min":12,"rep_max":12,"per_side":true},
     {"exercise_id":"pallof_press","sets":3,"rep_min":12,"rep_max":12,"per_side":true}]'::jsonb,3),
  (_uid,'Run Club','Lugn löpning','run',0,'5 min rask promenad','25–40 min','[]'::jsonb,4),
  (_uid,'Express','20-minuterspass','express',NULL,'2 min uppvärmning','20 min',
   '[{"exercise_id":"goblet_squat","sets":2,"rep_min":10,"rep_max":12},
     {"exercise_id":"db_chest_press","sets":2,"rep_min":10,"rep_max":12},
     {"exercise_id":"romanian_deadlift","sets":2,"rep_min":10,"rep_max":12},
     {"exercise_id":"seated_cable_row","sets":2,"rep_min":10,"rep_max":12},
     {"exercise_id":"glute_bridge","sets":2,"rep_min":12,"rep_max":15}]'::jsonb,5);
END; $$;
REVOKE EXECUTE ON FUNCTION public.seed_default_program(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  PERFORM public.seed_default_program(NEW.id);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User-callable reset of own program
CREATE OR REPLACE FUNCTION public.reset_my_program()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM public.workout_templates WHERE user_id = auth.uid();
  PERFORM public.seed_default_program(auth.uid());
END; $$;
REVOKE EXECUTE ON FUNCTION public.reset_my_program() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reset_my_program() TO authenticated;

-- Delete all own data
CREATE OR REPLACE FUNCTION public.delete_my_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid();
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM public.milestones WHERE user_id=_u;
  DELETE FROM public.personal_records WHERE user_id=_u;
  DELETE FROM public.exercise_sets WHERE user_id=_u;
  DELETE FROM public.workout_sessions WHERE user_id=_u;
  DELETE FROM public.running_sessions WHERE user_id=_u;
  DELETE FROM public.scheduled_sessions WHERE user_id=_u;
  DELETE FROM public.workout_templates WHERE user_id=_u;
  DELETE FROM auth.users WHERE id=_u;
END; $$;
REVOKE EXECUTE ON FUNCTION public.delete_my_data() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_data() TO authenticated;

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'race',
  title text NOT NULL DEFAULT '',
  target_date date,
  distance_km numeric,
  target_time_seconds integer,
  exercise_id text,
  target_value numeric,
  start_value numeric,
  notes text NOT NULL DEFAULT '',
  achieved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.delete_my_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid();
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM public.goals WHERE user_id=_u;
  DELETE FROM public.milestones WHERE user_id=_u;
  DELETE FROM public.personal_records WHERE user_id=_u;
  DELETE FROM public.exercise_sets WHERE user_id=_u;
  DELETE FROM public.workout_sessions WHERE user_id=_u;
  DELETE FROM public.running_sessions WHERE user_id=_u;
  DELETE FROM public.scheduled_sessions WHERE user_id=_u;
  DELETE FROM public.workout_templates WHERE user_id=_u;
  DELETE FROM auth.users WHERE id=_u;
END; $$;
REVOKE EXECUTE ON FUNCTION public.delete_my_data() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_data() TO authenticated;

-- Complete exercise library (53 exercises incl. home/bodyweight)
INSERT INTO public.exercises (id,name,muscles,equipment,instructions,mistakes,alternatives,media_url) VALUES
('biceps_curl','Bicepscurl',ARRAY['Biceps']::text[],ARRAY['Hantlar']::text[],'Stå upprätt med armbågarna nära kroppen. Böj armarna och sänk långsamt.',ARRAY['Svingar med ryggen','Armbågarna åker framåt']::text[],ARRAY['seated_cable_row']::text[],NULL),
('bulgarian_split_squat','Bulgarisk utfallsböj',ARRAY['Framsida lår','Säte']::text[],ARRAY['Hantlar','Bänk']::text[],'Bakre foten på bänken. Sänk rakt ner tills främre låret är parallellt med golvet. Pressa upp genom främre hälen.',ARRAY['Främre knäet faller inåt','För kort steg','Lutar för mycket framåt']::text[],ARRAY['goblet_squat','leg_press']::text[],NULL),
('bw_bird_dog','Bird dog',ARRAY['Bål','Säte']::text[],ARRAY['Kroppsvikt']::text[],'På alla fyra, sträck motsatt arm och ben, håll bäckenet stilla.',ARRAY['Roterar höften']::text[],ARRAY['bw_dead_bug']::text[],NULL),
('bw_bulgarian','Bulgarisk split squat på stol',ARRAY['Framsida lår','Säte']::text[],ARRAY['Kroppsvikt','Stol']::text[],'Bakre foten på en stol eller soffa, sänk kontrollerat och tryck upp.',ARRAY['För nära stolen','Stressar tempot']::text[],ARRAY['bulgarian_split_squat','bw_split_squat']::text[],NULL),
('bw_calf_raise','Tåhävningar',ARRAY['Vader']::text[],ARRAY['Kroppsvikt']::text[],'Res dig på tå långsamt, pausa och sänk kontrollerat.',ARRAY['Studsar']::text[],'{}'::text[],NULL),
('bw_chair_dip','Dips mot stol',ARRAY['Triceps']::text[],ARRAY['Kroppsvikt','Stol']::text[],'Händer på stolskanten, sänk dig med armbågarna bakåt, tryck upp.',ARRAY['Axlarna kryper upp']::text[],ARRAY['triceps_pushdown']::text[],NULL),
('bw_couch_hip_thrust','Hip thrust mot soffa',ARRAY['Säte']::text[],ARRAY['Kroppsvikt','Soffa']::text[],'Övre ryggen mot soffkanten, pressa höften upp till rak linje och pausa i toppen.',ARRAY['Hakan upp','Halvt rörelseomfång']::text[],ARRAY['hip_thrust','bw_glute_bridge']::text[],NULL),
('bw_dead_bug','Dead bug',ARRAY['Bål']::text[],ARRAY['Kroppsvikt']::text[],'Ligg på rygg med armar och ben upp, sträck motsatt arm och ben med ländryggen i golvet.',ARRAY['Ländryggen lyfter']::text[],ARRAY['bw_plank','pallof_press']::text[],NULL),
('bw_donkey_kick','Donkey kicks',ARRAY['Säte']::text[],ARRAY['Kroppsvikt']::text[],'På alla fyra, sparka en böjd fot upp mot taket utan att svanka.',ARRAY['Svankar','Snabbt och slarvigt']::text[],ARRAY['cable_kickback','bw_fire_hydrant']::text[],NULL),
('bw_fire_hydrant','Fire hydrants',ARRAY['Sätesmuskel (sida)']::text[],ARRAY['Kroppsvikt']::text[],'På alla fyra, lyft böjt ben ut åt sidan med stilla bål.',ARRAY['Lutar hela kroppen']::text[],ARRAY['hip_abduction','bw_side_lying_abduction']::text[],NULL),
('bw_glute_bridge','Höftlyft på golvet',ARRAY['Säte','Baksida lår']::text[],ARRAY['Kroppsvikt']::text[],'Ligg på rygg, fötter nära rumpan, pressa höften upp och kläm sätet i toppen.',ARRAY['Svankar istället för att spänna sätet']::text[],ARRAY['glute_bridge','bw_single_glute_bridge']::text[],NULL),
('bw_good_morning','Good morning med kroppsvikt',ARRAY['Baksida lår','Säte']::text[],ARRAY['Kroppsvikt']::text[],'Händer bakom huvudet, fäll i höften med rak rygg och mjuka knän.',ARRAY['Rundar ryggen']::text[],ARRAY['romanian_deadlift','bw_single_leg_rdl']::text[],NULL),
('bw_incline_pushup','Armhävningar mot bänk/stol',ARRAY['Bröst','Triceps']::text[],ARRAY['Kroppsvikt','Stol']::text[],'Händer på en stabil upphöjning, sänk bröstet kontrollerat.',ARRAY['Instabil stol']::text[],ARRAY['bw_knee_pushup','bw_pushup']::text[],NULL),
('bw_jump_squat','Hoppknäböj',ARRAY['Framsida lår','Säte','Kondition']::text[],ARRAY['Kroppsvikt']::text[],'Knäböj och hoppa explosivt upp, landa mjukt.',ARRAY['Hård landning']::text[],ARRAY['bw_squat']::text[],NULL),
('bw_knee_pushup','Armhävningar på knä',ARRAY['Bröst','Triceps']::text[],ARRAY['Kroppsvikt']::text[],'Som armhävning men med knäna i golvet. Rak linje från knä till huvud.',ARRAY['Rumpan i luften']::text[],ARRAY['bw_pushup','bw_incline_pushup']::text[],NULL),
('bw_lunge','Utfallssteg',ARRAY['Framsida lår','Säte']::text[],ARRAY['Kroppsvikt']::text[],'Ta ett långt steg fram, sänk bakre knät mot golvet, tryck tillbaka via främre hälen.',ARRAY['För kort steg','Överkroppen faller framåt']::text[],ARRAY['bw_split_squat','bulgarian_split_squat']::text[],NULL),
('bw_mountain_climber','Mountain climbers',ARRAY['Bål','Kondition']::text[],ARRAY['Kroppsvikt']::text[],'Plankposition, dra knäna växelvis mot bröstet i jämnt tempo.',ARRAY['Rumpan högt']::text[],ARRAY['bw_plank']::text[],NULL),
('bw_pike_pushup','Pike push-ups',ARRAY['Axlar','Triceps']::text[],ARRAY['Kroppsvikt']::text[],'Höften högt i ett omvänt V, sänk huvudet mot golvet mellan händerna.',ARRAY['För platt position']::text[],ARRAY['db_shoulder_press']::text[],NULL),
('bw_plank','Planka',ARRAY['Bål']::text[],ARRAY['Kroppsvikt']::text[],'Underarmar i golvet, kroppen rak, spänn mage och säte.',ARRAY['Höften sjunker','Håller andan']::text[],ARRAY['bw_side_plank','pallof_press']::text[],NULL),
('bw_pushup','Armhävningar',ARRAY['Bröst','Triceps','Axlar']::text[],ARRAY['Kroppsvikt']::text[],'Händer under axlarna, kroppen rak som en planka, sänk bröstet mot golvet.',ARRAY['Höften sjunker','Armbågarna rakt ut']::text[],ARRAY['bw_knee_pushup','bw_incline_pushup']::text[],NULL),
('bw_reverse_lunge','Bakåtutfall',ARRAY['Säte','Framsida lår']::text[],ARRAY['Kroppsvikt']::text[],'Kliv bakåt, sänk kontrollerat och tryck upp via främre benet. Skonsamt för knäna.',ARRAY['Tappar balansen','Svankar']::text[],ARRAY['bw_lunge','bw_split_squat']::text[],NULL),
('bw_side_lying_abduction','Sidliggande benlyft',ARRAY['Sätesmuskel (sida)']::text[],ARRAY['Kroppsvikt']::text[],'Ligg på sidan, lyft översta benet med tån lätt nedåt.',ARRAY['Rullar bakåt']::text[],ARRAY['hip_abduction','bw_fire_hydrant']::text[],NULL),
('bw_side_plank','Sidoplanka',ARRAY['Bål','Sneda magmuskler']::text[],ARRAY['Kroppsvikt']::text[],'Ligg på sidan på underarmen, lyft höften till rak linje.',ARRAY['Höften sjunker']::text[],ARRAY['bw_plank']::text[],NULL),
('bw_single_glute_bridge','Enbens höftlyft',ARRAY['Säte','Baksida lår']::text[],ARRAY['Kroppsvikt']::text[],'Som höftlyft men med ett ben i luften. Håll bäckenet plant.',ARRAY['Bäckenet tippar']::text[],ARRAY['bw_glute_bridge','bw_couch_hip_thrust']::text[],NULL),
('bw_single_leg_rdl','Enbens rumänsk marklyft',ARRAY['Baksida lår','Säte']::text[],ARRAY['Kroppsvikt']::text[],'Stå på ett ben, fäll i höften och sträck bakre benet, håll höften rak.',ARRAY['Höften roterar upp']::text[],ARRAY['romanian_deadlift','bw_good_morning']::text[],NULL),
('bw_split_squat','Split squat',ARRAY['Framsida lår','Säte']::text[],ARRAY['Kroppsvikt']::text[],'Stå i delad position, sänk rakt ner och upp utan att flytta fötterna.',ARRAY['Främre knät kollapsar inåt']::text[],ARRAY['bulgarian_split_squat','bw_lunge']::text[],NULL),
('bw_squat','Knäböj med kroppsvikt',ARRAY['Framsida lår','Säte']::text[],ARRAY['Kroppsvikt']::text[],'Fötter axelbrett, sätt dig bakåt och ner med rak rygg, tryck upp genom hela foten.',ARRAY['Hälarna lyfter','Knäna faller inåt']::text[],ARRAY['goblet_squat','bw_split_squat']::text[],NULL),
('bw_superman','Superman',ARRAY['Ländrygg','Övre rygg']::text[],ARRAY['Kroppsvikt']::text[],'Ligg på mage, lyft armar och ben samtidigt och pausa.',ARRAY['Kastar huvudet bakåt']::text[],ARRAY['bw_table_row']::text[],NULL),
('bw_table_row','Rodd under bord',ARRAY['Rygg','Biceps']::text[],ARRAY['Kroppsvikt','Bord']::text[],'Ligg under ett stadigt bord, greppa kanten och dra bröstet upp med rak kropp.',ARRAY['Höften sjunker']::text[],ARRAY['seated_cable_row','bw_superman']::text[],NULL),
('bw_wall_sit','Väggsittning',ARRAY['Framsida lår']::text[],ARRAY['Kroppsvikt']::text[],'Rygg mot väggen, knän i 90 grader, håll positionen.',ARRAY['Knän framför tårna']::text[],ARRAY['bw_squat']::text[],NULL),
('cable_kickback','Kabel-kickback',ARRAY['Säte']::text[],ARRAY['Kabelmaskin','Fotlänk']::text[],'Fäst fotlänken, luta dig lätt framåt och för benet bakåt med rak höft. Knip i toppen.',ARRAY['Svankar','Svingar benet']::text[],ARRAY['hip_thrust','glute_bridge']::text[],NULL),
('cable_pull_through','Cable pull-through',ARRAY['Säte','Baksida lår']::text[],ARRAY['Kabel']::text[],'Rep mellan benen, fäll i höften och driv höften framåt.',ARRAY['Drar med armarna']::text[],ARRAY['hip_thrust']::text[],NULL),
('chest_supported_row','Bröststödd rodd',ARRAY['Mellanrygg','Lats']::text[],ARRAY['Hantlar','Lutande bänk']::text[],'Ligg med bröstet mot en lutande bänk. Ro hantlarna mot höfterna och för ihop skulderbladen.',ARRAY['Lyfter bröstet från bänken','Drar med nacken']::text[],ARRAY['seated_cable_row']::text[],NULL),
('db_chest_press','Hantelpress',ARRAY['Bröst','Triceps','Främre axlar']::text[],ARRAY['Hantlar','Bänk']::text[],'Ligg på bänken med fötterna i golvet. Sänk hantlarna till bröstets sidor med armbågarna i ca 45°, pressa upp.',ARRAY['Armbågarna rakt ut','Studsar i botten','Svankar kraftigt']::text[],ARRAY['machine_chest_press']::text[],NULL),
('db_lateral_raise','Sidolyft',ARRAY['Sidoaxlar']::text[],ARRAY['Hantlar']::text[],'Lätt böjda armbågar. Lyft hantlarna ut åt sidorna till axelhöjd och sänk långsamt.',ARRAY['Rycker med kroppen','Lyfter axlarna mot öronen','För tung vikt']::text[],ARRAY['db_shoulder_press']::text[],NULL),
('db_shoulder_press','Hantelpress axlar',ARRAY['Axlar','Triceps']::text[],ARRAY['Hantlar','Bänk']::text[],'Sitt upprätt med stöd för ryggen. Pressa hantlarna upp ovanför huvudet och sänk till öronhöjd.',ARRAY['Svankar','Hantlarna för långt fram']::text[],ARRAY['db_lateral_raise']::text[],NULL),
('face_pull','Face pulls',ARRAY['Bakre axlar','Övre rygg']::text[],ARRAY['Kabel']::text[],'Rep i ansiktshöjd, dra mot ansiktet med armbågarna högt.',ARRAY['För tung vikt']::text[],ARRAY['db_lateral_raise']::text[],NULL),
('glute_bridge','Glute bridge',ARRAY['Säte','Baksida lår']::text[],ARRAY['Kroppsvikt','Hantel']::text[],'Ligg på rygg med fötterna i golvet. Pressa upp höften, knip sätet i toppen och sänk kontrollerat.',ARRAY['Svankar','Pressar med tårna']::text[],ARRAY['hip_thrust']::text[],NULL),
('goblet_squat','Goblet squat',ARRAY['Framsida lår','Säte']::text[],ARRAY['Hantel','Kettlebell']::text[],'Håll vikten mot bröstet. Sätt dig ner med upprätt överkropp och armbågarna mellan knäna. Pressa upp.',ARRAY['Hälarna lyfter','Rundar ryggen']::text[],ARRAY['leg_press','squat']::text[],NULL),
('hammer_curl','Hammarcurl',ARRAY['Biceps','Underarmar']::text[],ARRAY['Hantlar']::text[],'Neutralt grepp, böj armbågen utan att svinga.',ARRAY['Svingar']::text[],ARRAY['biceps_curl']::text[],NULL),
('hip_abduction','Höftabduktion',ARRAY['Säte (gluteus medius)']::text[],ARRAY['Maskin']::text[],'Sitt upprätt, pressa knäna utåt mot dynorna, håll en sekund och återgå långsamt.',ARRAY['Gungar med överkroppen','Släpper vikten snabbt']::text[],ARRAY['cable_kickback']::text[],NULL),
('hip_thrust','Hip thrust',ARRAY['Säte','Baksida lår']::text[],ARRAY['Skivstång','Bänk']::text[],'Vila övre ryggen mot bänken, fötterna höftbrett. Pressa genom hälarna och lyft höften tills kroppen är rak från axlar till knän. Knip ihop sätet i toppen och sänk kontrollerat.',ARRAY['Överextenderar ländryggen i toppen','Fötterna för långt fram','Hakan pekar uppåt']::text[],ARRAY['glute_bridge','cable_kickback']::text[],NULL),
('lat_pulldown','Latsdrag',ARRAY['Rygg (lats)','Biceps']::text[],ARRAY['Kabelmaskin']::text[],'Grip något bredare än axlarna. Dra stången mot övre bröstet med armbågarna nedåt och bakåt. Släpp upp kontrollerat.',ARRAY['Lutar sig långt bakåt','Drar bakom nacken','Rycker i vikten']::text[],ARRAY['chest_supported_row','seated_cable_row']::text[],NULL),
('leg_curl','Lårcurl',ARRAY['Baksida lår']::text[],ARRAY['Maskin']::text[],'Justera maskinen så knäleden ligger i linje med vridpunkten. Böj benen kontrollerat och sänk långsamt.',ARRAY['Höften lyfter','För snabb excentrisk fas']::text[],ARRAY['romanian_deadlift']::text[],NULL),
('leg_press','Benpress',ARRAY['Framsida lår','Säte']::text[],ARRAY['Maskin']::text[],'Fötterna höftbrett mitt på plattan. Sänk tills knäna är ca 90° utan att ländryggen lyfter. Pressa tillbaka utan att låsa knäna.',ARRAY['Låser knäna','Ländryggen lämnar dynan','För kort rörelse']::text[],ARRAY['squat','goblet_squat']::text[],NULL),
('machine_chest_press','Bröstpress maskin',ARRAY['Bröst','Triceps']::text[],ARRAY['Maskin']::text[],'Justera sitsen så handtagen är i brösthöjd. Pressa framåt utan att låsa armbågarna, återgå kontrollerat.',ARRAY['Axlarna rullar framåt','För snabb återgång']::text[],ARRAY['db_chest_press']::text[],NULL),
('pallof_press','Pallof press',ARRAY['Bål','Sneda magmuskler']::text[],ARRAY['Kabelmaskin','Gummiband']::text[],'Stå i sidled mot kabeln. Pressa handtaget rakt fram och motstå rotation. Återgå kontrollerat.',ARRAY['Roterar med kroppen','Står för nära']::text[],'{}'::text[],NULL),
('rdl_db','Rumänsk marklyft med hantlar',ARRAY['Baksida lår','Säte']::text[],ARRAY['Hantlar']::text[],'Hantlar längs låren, fäll i höften med rak rygg tills du känner baksida lår.',ARRAY['Rundad rygg']::text[],ARRAY['romanian_deadlift','bw_single_leg_rdl']::text[],NULL),
('romanian_deadlift','Rumänsk marklyft',ARRAY['Baksida lår','Säte','Ländrygg']::text[],ARRAY['Skivstång','Hantlar']::text[],'Lätt böjda knän. Skjut höften bakåt och låt vikten glida längs benen tills du känner sträck i baksida lår. Res dig genom att föra höften framåt.',ARRAY['Rundar ryggen','Böjer knäna för mycket','Vikten långt från kroppen']::text[],ARRAY['leg_curl','glute_bridge']::text[],NULL),
('seated_cable_row','Sittande kabelrodd',ARRAY['Mellanrygg','Lats','Biceps']::text[],ARRAY['Kabelmaskin']::text[],'Sitt med lätt böjda knän och rak rygg. Dra handtaget mot magen och för ihop skulderbladen. Sträck armarna kontrollerat.',ARRAY['Gungar med överkroppen','Höjer axlarna']::text[],ARRAY['chest_supported_row','lat_pulldown']::text[],NULL),
('squat','Knäböj',ARRAY['Framsida lår','Säte']::text[],ARRAY['Skivstång','Rack']::text[],'Stången på övre ryggen, fötter axelbrett. Andas in, spänn bålen och sätt dig ner mellan hälarna. Pressa upp med hela foten.',ARRAY['Knäna faller inåt','Hälarna lyfter','Rundad rygg i botten']::text[],ARRAY['leg_press','goblet_squat']::text[],NULL),
('step_up','Step-ups',ARRAY['Säte','Framsida lår']::text[],ARRAY['Kroppsvikt','Låda']::text[],'Kliv upp på en låda/trappsteg, tryck genom hälen.',ARRAY['Skjuter ifrån med bakre foten']::text[],ARRAY['bulgarian_split_squat','bw_reverse_lunge']::text[],NULL),
('triceps_pushdown','Triceps pushdown',ARRAY['Triceps']::text[],ARRAY['Kabelmaskin']::text[],'Armbågarna fixerade vid sidan. Pressa ner handtaget tills armarna är raka, återgå kontrollerat.',ARRAY['Armbågarna åker framåt','Lutar sig över vikten']::text[],ARRAY['db_chest_press']::text[],NULL)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, muscles=EXCLUDED.muscles, equipment=EXCLUDED.equipment, instructions=EXCLUDED.instructions, mistakes=EXCLUDED.mistakes, alternatives=EXCLUDED.alternatives, media_url=EXCLUDED.media_url;
